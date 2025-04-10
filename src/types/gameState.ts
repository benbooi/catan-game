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
    playerId: string;
    offer: Partial<Record<ResourceType, number>>;
    request: Partial<Record<ResourceType, number>>;
  } | null;
  setupPhase: {
    round: number;
    direction: 'forward' | 'backward';
    settlementsPlaced: number;
    roadsPlaced: number;
    settlementVertexId?: number;
    roadEdgeId?: number;
  };
  developmentCardDeck?: DevelopmentCard[];
  playedDevelopmentCard?: boolean;
  mustMoveRobber?: boolean;
  diceRolled?: boolean;
  winner?: string;
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
  | { type: 'PLAY_DEVELOPMENT_CARD'; cardIndex: number; resources?: ResourceType[]; resource?: ResourceType }
  | { type: 'TRADE_BANK'; give: ResourceType; receive: ResourceType }
  | { type: 'TRADE_OFFER'; offer: Partial<Record<ResourceType, number>>; request: Partial<Record<ResourceType, number>> }
  | { type: 'TRADE_ACCEPT' }
  | { type: 'TRADE_REJECT' }
  | { type: 'MOVE_ROBBER'; hexId: number; targetPlayerId?: string }
  | { type: 'END_TURN' }
  | { type: 'DISCARD_CARDS'; discards: Record<string, Partial<Record<ResourceType, number>>> }; 