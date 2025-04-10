import { ResourceType, GamePhase, Player, Hex, Vertex, Edge } from './game';

export interface GameState {
  players: Player[];
  currentPlayer: number;
  phase: GamePhase;
  turnNumber: number;
  diceRoll: number | null;
  setupPhase: {
    round: 1 | 2;
    direction: 'forward' | 'backward';
  } | null;
  board: {
    hexes: Hex[];
    vertices: Vertex[];
    edges: Edge[];
  };
  longestRoad: {
    player: number | null;
    length: number;
  };
  largestArmy: {
    player: number | null;
    size: number;
  };
  tradeOffer: {
    from: number;
    to: number | null; // null means offer to all players
    give: Partial<Record<ResourceType, number>>;
    want: Partial<Record<ResourceType, number>>;
  } | null;
}

export interface GameError {
  code: 
    | 'INVALID_MOVE'
    | 'NOT_YOUR_TURN'
    | 'INVALID_PHASE'
    | 'INSUFFICIENT_RESOURCES'
    | 'INVALID_LOCATION'
    | 'INVALID_TRADE';
  message: string;
}

export type GameAction = 
  | { type: 'ROLL_DICE' }
  | { type: 'BUILD_SETTLEMENT'; vertexId: number }
  | { type: 'BUILD_CITY'; vertexId: number }
  | { type: 'BUILD_ROAD'; edgeId: number }
  | { type: 'BUY_DEVELOPMENT_CARD' }
  | { type: 'PLAY_DEVELOPMENT_CARD'; cardType: string }
  | { type: 'MOVE_ROBBER'; hexId: number; targetPlayerId: number }
  | { type: 'OFFER_TRADE'; give: Partial<Record<ResourceType, number>>; want: Partial<Record<ResourceType, number>>; toPlayer: number | null }
  | { type: 'ACCEPT_TRADE' }
  | { type: 'DECLINE_TRADE' }
  | { type: 'BANK_TRADE'; give: ResourceType[]; want: ResourceType }
  | { type: 'DISCARD_RESOURCES'; resources: Partial<Record<ResourceType, number>> }
  | { type: 'END_TURN' }; 