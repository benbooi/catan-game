import { Player, Hex, Vertex, Edge, Port, ResourceType, GamePhase } from './game';

export interface GameState {
  players: Player[];
  currentPlayer: string;
  phase: GamePhase;
  turnNumber: number;
  diceRoll: number | null;
  board: {
    hexes: Hex[];
    vertices: Vertex[];
    edges: Edge[];
    ports: Port[];
    robber: {
      hexId: number;
    };
  };
  longestRoad: {
    playerId: string | null;
    length: number;
  };
  largestArmy: {
    playerId: string | null;
    size: number;
  };
  tradeOffer: {
    from: string;
    to: string;
    give: Partial<Record<ResourceType, number>>;
    want: Partial<Record<ResourceType, number>>;
  } | null;
  setupPhase: {
    round: number;
    direction: 'forward' | 'backward';
  };
}

export interface GameError {
  code: 'INVALID_PHASE' | 'INVALID_PLAYER' | 'INSUFFICIENT_RESOURCES' | 'INVALID_LOCATION' | 'INVALID_TRADE';
  message: string;
}

export type GameAction = 
  | { type: 'ROLL_DICE' }
  | { type: 'BUILD_SETTLEMENT'; vertexId: number }
  | { type: 'BUILD_CITY'; vertexId: number }
  | { type: 'BUILD_ROAD'; edgeId: number }
  | { type: 'BUY_DEVELOPMENT_CARD' }
  | { type: 'PLAY_DEVELOPMENT_CARD'; cardIndex: number }
  | { type: 'TRADE_BANK'; give: ResourceType; want: ResourceType }
  | { type: 'TRADE_OFFER'; to: string; give: Partial<Record<ResourceType, number>>; want: Partial<Record<ResourceType, number>> }
  | { type: 'TRADE_ACCEPT' }
  | { type: 'TRADE_REJECT' }
  | { type: 'MOVE_ROBBER'; hexId: number; targetPlayerId: string }
  | { type: 'END_TURN' }; 