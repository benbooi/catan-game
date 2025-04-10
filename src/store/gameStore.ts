import { create } from 'zustand';
import { GameState, ResourceType, Hex, Vertex, Edge, Player, GamePhase } from '../types/game';
import { v4 as uuidv4 } from 'uuid';
import { GameAction, GameError } from '../types/gameState';
import { gameReducer } from '../reducers/gameReducer';
import { gameInitializer } from '../initializers/gameInitializer';
import { gameValidator } from '../validators/gameValidator';
import { updateLongestRoad } from '../utils/longestRoad';

const INITIAL_RESOURCES: Record<ResourceType, number> = {
  brick: 0,
  lumber: 0,
  ore: 0,
  grain: 0,
  wool: 0,
  desert: 0,
};

const CLASSIC_RESOURCES = [
  'desert',
  ...Array(3).fill('brick'),
  ...Array(4).fill('lumber'),
  ...Array(3).fill('ore'),
  ...Array(4).fill('grain'),
  ...Array(4).fill('wool'),
] as ResourceType[];

const CLASSIC_NUMBERS = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];

function shuffle<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

function createInitialBoard() {
  const shuffledResources = shuffle(CLASSIC_RESOURCES);
  const shuffledNumbers = shuffle(CLASSIC_NUMBERS);
  let numberIndex = 0;

  const hexes: Hex[] = shuffledResources.map((type, index) => ({
    id: uuidv4(),
    type,
    number: type === 'desert' ? undefined : shuffledNumbers[numberIndex++],
    hasRobber: type === 'desert',
    vertices: [],
  }));

  // Create vertices grid (6x11 for standard Catan board)
  const vertices: Vertex[] = [];
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 11; col++) {
      vertices.push({
        id: uuidv4(),
        x: col,
        y: row,
        adjacentHexes: [],
        connectedVertices: [],
        building: undefined,
        owner: undefined,
      });
    }
  }

  // Create edges connecting vertices
  const edges: Edge[] = [];
  // Horizontal edges
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 10; col++) {
      edges.push({
        id: uuidv4(),
        vertex1: vertices[row * 11 + col].id,
        vertex2: vertices[row * 11 + col + 1].id,
        road: undefined,
      });
    }
  }
  // Diagonal edges
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 11; col++) {
      if ((row + col) % 2 === 0) {
        edges.push({
          id: uuidv4(),
          vertex1: vertices[row * 11 + col].id,
          vertex2: vertices[(row + 1) * 11 + col].id,
          road: undefined,
        });
      }
    }
  }

  return { hexes, vertices, edges };
}

const INITIAL_PLAYERS: Player[] = [
  {
    id: 0,
    name: 'Red Player',
    color: 'red',
    resources: { ...INITIAL_RESOURCES },
    score: 0,
    isAI: false,
    developmentCards: [],
    knights: 0,
    longestRoad: false,
    largestArmy: false,
  },
  {
    id: 1,
    name: 'Blue Player',
    color: 'blue',
    resources: { ...INITIAL_RESOURCES },
    score: 0,
    isAI: false,
    developmentCards: [],
    knights: 0,
    longestRoad: false,
    largestArmy: false,
  },
  {
    id: 2,
    name: 'White Player',
    color: 'white',
    resources: { ...INITIAL_RESOURCES },
    score: 0,
    isAI: false,
    developmentCards: [],
    knights: 0,
    longestRoad: false,
    largestArmy: false,
  },
  {
    id: 3,
    name: 'Orange Player',
    color: 'orange',
    resources: { ...INITIAL_RESOURCES },
    score: 0,
    isAI: false,
    developmentCards: [],
    knights: 0,
    longestRoad: false,
    largestArmy: false,
  },
];

interface GameStore extends GameState {
  error: GameError | null;
  canBuildSettlement: (vertexId: number) => boolean;
  canBuildCity: (vertexId: number) => boolean;
  canBuildRoad: (edgeId: number) => boolean;
  canBuyDevelopmentCard: () => boolean;
  canPlayDevelopmentCard: (cardType: string) => boolean;
  canAcceptTrade: () => boolean;
  canEndTurn: () => boolean;
  dispatch: (action: GameAction) => void;
}

const createInitialResources = (): Record<ResourceType, number> => ({
  wood: 0,
  brick: 0,
  ore: 0,
  grain: 0,
  wool: 0
});

const createInitialHex = (type: ResourceType | 'desert', number?: number): Hex => ({
  id: uuidv4(),
  type,
  number,
  hasRobber: type === 'desert',
  vertices: [],
  edges: []
});

const createInitialVertex = (x: number, y: number): Vertex => ({
  id: uuidv4(),
  x,
  y,
  adjacentVertices: [],
  adjacentEdges: []
});

const createInitialEdge = (vertex1: number, vertex2: number): Edge => ({
  id: uuidv4(),
  vertices: [vertex1, vertex2]
});

const createInitialPlayer = (id: string, name: string, color: string): Player => ({
  id,
  name,
  color,
  resources: createInitialResources(),
  developmentCards: [],
  score: 0
});

const gameInitializer = (numPlayers: number): GameState => {
  const players: Player[] = [
    createInitialPlayer('0', 'Player 1', 'red'),
    createInitialPlayer('1', 'Player 2', 'blue'),
    createInitialPlayer('2', 'Player 3', 'green'),
    createInitialPlayer('3', 'Player 4', 'yellow')
  ].slice(0, numPlayers);

  return {
    players,
    currentPlayer: players[0].id,
    phase: 'SETUP',
    turnNumber: 0,
    diceRoll: null,
    board: {
      hexes: [],
      vertices: [],
      edges: [],
      ports: [],
      robber: {
        hexId: 0
      }
    },
    longestRoad: {
      playerId: null,
      length: 0
    },
    largestArmy: {
      playerId: null,
      size: 0
    },
    tradeOffer: null,
    setupPhase: {
      round: 1,
      direction: 'forward'
    }
  };
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...gameInitializer(4),
  error: null,
  canBuildSettlement: (vertexId: number) => {
    return gameValidator.canBuildSettlement(get(), vertexId);
  },
  canBuildCity: (vertexId: number) => {
    return gameValidator.canBuildCity(get(), vertexId);
  },
  canBuildRoad: (edgeId: number) => {
    return gameValidator.canBuildRoad(get(), edgeId);
  },
  canBuyDevelopmentCard: () => {
    return gameValidator.canBuyDevelopmentCard(get());
  },
  canPlayDevelopmentCard: (cardType: string) => {
    return gameValidator.canPlayDevelopmentCard(get(), cardType);
  },
  canAcceptTrade: () => {
    return gameValidator.canAcceptTrade(get());
  },
  canEndTurn: () => {
    return gameValidator.canEndTurn(get());
  },
  dispatch: (action: GameAction) => {
    const result = gameReducer(get(), action);
    set(result);
  }
})); 