import { GameState, GameAction } from '../types/gameState';
import { ResourceType, BuildingType } from '../types/game';
import { BUILD_COSTS } from '../constants/gameConstants';

// AI difficulty levels
export enum AIDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard'
}

// AI Strategy weights - these determine how the AI prioritizes different actions
interface AIStrategyWeights {
  settlement: number;  // Weight for building settlements
  city: number;        // Weight for building cities
  road: number;        // Weight for building roads
  devCard: number;     // Weight for buying development cards
  longestRoad: number; // Weight for pursuing longest road
  largestArmy: number; // Weight for pursuing largest army
}

const STRATEGY_WEIGHTS: Record<AIDifficulty, AIStrategyWeights> = {
  [AIDifficulty.EASY]: {
    settlement: 1.0,
    city: 0.7,
    road: 0.6,
    devCard: 0.3,
    longestRoad: 0.4,
    largestArmy: 0.3
  },
  [AIDifficulty.MEDIUM]: {
    settlement: 1.0,
    city: 0.9,
    road: 0.8,
    devCard: 0.6,
    longestRoad: 0.7,
    largestArmy: 0.6
  },
  [AIDifficulty.HARD]: {
    settlement: 1.0,
    city: 1.0,
    road: 0.9,
    devCard: 0.8,
    longestRoad: 0.9,
    largestArmy: 0.9
  }
};

// Helper function to check if player has enough resources for a build action
const hasResourcesFor = (resources: Record<ResourceType, number>, type: 'road' | 'settlement' | 'city' | 'developmentCard'): boolean => {
  const costs = BUILD_COSTS[type];
  return Object.entries(costs).every(([resource, amount]) => 
    resources[resource as ResourceType] >= (amount || 0)
  );
};

// Find valid settlement locations for the AI
const findValidSettlementLocations = (state: GameState, playerId: string): number[] => {
  const { board, phase } = state;
  const { vertices, edges } = board;
  
  // Get all road locations owned by this player
  const playerRoads = edges.filter(e => e.road?.playerId === playerId);
  
  // If we're in setup phase, all unoccupied vertices are valid
  if (phase === 'SETUP') {
    return vertices
      .filter(v => !v.building) // Unoccupied vertices only
      .filter(v => {
        // Check if no adjacent vertices have buildings (distance rule)
        return !v.adjacentVertices.some(avId => {
          const adjacentVertex = vertices.find(vertex => vertex.id === avId);
          return adjacentVertex?.building;
        });
      })
      .map(v => v.id);
  }
  
  // For normal phase, we need to check for connected roads and distance rule
  return vertices
    .filter(v => !v.building) // Unoccupied vertices only
    .filter(v => {
      // Check if no adjacent vertices have buildings (distance rule)
      const hasAdjacentBuilding = v.adjacentVertices.some(avId => {
        const adjacentVertex = vertices.find(vertex => vertex.id === avId);
        return adjacentVertex?.building;
      });
      
      if (hasAdjacentBuilding) return false;
      
      // Check if there's a connected road owned by this player
      return playerRoads.some(road => 
        road.vertices.includes(v.id)
      );
    })
    .map(v => v.id);
};

// Find valid city upgrade locations for the AI
const findValidCityLocations = (state: GameState, playerId: string): number[] => {
  const { board } = state;
  
  return board.vertices
    .filter(v => 
      v.building && 
      v.building.playerId === playerId && 
      v.building.type === 'settlement'
    )
    .map(v => v.id);
};

// Find valid road locations for the AI
const findValidRoadLocations = (state: GameState, playerId: string): number[] => {
  const { board, phase } = state;
  const { edges, vertices } = board;
  
  // Get all existing roads by this player
  const playerRoads = edges.filter(e => e.road?.playerId === playerId);
  
  // Get all settlements/cities by this player
  const playerBuildings = vertices.filter(v => v.building?.playerId === playerId);
  
  // If we're in setup phase, only edges connected to the last settlement are valid
  if (phase === 'SETUP' && state.setupPhase && state.setupPhase.settlementVertexId !== undefined) {
    const settlementId = state.setupPhase.settlementVertexId;
    
    return edges
      .filter(e => !e.road) // Unoccupied edges only
      .filter(e => e.vertices.includes(settlementId))
      .map(e => e.id);
  }
  
  // For normal phase, edges must connect to player roads or buildings
  return edges
    .filter(e => !e.road) // Unoccupied edges only
    .filter(e => {
      // Check if edge connects to a player building
      const connectsToBuilding = e.vertices.some(vId => 
        playerBuildings.some(building => building.id === vId)
      );
      
      if (connectsToBuilding) return true;
      
      // Check if edge connects to another road owned by this player
      const connectsToRoad = playerRoads.some(road => 
        e.vertices.some(vId => road.vertices.includes(vId))
      );
      
      return connectsToRoad;
    })
    .map(e => e.id);
};

// Score a location for settlement based on resource diversity and numbers
const scoreSettlementLocation = (state: GameState, vertexId: number): number => {
  const { board } = state;
  const { hexes, vertices } = board;
  
  const vertex = vertices.find(v => v.id === vertexId);
  if (!vertex) return 0;
  
  let score = 0;
  const resourceTypes = new Set<string>();
  const numbers = new Set<number>();
  
  // Find all hexes adjacent to this vertex
  vertex.adjacentHexes.forEach(hexId => {
    const hex = hexes.find(h => h.id === hexId);
    if (hex && hex.type !== 'desert') {
      resourceTypes.add(hex.type);
      
      // Score based on number probability (6 and 8 are most valuable)
      if (hex.number) {
        const probability = 6 - Math.abs(7 - hex.number);
        score += probability;
        numbers.add(hex.number);
      }
    }
  });
  
  // Bonus for resource diversity
  score += resourceTypes.size * 2;
  
  // Bonus for number diversity
  score += numbers.size;
  
  return score;
};

// Calculate best settlement location for AI
const getBestSettlementLocation = (state: GameState, playerId: string): number | null => {
  const validLocations = findValidSettlementLocations(state, playerId);
  
  if (validLocations.length === 0) return null;
  
  let bestLocation = validLocations[0];
  let bestScore = scoreSettlementLocation(state, bestLocation);
  
  for (const location of validLocations) {
    const score = scoreSettlementLocation(state, location);
    if (score > bestScore) {
      bestScore = score;
      bestLocation = location;
    }
  }
  
  return bestLocation;
};

// Calculate best city upgrade location for AI
const getBestCityLocation = (state: GameState, playerId: string): number | null => {
  const validLocations = findValidCityLocations(state, playerId);
  
  if (validLocations.length === 0) return null;
  
  // For cities, we prioritize high-value resource hexes
  let bestLocation = validLocations[0];
  let bestScore = scoreSettlementLocation(state, bestLocation); // Reuse the same scoring function
  
  for (const location of validLocations) {
    const score = scoreSettlementLocation(state, location);
    if (score > bestScore) {
      bestScore = score;
      bestLocation = location;
    }
  }
  
  return bestLocation;
};

// Calculate best road location for AI
const getBestRoadLocation = (state: GameState, playerId: string): number | null => {
  const validLocations = findValidRoadLocations(state, playerId);
  
  if (validLocations.length === 0) return null;
  
  // For roads, we prioritize expanding toward good settlement spots
  // This is a simplified approach - a real AI would look ahead multiple roads
  const { board } = state;
  const { edges, vertices } = board;
  
  let bestLocation = validLocations[0];
  let bestScore = 0;
  
  for (const edgeId of validLocations) {
    const edge = edges.find(e => e.id === edgeId);
    if (!edge) continue;
    
    // Look at both ends of the edge
    for (const vertexId of edge.vertices) {
      const vertex = vertices.find(v => v.id === vertexId);
      if (!vertex || vertex.building) continue;
      
      // See if this vertex could be a good settlement spot
      const score = scoreSettlementLocation(state, vertexId);
      if (score > bestScore) {
        bestScore = score;
        bestLocation = edgeId;
      }
    }
  }
  
  return bestLocation;
};

// Find the best hex to move the robber to
const getBestRobberMove = (state: GameState, playerId: string): { hexId: number, targetPlayerId: string | undefined } => {
  const { board, players } = state;
  const { hexes, vertices } = board;
  
  // Don't place robber on desert or current robber location
  const validHexes = hexes.filter(h => !h.hasRobber && h.type !== 'desert');
  
  // Get opponent players
  const opponents = players.filter(p => p.id !== playerId);
  
  // For each hex, score based on:
  // 1. Number of opponent buildings adjacent to it
  // 2. Value of the hex (based on number probability)
  // 3. Total resources of players that can be stolen from
  
  let bestHexId = validHexes[0]?.id ?? 0;
  let bestTargetId: string | undefined = undefined;
  let bestScore = -1;
  
  for (const hex of validHexes) {
    // Find all vertices adjacent to this hex
    const adjacentVertexIds = vertices
      .filter(v => v.adjacentHexes.includes(hex.id))
      .map(v => v.id);
    
    // Find all buildings on these vertices
    const buildings = vertices
      .filter(v => v.building && v.adjacentHexes.includes(hex.id))
      .filter(v => v.building?.playerId !== playerId); // Only opponent buildings
    
    if (buildings.length === 0) continue; // No opponents to steal from
    
    // Calculate the probability value of this hex
    let hexValue = 0;
    if (hex.number) {
      hexValue = 6 - Math.abs(7 - hex.number);
    }
    
    // Find player with most resources to steal from
    let targetPlayerId: string | undefined = undefined;
    let maxResources = 0;
    
    for (const building of buildings) {
      if (!building.building) continue;
      
      const player = players.find(p => p.id === building.building?.playerId);
      if (!player) continue;
      
      const totalResources = Object.values(player.resources).reduce((sum, count) => sum + count, 0);
      if (totalResources > maxResources) {
        maxResources = totalResources;
        targetPlayerId = player.id;
      }
    }
    
    // Score this hex
    const score = buildings.length * 3 + hexValue * 2 + maxResources;
    
    if (score > bestScore) {
      bestScore = score;
      bestHexId = hex.id;
      bestTargetId = targetPlayerId;
    }
  }
  
  return {
    hexId: bestHexId,
    targetPlayerId: bestTargetId
  };
};

// AI turn strategy
export const determineAIAction = (
  state: GameState, 
  playerId: string, 
  difficulty: AIDifficulty = AIDifficulty.MEDIUM
): GameAction | null => {
  const { phase, players } = state;
  const player = players.find(p => p.id === playerId);
  
  if (!player) return null;
  
  const weights = STRATEGY_WEIGHTS[difficulty];
  
  // Handle setup phase differently
  if (phase === 'SETUP') {
    if (state.setupPhase?.settlementsPlaced === state.setupPhase?.roadsPlaced) {
      // Need to place a settlement
      const bestSpot = getBestSettlementLocation(state, playerId);
      if (bestSpot !== null) {
        return { type: 'BUILD_SETTLEMENT', vertexId: bestSpot };
      }
    } else {
      // Need to place a road
      const bestRoadSpot = getBestRoadLocation(state, playerId);
      if (bestRoadSpot !== null) {
        return { type: 'BUILD_ROAD', edgeId: bestRoadSpot };
      }
    }
    return null;
  }
  
  // Handle robber phase
  if (phase === 'ROBBER') {
    const { hexId, targetPlayerId } = getBestRobberMove(state, playerId);
    return { 
      type: 'MOVE_ROBBER', 
      hexId,
      targetPlayerId
    };
  }
  
  // Handle roll phase
  if (phase === 'ROLL') {
    return { type: 'ROLL_DICE' };
  }
  
  // Handle main phase
  if (phase === 'MAIN') {
    // Calculate weighted scores for each possible build action
    const buildOptions = [];
    
    // Settlement
    if (hasResourcesFor(player.resources, 'settlement')) {
      const bestSettlement = getBestSettlementLocation(state, playerId);
      if (bestSettlement !== null) {
        buildOptions.push({
          action: { type: 'BUILD_SETTLEMENT', vertexId: bestSettlement },
          score: weights.settlement * 10
        });
      }
    }
    
    // City
    if (hasResourcesFor(player.resources, 'city')) {
      const bestCity = getBestCityLocation(state, playerId);
      if (bestCity !== null) {
        buildOptions.push({
          action: { type: 'BUILD_CITY', vertexId: bestCity },
          score: weights.city * 12 // Cities are worth more VPs
        });
      }
    }
    
    // Road
    if (hasResourcesFor(player.resources, 'road')) {
      const bestRoad = getBestRoadLocation(state, playerId);
      if (bestRoad !== null) {
        // Check if this road might help with longest road
        const currentLongestRoad = state.longestRoad.length;
        const potentialBonus = currentLongestRoad > 3 ? 2 : 0;
        
        buildOptions.push({
          action: { type: 'BUILD_ROAD', edgeId: bestRoad },
          score: weights.road * (5 + potentialBonus)
        });
      }
    }
    
    // Development Card
    if (hasResourcesFor(player.resources, 'developmentCard')) {
      buildOptions.push({
        action: { type: 'BUY_DEVELOPMENT_CARD' },
        score: weights.devCard * 6
      });
    }
    
    // Play a knight card if we have one
    const knightCard = player.developmentCards.findIndex(
      card => card.type === 'knight' && !card.used && card.turnPurchased < state.turnNumber
    );
    
    if (knightCard !== -1) {
      // Higher priority if we're close to largest army
      const knightsPlayed = player.knightsPlayed;
      const largestArmy = state.largestArmy.size;
      
      // If we're close to getting largest army, prioritize playing knights
      const armyBonus = (knightsPlayed + 1 >= largestArmy && largestArmy > 0) ? 5 : 0;
      
      buildOptions.push({
        action: { type: 'PLAY_DEVELOPMENT_CARD', cardIndex: knightCard },
        score: weights.largestArmy * (4 + armyBonus)
      });
    }
    
    // If we have a road building card, consider using it
    const roadBuildingCard = player.developmentCards.findIndex(
      card => card.type === 'roadBuilding' && !card.used && card.turnPurchased < state.turnNumber
    );
    
    if (roadBuildingCard !== -1) {
      buildOptions.push({
        action: { type: 'PLAY_DEVELOPMENT_CARD', cardIndex: roadBuildingCard },
        score: weights.road * 8 // Free roads are valuable
      });
    }
    
    // Sort options by score and take the highest
    buildOptions.sort((a, b) => b.score - a.score);
    
    if (buildOptions.length > 0) {
      return buildOptions[0].action;
    }
    
    // If we can't build anything, try trading with the bank
    // Find resources we have 4+ of and resources we need
    const excess: ResourceType[] = [];
    const needed: ResourceType[] = [];
    
    // Check which resources we have excess of (4 or more)
    for (const [resource, amount] of Object.entries(player.resources)) {
      if (amount >= 4) {
        excess.push(resource as ResourceType);
      }
    }
    
    // Determine which resources we need the most
    // Prioritize based on what we're close to building
    if (player.resources.brick < 2) needed.push('brick');
    if (player.resources.wood < 2) needed.push('wood');
    if (player.resources.grain < 2) needed.push('grain');
    if (player.resources.wool < 2) needed.push('wool');
    if (player.resources.ore < 2) needed.push('ore');
    
    // If we have excess and need some resource, trade
    if (excess.length > 0 && needed.length > 0) {
      // Prioritize what we need most urgently
      const resourceToGet = needed[0];
      const resourceToGive = excess[0];
      
      return {
        type: 'TRADE_BANK',
        give: resourceToGive,
        receive: resourceToGet
      };
    }
    
    // If nothing else to do, end turn
    return { type: 'END_TURN' };
  }
  
  // Fallback to end turn
  return { type: 'END_TURN' };
};

// Function to handle an AI player's turn
export const executeAITurn = (
  state: GameState, 
  playerId: string, 
  difficulty: AIDifficulty = AIDifficulty.MEDIUM,
  dispatch: (action: GameAction) => void
): void => {
  const action = determineAIAction(state, playerId, difficulty);
  
  if (action) {
    // Add a small delay to make the AI feel more natural
    setTimeout(() => {
      dispatch(action);
    }, 1000);
  }
};

// Check if a player is an AI
export const isAIPlayer = (playerName: string): boolean => {
  return playerName.startsWith('AI: ');
};

// Generate an AI player name based on difficulty
export const generateAIPlayerName = (difficulty: AIDifficulty): string => {
  const names = {
    [AIDifficulty.EASY]: ['Beginner Bot', 'Newbie', 'Rookie'],
    [AIDifficulty.MEDIUM]: ['Trader Bot', 'Settler', 'Builder'],
    [AIDifficulty.HARD]: ['Master Bot', 'Expert', 'Champion']
  };
  
  const nameOptions = names[difficulty];
  const randomName = nameOptions[Math.floor(Math.random() * nameOptions.length)];
  
  return `AI: ${randomName}`;
}; 