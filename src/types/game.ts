export type ResourceType = 'wood' | 'brick' | 'ore' | 'grain' | 'wool';
export type DevelopmentCardType = 'knight' | 'victoryPoint' | 'roadBuilding' | 'yearOfPlenty' | 'monopoly';

export type GamePhase = 'SETUP' | 'ROLL' | 'MAIN' | 'ROBBER' | 'DISCARD' | 'TRADE';

export interface Player {
  id: number;
  name: string;
  color: string;
  resources: Record<ResourceType, number>;
  developmentCards: DevelopmentCardType[];
  buildings: {
    settlements: number[];
    cities: number[];
    roads: number[];
  };
  knights: number;
  victoryPoints: number;
}

export interface Hex {
  id: number;
  type: ResourceType | 'desert';
  number: number | null;
  hasRobber: boolean;
  vertices: number[];
  edges: number[];
}

export interface Vertex {
  id: number;
  building: {
    type: 'settlement' | 'city' | null;
    player: number | null;
  };
  adjacentHexes: number[];
  adjacentVertices: number[];
  adjacentEdges: number[];
}

export interface Edge {
  id: number;
  road: {
    player: number | null;
  };
  vertices: [number, number];
  adjacentEdges: number[];
}

export interface DevelopmentCard {
  type: DevelopmentCardType;
  turnPurchased: number;
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