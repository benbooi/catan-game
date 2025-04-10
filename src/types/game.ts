export type ResourceType = 'wood' | 'brick' | 'ore' | 'grain' | 'wool';
export type HexType = ResourceType | 'desert';
export type PlayerColor = 'red' | 'blue' | 'green' | 'orange';
export type BuildingType = 'settlement' | 'city';
export type DevelopmentCardType = 'knight' | 'victoryPoint' | 'roadBuilding' | 'yearOfPlenty' | 'monopoly';
export type GamePhase = 'SETUP' | 'ROLL' | 'MAIN' | 'ROBBER' | 'FINISHED';

export interface Player {
  id: string;
  name: string;
  color: PlayerColor;
  resources: Record<ResourceType, number>;
  developmentCards: DevelopmentCard[];
  score: number;
  knightsPlayed: number;
  hasLongestRoad: boolean;
  hasLargestArmy: boolean;
}

export interface Hex {
  id: number;
  type: HexType;
  number?: number;
  hasRobber: boolean;
  position: {
    x: number;
    y: number;
  };
}

export interface Vertex {
  id: number;
  position: {
    x: number;
    y: number;
  };
  adjacentHexes: number[];
  adjacentVertices: number[];
  building?: {
    type: BuildingType;
    playerId: string;
  };
}

export interface Edge {
  id: number;
  vertices: [number, number];
  road?: {
    playerId: string;
  };
}

export interface DevelopmentCard {
  type: DevelopmentCardType;
  used: boolean;
  turnPurchased: number;
}

export interface Port {
  type: ResourceType | 'any';
  ratio: number;
  vertices: number[];
  position: {
    x: number;
    y: number;
    rotation: number;
  };
}

export interface GameBoard {
  hexes: Hex[];
  vertices: Vertex[];
  edges: Edge[];
  ports: Port[];
  robber: {
    hexId: number;
  };
}

export interface GameState {
  players: Player[];
  currentPlayer: string;
  board: GameBoard;
  phase: GamePhase;
  turnNumber: number;
  diceRoll: number | null;
  setupPhase: {
    round: number;
    direction: 'forward' | 'backward';
    settlementsPlaced: number;
    roadsPlaced: number;
  } | null;
  longestRoad: {
    playerId: string | null;
    length: number;
  };
  largestArmy: {
    playerId: string | null;
    size: number;
  };
  developmentCards: DevelopmentCard[];
  winner: string | null;
} 