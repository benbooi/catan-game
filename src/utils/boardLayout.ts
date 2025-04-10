import { Hex, ResourceType } from '../types/game';

// Axial coordinates for a standard Catan board
export const BOARD_LAYOUT: Hex[] = [
  // Center hex
  { q: 0, r: 0, type: 'desert', number: undefined },
  
  // Inner ring
  { q: 1, r: -1, type: 'ore', number: 10 },
  { q: 0, r: -1, type: 'wool', number: 2 },
  { q: -1, r: 0, type: 'lumber', number: 9 },
  { q: -1, r: 1, type: 'grain', number: 12 },
  { q: 0, r: 1, type: 'brick', number: 6 },
  { q: 1, r: 0, type: 'grain', number: 4 },
  
  // Outer ring
  { q: 2, r: -2, type: 'brick', number: 5 },
  { q: 1, r: -2, type: 'lumber', number: 4 },
  { q: 0, r: -2, type: 'ore', number: 6 },
  { q: -1, r: -1, type: 'grain', number: 3 },
  { q: -2, r: 0, type: 'wool', number: 11 },
  { q: -2, r: 1, type: 'lumber', number: 8 },
  { q: -2, r: 2, type: 'ore', number: 3 },
  { q: -1, r: 2, type: 'wool', number: 10 },
  { q: 0, r: 2, type: 'lumber', number: 5 },
  { q: 1, r: 1, type: 'brick', number: 9 },
  { q: 2, r: 0, type: 'wool', number: 11 },
  { q: 2, r: -1, type: 'grain', number: 8 },
];

// Get all vertices for a hex
export const getHexVertices = (q: number, r: number): string[] => {
  return [
    `${q},${r},0`,
    `${q},${r},1`,
    `${q},${r},2`,
    `${q},${r},3`,
    `${q},${r},4`,
    `${q},${r},5`,
  ];
};

// Get all edges for a hex
export const getHexEdges = (q: number, r: number): string[] => {
  return [
    `${q},${r},0`,
    `${q},${r},1`,
    `${q},${r},2`,
    `${q},${r},3`,
    `${q},${r},4`,
    `${q},${r},5`,
  ];
};

// Get neighboring hexes
export const getNeighbors = (q: number, r: number): [number, number][] => {
  return [
    [q+1, r-1], [q+1, r], [q, r+1],
    [q-1, r+1], [q-1, r], [q, r-1]
  ];
};

// Check if coordinates are valid (within the board)
export const isValidHex = (q: number, r: number): boolean => {
  return BOARD_LAYOUT.some(hex => hex.q === q && hex.r === r);
}; 