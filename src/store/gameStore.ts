import { create } from 'zustand';
import { GameState, Player, Hex, Vertex, Edge } from '../types/game';

const createInitialBoard = () => {
  const hexes: Hex[] = [];
  const vertices: Vertex[] = [];
  const edges: Edge[] = [];
  
  // Create a simple 3x3 board for now
  const resources: Hex['type'][] = [
    'brick', 'lumber', 'ore',
    'grain', 'wool', 'desert',
    'brick', 'lumber', 'ore'
  ];
  
  resources.forEach((type, index) => {
    const x = index % 3;
    const y = Math.floor(index / 3);
    hexes.push({
      id: `hex-${index}`,
      type,
      number: type === 'desert' ? undefined : Math.floor(Math.random() * 6) + Math.floor(Math.random() * 6) + 2,
      hasRobber: type === 'desert'
    });
  });

  return { hexes, vertices, edges };
};

const createInitialPlayers = (): Player[] => {
  return [
    {
      id: 0,
      name: 'You',
      color: '#FF0000',
      resources: {
        brick: 0,
        lumber: 0,
        ore: 0,
        grain: 0,
        wool: 0
      },
      score: 0,
      isAI: false
    },
    {
      id: 1,
      name: 'AI 1',
      color: '#00FF00',
      resources: {
        brick: 0,
        lumber: 0,
        ore: 0,
        grain: 0,
        wool: 0
      },
      score: 0,
      isAI: true
    },
    {
      id: 2,
      name: 'AI 2',
      color: '#0000FF',
      resources: {
        brick: 0,
        lumber: 0,
        ore: 0,
        grain: 0,
        wool: 0
      },
      score: 0,
      isAI: true
    }
  ];
};

interface GameStore extends GameState {
  rollDice: () => void;
  endTurn: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  players: createInitialPlayers(),
  currentPlayer: 0,
  board: createInitialBoard(),
  dice: {
    lastRoll: null
  },
  phase: 'setup',
  
  rollDice: () => {
    const die1 = Math.floor(Math.random() * 6) + 1;
    const die2 = Math.floor(Math.random() * 6) + 1;
    set((state) => ({
      dice: {
        lastRoll: [die1, die2]
      }
    }));
  },
  
  endTurn: () => {
    set((state) => ({
      currentPlayer: (state.currentPlayer + 1) % state.players.length
    }));
  }
})); 