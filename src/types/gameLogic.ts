import { GameState, GameAction, GameError } from './gameState';
import { ResourceType, DevelopmentCardType } from './game';

export interface GameRules {
  maxPlayers: number;
  minPlayers: number;
  pointsToWin: number;
  initialResources: Partial<Record<ResourceType, number>>;
  setupRules: {
    settlementsPerPlayer: number;
    roadsPerPlayer: number;
  };
  costs: {
    road: Partial<Record<ResourceType, number>>;
    settlement: Partial<Record<ResourceType, number>>;
    city: Partial<Record<ResourceType, number>>;
    developmentCard: Partial<Record<ResourceType, number>>;
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