export type ResourceType = 'brick' | 'lumber' | 'ore' | 'grain' | 'wool' | 'desert';

export type HexType = ResourceType;

export interface Hex {
  id: string;
  type: HexType;
  number?: number;
  hasRobber: boolean;
}

export interface Vertex {
  id: string;
  x: number;
  y: number;
  adjacentHexes: string[];
  building?: 'settlement' | 'city';
  owner?: number;
}

export interface Edge {
  id: string;
  vertex1: string;
  vertex2: string;
  road?: number;
}

export interface Player {
  id: number;
  name: string;
  color: string;
  resources: Record<ResourceType, number>;
  score: number;
  isAI: boolean;
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
  phase: 'setup' | 'playing' | 'ended';
} 