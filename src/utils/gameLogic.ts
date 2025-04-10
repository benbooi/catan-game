import { GameState } from '../types/gameState';
import { ResourceType, Player } from '../types/game';
import { BUILD_COSTS } from '../constants/gameConstants';

// Calculate victory points for a player
export const calculateVictoryPoints = (player: Player, state: GameState): number => {
  let points = 0;
  const { board } = state;
  
  // Get all settlements and cities by this player
  const settlements = board.vertices.filter(v => 
    v.building?.playerId === player.id && v.building.type === 'settlement'
  ).length;
  
  const cities = board.vertices.filter(v => 
    v.building?.playerId === player.id && v.building.type === 'city'
  ).length;
  
  // Count settlements (1 point each)
  points += settlements;
  
  // Count cities (2 points each)
  points += cities * 2;
  
  // Add longest road bonus (2 points)
  if (player.hasLongestRoad) {
    points += 2;
  }
  
  // Add largest army bonus (2 points)
  if (player.hasLargestArmy) {
    points += 2;
  }
  
  // Add victory point cards
  const victoryPointCards = player.developmentCards.filter(
    card => card.type === 'victoryPoint'
  ).length;
  
  points += victoryPointCards;
  
  return points;
};

// Calculate resources gained from a dice roll
export const calculateResourcesFromRoll = (
  state: GameState, 
  diceRoll: number
): Record<string, Record<ResourceType, number>> => {
  const { board, players } = state;
  const { hexes, vertices } = board;
  
  // Initialize resource gains for each player
  const resourceGains: Record<string, Record<ResourceType, number>> = {};
  
  // Initialize with empty resource counts for each player
  players.forEach(player => {
    resourceGains[player.id] = {
      wood: 0,
      brick: 0,
      grain: 0,
      ore: 0,
      wool: 0
    };
  });
  
  // Skip if 7 is rolled (robber)
  if (diceRoll === 7) {
    return resourceGains;
  }
  
  // Find all hexes with the matching number
  const matchingHexes = hexes.filter(hex => hex.number === diceRoll && !hex.hasRobber);
  
  // For each matching hex
  matchingHexes.forEach(hex => {
    // Find all vertices adjacent to this hex
    const adjacentVertices = vertices.filter(v => 
      v.adjacentHexes.includes(hex.id) && v.building
    );
    
    // For each vertex with a building
    adjacentVertices.forEach(vertex => {
      if (!vertex.building) return;
      
      const playerId = vertex.building.playerId;
      const resourceType = hex.type as ResourceType;
      
      // Settlements get 1 resource, cities get 2
      const resourceCount = vertex.building.type === 'settlement' ? 1 : 2;
      
      // Add to the player's resource count
      resourceGains[playerId][resourceType] += resourceCount;
    });
  });
  
  return resourceGains;
};

// Check if a player has enough resources for a purchase
export const hasEnoughResources = (
  player: Player, 
  purchase: 'road' | 'settlement' | 'city' | 'developmentCard'
): boolean => {
  const costs = BUILD_COSTS[purchase];
  
  for (const [resource, amount] of Object.entries(costs)) {
    if ((player.resources[resource as ResourceType] || 0) < (amount || 0)) {
      return false;
    }
  }
  
  return true;
};

// Deduct resources for a purchase
export const deductResourcesForPurchase = (
  player: Player,
  purchase: 'road' | 'settlement' | 'city' | 'developmentCard'
): Record<ResourceType, number> => {
  const costs = BUILD_COSTS[purchase];
  const newResources = { ...player.resources };
  
  for (const [resource, amount] of Object.entries(costs)) {
    newResources[resource as ResourceType] -= (amount || 0);
  }
  
  return newResources;
};

// Calculate the longest road length for a player
export const calculateLongestRoad = (state: GameState, playerId: string): number => {
  const { board } = state;
  const { edges, vertices } = board;
  
  // Get all roads owned by the player
  const playerRoads = edges.filter(edge => edge.road?.playerId === playerId);
  
  if (playerRoads.length < 5) {
    return 0; // Must have at least 5 roads to qualify
  }
  
  // Create an adjacency list of connected roads
  const roadGraph: Record<number, number[]> = {};
  
  // Initialize empty arrays for each vertex
  vertices.forEach(vertex => {
    roadGraph[vertex.id] = [];
  });
  
  // Fill the graph with connections
  playerRoads.forEach(road => {
    const [v1, v2] = road.vertices;
    roadGraph[v1].push(v2);
    roadGraph[v2].push(v1);
  });
  
  // Find the longest path in the graph using DFS
  let maxLength = 0;
  
  // For each vertex that has a road
  Object.keys(roadGraph).forEach(vertexId => {
    if (roadGraph[Number(vertexId)].length > 0) {
      // Start DFS from this vertex
      const visited = new Set<number>();
      const dfs = (current: number, length: number) => {
        // Update max length
        maxLength = Math.max(maxLength, length);
        
        // Visit neighbors
        for (const neighbor of roadGraph[current]) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            dfs(neighbor, length + 1);
            visited.delete(neighbor); // Backtrack
          }
        }
      };
      
      visited.add(Number(vertexId));
      dfs(Number(vertexId), 0);
    }
  });
  
  return maxLength;
};

// Calculate which player has the largest army
export const calculateLargestArmy = (state: GameState): { playerId: string | null; size: number } => {
  const { players } = state;
  
  let largestArmy = {
    playerId: null as string | null,
    size: 2  // Minimum 3 knights to qualify, so start at 2
  };
  
  players.forEach(player => {
    if (player.knightsPlayed > largestArmy.size) {
      largestArmy = {
        playerId: player.id,
        size: player.knightsPlayed
      };
    }
  });
  
  return largestArmy;
};

// Check if a settlement/city can be built at a vertex
export const canBuildSettlement = (state: GameState, vertexId: number, playerId: string): boolean => {
  const { board, phase } = state;
  const { vertices, edges } = board;
  
  // Get the vertex
  const vertex = vertices.find(v => v.id === vertexId);
  if (!vertex) return false;
  
  // Check if vertex is already occupied
  if (vertex.building) return false;
  
  // Check if there's a building on any adjacent vertex (distance rule)
  const hasAdjacentBuilding = vertex.adjacentVertices.some(adjId => {
    const adjVertex = vertices.find(v => v.id === adjId);
    return adjVertex?.building !== undefined;
  });
  
  if (hasAdjacentBuilding) return false;
  
  // During setup phase, no connection requirement
  if (phase === 'SETUP') return true;
  
  // In normal phase, settlement must be connected to a road
  const playerRoads = edges.filter(e => e.road?.playerId === playerId);
  
  return playerRoads.some(road => road.vertices.includes(vertexId));
};

// Check if a city can be built at a vertex
export const canBuildCity = (state: GameState, vertexId: number, playerId: string): boolean => {
  const { board } = state;
  const { vertices } = board;
  
  // Get the vertex
  const vertex = vertices.find(v => v.id === vertexId);
  if (!vertex) return false;
  
  // Must have a settlement owned by this player
  return vertex.building?.playerId === playerId && vertex.building.type === 'settlement';
};

// Check if a road can be built on an edge
export const canBuildRoad = (state: GameState, edgeId: number, playerId: string): boolean => {
  const { board, phase } = state;
  const { edges, vertices } = board;
  
  // Get the edge
  const edge = edges.find(e => e.id === edgeId);
  if (!edge) return false;
  
  // Check if edge is already occupied
  if (edge.road) return false;
  
  // During setup phase, road must be adjacent to the last placed settlement
  if (phase === 'SETUP' && state.setupPhase) {
    const lastSettlementId = state.setupPhase.settlementVertexId;
    return edge.vertices.includes(lastSettlementId || -1);
  }
  
  // In normal phase, road must be connected to another road or settlement/city
  const [v1, v2] = edge.vertices;
  
  // Check if connected to a settlement/city
  const hasConnectedBuilding = vertices.some(v => 
    (v.id === v1 || v.id === v2) && 
    v.building?.playerId === playerId
  );
  
  if (hasConnectedBuilding) return true;
  
  // Check if connected to another road
  const hasConnectedRoad = edges.some(e => 
    e.road?.playerId === playerId && 
    (e.vertices.includes(v1) || e.vertices.includes(v2))
  );
  
  return hasConnectedRoad;
};

// Get the trade ratio for a player based on ports
export const getTradeRatio = (state: GameState, playerId: string, resource: ResourceType): number => {
  const { board } = state;
  const { ports, vertices } = board;
  
  // Default ratio is 4:1
  let ratio = 4;
  
  // Get all settlements/cities owned by this player
  const playerBuildings = vertices.filter(v => v.building?.playerId === playerId);
  
  // Check if player has a settlement/city on a port
  ports.forEach(port => {
    // Check if any of the port's vertices has a player building
    const hasPortAccess = port.vertices.some(vId => 
      playerBuildings.some(b => b.id === vId)
    );
    
    if (hasPortAccess) {
      if (port.type === 'any') {
        // 3:1 port
        ratio = Math.min(ratio, 3);
      } else if (port.type === resource) {
        // 2:1 port for specific resource
        ratio = 2;
      }
    }
  });
  
  return ratio;
};

// Prepare an array of development cards
export const createDevelopmentCards = (): Player['developmentCards'] => {
  const cards: Player['developmentCards'] = [];
  
  // Add 14 knight cards
  for (let i = 0; i < 14; i++) {
    cards.push({ type: 'knight', used: false, turnPurchased: 0 });
  }
  
  // Add 5 victory point cards
  for (let i = 0; i < 5; i++) {
    cards.push({ type: 'victoryPoint', used: false, turnPurchased: 0 });
  }
  
  // Add 2 road building cards
  for (let i = 0; i < 2; i++) {
    cards.push({ type: 'roadBuilding', used: false, turnPurchased: 0 });
  }
  
  // Add 2 year of plenty cards
  for (let i = 0; i < 2; i++) {
    cards.push({ type: 'yearOfPlenty', used: false, turnPurchased: 0 });
  }
  
  // Add 2 monopoly cards
  for (let i = 0; i < 2; i++) {
    cards.push({ type: 'monopoly', used: false, turnPurchased: 0 });
  }
  
  // Shuffle the cards
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  
  return cards;
}; 