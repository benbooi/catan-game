export type ResourceType = 'wood' | 'brick' | 'ore' | 'grain' | 'wool';
export type DevelopmentCardType = 'knight' | 'victoryPoint' | 'roadBuilding' | 'yearOfPlenty' | 'monopoly';

export type GamePhase = 'SETUP' | 'ROLL' | 'MAIN' | 'ROBBER';

export interface Player {
  id: string;
  name: string;
  color: string;
  resources: Record<ResourceType, number>;
  developmentCards: DevelopmentCard[];
  knights: number;
  victoryPoints: number;
  longestRoadLength: number;
}

export interface Hex {
  id: number;
  type: ResourceType | 'desert';
  token?: number;
  vertices: number[];
  edges: number[];
}

export interface Vertex {
  id: number;
  x: number;
  y: number;
  building?: {
    type: 'settlement' | 'city';
    playerId: string;
  };
  adjacentHexes: number[];
  adjacentVertices: number[];
  adjacentEdges: number[];
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
}

export interface GameState {
  players: Player[];
  currentPlayer: number;
  board: {
    hexes: Hex[];
    vertices: Vertex[];
    edges: Edge[];
  };
  dice: {
    lastRoll: [number, number] | null;
  };
  phase: GamePhase;
  trade?: Trade;
  gameLog: string[];
}

export interface Trade {
  from: number;
  to: number | 'bank';
  give: Partial<Record<ResourceType, number>>;
  want: Partial<Record<ResourceType, number>>;
}

export interface Building {
  type: 'settlement' | 'city';
  player: number;
}

export interface Road {
  player: number;
}

export interface Port {
  type: ResourceType | 'any';
  ratio: number;
  vertices: [number, number];
} 