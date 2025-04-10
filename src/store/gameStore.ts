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
  // Actions
  startGame: (numPlayers: number) => void;
  dispatch: (action: GameAction) => void;
  
  // Computed properties
  canBuildSettlement: (vertexId: number) => boolean;
  canBuildCity: (vertexId: number) => boolean;
  canBuildRoad: (edgeId: number) => boolean;
  canBuyDevelopmentCard: () => boolean;
  canPlayDevelopmentCard: (cardType: string) => boolean;
  canOfferTrade: () => boolean;
  canAcceptTrade: () => boolean;
  canBankTrade: () => boolean;
  canEndTurn: () => boolean;
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...gameInitializer(4), // Initialize with 4 players by default

  players: INITIAL_PLAYERS,
  currentPlayer: 0,
  board: createInitialBoard(),
  dice: {
    lastRoll: null,
  },
  phase: 'setup',
  gameLog: ['Game initialized. Place your first settlement and road.'],
  diceRoll: null,
  vertices: {},
  edges: {},
  robberPosition: { q: 0, r: 0 },

  startGame: (numPlayers: number) => {
    set(gameInitializer(numPlayers));
  },

  dispatch: (action: GameAction) => {
    const result = gameReducer(get(), action);
    if ('code' in result) {
      console.error(result.message);
      return;
    }
    set(result);

    // Check for longest road updates after certain actions
    if (
      action.type === 'BUILD_ROAD' ||
      action.type === 'BUILD_SETTLEMENT' ||
      action.type === 'BUILD_CITY'
    ) {
      const state = get();
      const newLongestRoad = updateLongestRoad(
        state.board.edges,
        state.board.vertices,
        state.players.map(p => p.id)
      );

      // Only update if there's a change
      if (
        newLongestRoad.player !== state.longestRoad.player ||
        newLongestRoad.length !== state.longestRoad.length
      ) {
        // Remove points from previous holder
        if (state.longestRoad.player !== null) {
          const prevPlayer = state.players[state.longestRoad.player];
          prevPlayer.victoryPoints -= 2;
        }

        // Add points to new holder
        if (newLongestRoad.player !== null) {
          const newPlayer = state.players[newLongestRoad.player];
          newPlayer.victoryPoints += 2;
        }

        set({ longestRoad: newLongestRoad });
      }
    }
  },

  // Computed properties using validator
  canBuildSettlement: (vertexId: number) => 
    gameValidator.canBuildSettlement(get(), vertexId),

  canBuildCity: (vertexId: number) => 
    gameValidator.canBuildCity(get(), vertexId),

  canBuildRoad: (edgeId: number) => 
    gameValidator.canBuildRoad(get(), edgeId),

  canBuyDevelopmentCard: () => 
    gameValidator.canBuyDevelopmentCard(get()),

  canPlayDevelopmentCard: (cardType: string) => 
    gameValidator.canPlayDevelopmentCard(get(), cardType),

  canOfferTrade: () => 
    get().phase === 'MAIN' && get().currentPlayer === get().players.findIndex(p => p.id === get().currentPlayer),

  canAcceptTrade: () => 
    gameValidator.canAcceptTrade(get()),

  canBankTrade: () => 
    get().phase === 'MAIN',

  canEndTurn: () => 
    gameValidator.canEndTurn(get())
})); 