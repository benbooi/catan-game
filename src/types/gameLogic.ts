import { GameState, GameAction, GameError } from './gameState';
import { ResourceType, DevelopmentCardType } from './game';
import { Player, Vertex, Edge, Hex } from './game';

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

export interface GameLogic {
  // Core game actions
  rollDice: (state: GameState) => GameState;
  buildSettlement: (state: GameState, vertexId: number) => GameState;
  buildCity: (state: GameState, vertexId: number) => GameState;
  buildRoad: (state: GameState, edgeId: number) => GameState;
  buyDevelopmentCard: (state: GameState) => GameState;
  playDevelopmentCard: (state: GameState, cardIndex: number) => GameState;
  trade: (state: GameState, offer: Record<ResourceType, number>, request: Record<ResourceType, number>) => GameState;
  moveRobber: (state: GameState, hexId: number, targetPlayerId?: string) => GameState;
  endTurn: (state: GameState) => GameState;

  // Setup phase actions
  placeInitialSettlement: (state: GameState, vertexId: number) => GameState;
  placeInitialRoad: (state: GameState, edgeId: number) => GameState;

  // Validation functions
  canBuildSettlement: (state: GameState, vertexId: number) => boolean;
  canBuildCity: (state: GameState, vertexId: number) => boolean;
  canBuildRoad: (state: GameState, edgeId: number) => boolean;
  canBuyDevelopmentCard: (state: GameState) => boolean;
  canPlayDevelopmentCard: (state: GameState, cardIndex: number) => boolean;
  canTrade: (state: GameState, offer: Record<ResourceType, number>, request: Record<ResourceType, number>) => boolean;
  canMoveRobber: (state: GameState, hexId: number, targetPlayerId?: string) => boolean;

  // Helper functions
  getValidSettlementLocations: (state: GameState) => number[];
  getValidRoadLocations: (state: GameState) => number[];
  getValidCityLocations: (state: GameState) => number[];
  getValidRobberLocations: (state: GameState) => number[];
  getPlayersToRob: (state: GameState, hexId: number) => Player[];
  calculateLongestRoad: (state: GameState) => { playerId: string; length: number };
  calculateLargestArmy: (state: GameState) => { playerId: string; size: number };
  getResourceCount: (state: GameState, playerId: string, resourceType: ResourceType) => number;
  getTotalResources: (state: GameState, playerId: string) => number;
  getAdjacentVertices: (vertexId: number) => number[];
  getAdjacentEdges: (vertexId: number) => number[];
  getAdjacentHexes: (vertexId: number) => number[];
  getVertexAtPoint: (x: number, y: number) => Vertex | null;
  getEdgeAtPoint: (x: number, y: number) => Edge | null;
  getHexAtPoint: (x: number, y: number) => Hex | null;
}

export interface GameActionHandler {
  handleAction: (state: GameState, action: GameAction) => GameState | GameError;
  validateAction: (state: GameState, action: GameAction) => boolean;
  getValidActions: (state: GameState) => GameAction[];
}

export interface GameSetup {
  initializeGame: (playerCount: number) => GameState;
  validateSetup: (state: GameState) => boolean;
  isSetupComplete: (state: GameState) => boolean;
}

export interface GameScoring {
  calculateVictoryPoints: (state: GameState, playerId: string) => number;
  calculateLongestRoad: (state: GameState) => { playerId: string; length: number };
  calculateLargestArmy: (state: GameState) => { playerId: string; size: number };
  hasWon: (state: GameState, playerId: string) => boolean;
} 