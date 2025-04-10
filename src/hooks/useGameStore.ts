import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { GameState, ResourceType, Player, GamePhase, DevelopmentCardType, Hex, Vertex, Edge, Port } from '../types/game';
import { isAIPlayer, generateAIPlayerName, AIDifficulty, executeAITurn, determineAIAction } from '../utils/aiPlayer';

// Constants
const INITIAL_RESOURCES: Record<ResourceType, number> = {
  wood: 0,
  brick: 0,
  grain: 0,
  ore: 0,
  wool: 0
};

const RESOURCE_DISTRIBUTION = {
  wood: 4,
  brick: 3,
  grain: 4,
  ore: 3,
  wool: 4,
  desert: 1
};

const NUMBER_TOKENS = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];

// Helper functions
const createInitialPlayers = (includeAI: boolean = true): Player[] => {
  // Human player is always first (red)
  const players: Player[] = [{
    id: uuidv4(),
    name: 'Player 1',
    color: 'red',
    resources: { ...INITIAL_RESOURCES },
    developmentCards: [],
    score: 0,
    knightsPlayed: 0,
    hasLongestRoad: false,
    hasLargestArmy: false
  }];
  
  // Add AI players with different difficulties
  if (includeAI) {
    const aiDifficulties = [
      AIDifficulty.EASY,
      AIDifficulty.MEDIUM,
      AIDifficulty.HARD
    ];
    
    const aiColors = ['blue', 'green', 'orange'] as const;
    
    // Add 3 AI players
    for (let i = 0; i < 3; i++) {
      const difficulty = aiDifficulties[i];
      const name = generateAIPlayerName(difficulty);
      
      players.push({
        id: uuidv4(),
        name,
        color: aiColors[i],
        resources: { ...INITIAL_RESOURCES },
        developmentCards: [],
        score: 0,
        knightsPlayed: 0,
        hasLongestRoad: false,
        hasLargestArmy: false
      });
    }
  }
  
  return players;
};

// Generate a simplified hex grid (just for display purposes)
const generateHexGrid = (): Hex[] => {
  const hexes: Hex[] = [];
  const hexTypes = Object.entries(RESOURCE_DISTRIBUTION).flatMap(([type, count]) => 
    Array(count).fill(type)
  );
  
  // Shuffle hex types
  for (let i = hexTypes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [hexTypes[i], hexTypes[j]] = [hexTypes[j], hexTypes[i]];
  }
  
  // Get a shuffled copy of number tokens
  const numbers = [...NUMBER_TOKENS];
  for (let i = numbers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
  }
  
  let numberIndex = 0;
  
  // Create hexes in a simple grid layout
  // This is not a proper Catan layout, just a simplification for this demo
  const radius = 250;
  const hexSize = 70;
  const centerX = radius;
  const centerY = radius;
  
  // Ring 1 (center)
  hexes.push({
    id: 0,
    type: hexTypes[0] as any,
    hasRobber: hexTypes[0] === 'desert',
    number: hexTypes[0] === 'desert' ? undefined : numbers[numberIndex++],
    position: { x: centerX, y: centerY }
  });
  
  // Ring 2 (6 hexes around center)
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    hexes.push({
      id: hexes.length,
      type: hexTypes[hexes.length] as any,
      hasRobber: hexTypes[hexes.length] === 'desert',
      number: hexTypes[hexes.length] === 'desert' ? undefined : numbers[numberIndex++],
      position: {
        x: centerX + hexSize * Math.cos(angle),
        y: centerY + hexSize * Math.sin(angle)
      }
    });
  }
  
  // Ring 3 (12 hexes in outer ring)
  for (let i = 0; i < 12; i++) {
    const angle = (Math.PI / 6) * i;
    hexes.push({
      id: hexes.length,
      type: hexTypes[hexes.length] as any,
      hasRobber: hexTypes[hexes.length] === 'desert',
      number: hexTypes[hexes.length] === 'desert' ? undefined : numbers[numberIndex++],
      position: {
        x: centerX + hexSize * 2 * Math.cos(angle),
        y: centerY + hexSize * 2 * Math.sin(angle)
      }
    });
  }
  
  return hexes;
};

// Generate vertices and edges (simplified for demo)
const generateVerticesAndEdges = (hexes: Hex[]): { vertices: Vertex[], edges: Edge[] } => {
  const vertices: Vertex[] = [];
  const edges: Edge[] = [];
  
  // Simplified - just create some sample vertices and edges
  // In a real implementation, you'd create proper intersections between hexes
  
  // Create vertices (corners of hexes)
  for (let i = 0; i < 54; i++) {
    vertices.push({
      id: i,
      position: {
        x: 100 + Math.random() * 400,
        y: 100 + Math.random() * 400
      },
      adjacentHexes: [],
      adjacentVertices: []
    });
  }
  
  // Create edges between some vertices
  for (let i = 0; i < 72; i++) {
    const v1 = i % vertices.length;
    const v2 = (i + 1) % vertices.length;
    
    edges.push({
      id: i,
      vertices: [v1, v2]
    });
    
    // Connect vertices
    if (!vertices[v1].adjacentVertices.includes(v2)) {
      vertices[v1].adjacentVertices.push(v2);
    }
    if (!vertices[v2].adjacentVertices.includes(v1)) {
      vertices[v2].adjacentVertices.push(v1);
    }
  }
  
  return { vertices, edges };
};

// Generate ports
const generatePorts = (): Port[] => {
  const ports: Port[] = [];
  const types: (ResourceType | 'any')[] = ['any', 'any', 'any', 'any', 'wood', 'brick', 'grain', 'ore', 'wool'];
  
  for (let i = 0; i < 9; i++) {
    const angle = (Math.PI / 4.5) * i;
    ports.push({
      type: types[i],
      ratio: types[i] === 'any' ? 3 : 2,
      vertices: [i * 6, i * 6 + 1],
      position: {
        x: 250 + 240 * Math.cos(angle),
        y: 250 + 240 * Math.sin(angle),
        rotation: angle * (180 / Math.PI)
      }
    });
  }
  
  return ports;
};

// Create initial game state
const createInitialGameState = (): GameState => {
  const players = createInitialPlayers();
  const hexes = generateHexGrid();
  const { vertices, edges } = generateVerticesAndEdges(hexes);
  const ports = generatePorts();
  
  const robberHexId = hexes.findIndex(hex => hex.type === 'desert');
  
  return {
    players,
    currentPlayer: players[0].id,
    board: {
      hexes,
      vertices,
      edges,
      ports,
      robber: { hexId: robberHexId !== -1 ? robberHexId : 0 }
    },
    phase: 'SETUP',
    turnNumber: 1,
    diceRoll: null,
    setupPhase: {
      round: 1,
      direction: 'forward',
      settlementsPlaced: 0,
      roadsPlaced: 0
    },
    longestRoad: {
      playerId: null,
      length: 0
    },
    largestArmy: {
      playerId: null,
      size: 0
    },
    developmentCards: [],
    winner: null
  };
};

// Types for the store
interface GameStore extends GameState {
  // Actions
  rollDice: () => void;
  buildSettlement: (vertexId: number) => void;
  buildCity: (vertexId: number) => void;
  buildRoad: (edgeId: number) => void;
  endTurn: () => void;
  restartGame: () => void;
}

// Create the store
export const useGameStore = create<GameStore>((set) => {
  const initialState = createInitialGameState();
  
  return {
    ...initialState,
    
    // Actions
    rollDice: () => set(state => {
      if (state.phase !== 'ROLL') return state;
      
      const diceRoll = Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1;
      
      return {
        ...state,
        diceRoll,
        phase: diceRoll === 7 ? 'ROBBER' : 'MAIN'
      };
    }),
    
    buildSettlement: (vertexId: number) => set(state => {
      // Simplified logic for demo - in a real game, you'd check resources, valid placement, etc.
      const vertex = state.board.vertices.find(v => v.id === vertexId);
      if (!vertex || vertex.building) return state; // Can't build here
      
      const newVertices = state.board.vertices.map(v => 
        v.id === vertexId 
          ? { ...v, building: { type: 'settlement', playerId: state.currentPlayer }} 
          : v
      );
      
      return {
        ...state,
        board: {
          ...state.board,
          vertices: newVertices
        }
      };
    }),
    
    buildCity: (vertexId: number) => set(state => {
      // Simplified logic for demo
      const vertex = state.board.vertices.find(v => v.id === vertexId);
      if (!vertex || !vertex.building || vertex.building.type !== 'settlement') return state;
      
      const newVertices = state.board.vertices.map(v => 
        v.id === vertexId 
          ? { ...v, building: { ...v.building!, type: 'city' }} 
          : v
      );
      
      return {
        ...state,
        board: {
          ...state.board,
          vertices: newVertices
        }
      };
    }),
    
    buildRoad: (edgeId: number) => set(state => {
      // Simplified logic for demo
      const edge = state.board.edges.find(e => e.id === edgeId);
      if (!edge || edge.road) return state;
      
      const newEdges = state.board.edges.map(e => 
        e.id === edgeId 
          ? { ...e, road: { playerId: state.currentPlayer }} 
          : e
      );
      
      return {
        ...state,
        board: {
          ...state.board,
          edges: newEdges
        }
      };
    }),
    
    endTurn: () => set(state => {
      if (state.phase === 'ROLL') return state;
      
      // Find index of current player
      const currentPlayerIndex = state.players.findIndex(p => p.id === state.currentPlayer);
      const nextPlayerIndex = (currentPlayerIndex + 1) % state.players.length;
      
      return {
        ...state,
        currentPlayer: state.players[nextPlayerIndex].id,
        phase: 'ROLL',
        turnNumber: state.turnNumber + 1,
        diceRoll: null
      };
    }),
    
    restartGame: () => {
      const newState = createInitialGameState();
      return set(newState);
    }
  };
}); 