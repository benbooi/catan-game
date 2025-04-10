import { GameState, GameAction, GameError } from './gameState';
import { ResourceType, DevelopmentCardType } from './game';

export interface BuildCost {
  road: Record<ResourceType, number>;
  settlement: Record<ResourceType, number>;
  city: Record<ResourceType, number>;
  developmentCard: Record<ResourceType, number>;
}

export interface GameRules {
  maxPlayers: number;
  minPlayers: number;
  pointsToWin: number;
  initialResources: Record<ResourceType, number>;
  maxHandSize: number;
  robberThreshold: number;
  buildCosts: BuildCost;
  developmentCards: {
    knights: number;
    victoryPoints: number;
    roadBuilding: number;
    yearOfPlenty: number;
    monopoly: number;
  };
  setupRules: {
    settlementsPerPlayer: number;
    roadsPerPlayer: number;
  };
  bankTrade: {
    defaultRatio: number;
    portRatios: {
      [key in ResourceType]?: number;
    };
  };
}

export interface GameValidator {
  canBuildSettlement: (state: GameState, vertexId: number) => boolean;
  canBuildCity: (state: GameState, vertexId: number) => boolean;
  canBuildRoad: (state: GameState, edgeId: number) => boolean;
  canBuyDevelopmentCard: (state: GameState) => boolean;
  canPlayDevelopmentCard: (state: GameState, cardType: DevelopmentCardType) => boolean;
  canMoveRobber: (state: GameState, hexId: number, targetPlayerId: number) => boolean;
  canOfferTrade: (state: GameState, give: Partial<Record<ResourceType, number>>, want: Partial<Record<ResourceType, number>>) => boolean;
  canAcceptTrade: (state: GameState) => boolean;
  canBankTrade: (state: GameState, give: ResourceType[], want: ResourceType) => boolean;
  canEndTurn: (state: GameState) => boolean;
}

export interface GameReducer {
  (state: GameState, action: GameAction): GameState | GameError;
}

export interface GameInitializer {
  (numPlayers: number): GameState;
}

export interface ValidationResult {
  valid: boolean;
  error?: {
    code: string;
    message: string;
  };
}

export interface ResourceTransaction {
  give: Partial<Record<ResourceType, number>>;
  receive: Partial<Record<ResourceType, number>>;
}

export interface DevelopmentCardEffect {
  type: DevelopmentCardType;
  effect: (playerId: number) => void;
}

export interface RobberEffect {
  moveRobber: (hexId: number) => void;
  stealResource: (fromPlayerId: number, toPlayerId: number) => void;
} 