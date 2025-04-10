import { GameState, GameAction, GameError } from '../types/gameState';
import { ResourceType, Player, Vertex, Edge } from '../types/game';
import { ValidationResult } from '../types/gameLogic';
import { DEFAULT_GAME_RULES, DEFAULT_BUILD_COSTS } from '../constants/gameConstants';

export function validateGameAction(state: GameState, action: GameAction): ValidationResult {
  switch (action.type) {
    case 'ROLL_DICE':
      return validateRollDice(state);
    case 'BUILD_SETTLEMENT':
      return validateBuildSettlement(state, action.vertex);
    case 'BUILD_CITY':
      return validateBuildCity(state, action.vertex);
    case 'BUILD_ROAD':
      return validateBuildRoad(state, action.edge);
    case 'BUY_DEVELOPMENT_CARD':
      return validateBuyDevelopmentCard(state);
    case 'PLAY_DEVELOPMENT_CARD':
      return validatePlayDevelopmentCard(state, action.card);
    case 'TRADE_BANK':
      return validateBankTrade(state, action.give, action.receive);
    case 'TRADE_PLAYER':
      return validatePlayerTrade(state, action.give, action.receive, action.targetPlayer);
    case 'MOVE_ROBBER':
      return validateMoveRobber(state, action.hex, action.targetPlayer);
    case 'END_TURN':
      return validateEndTurn(state);
    default:
      return { valid: false, error: { code: 'INVALID_ACTION', message: 'Invalid action type' } };
  }
}

function validateRollDice(state: GameState): ValidationResult {
  if (state.phase !== 'ROLL') {
    return { valid: false, error: { code: 'WRONG_PHASE', message: 'Can only roll dice during roll phase' } };
  }
  return { valid: true };
}

function validateBuildSettlement(state: GameState, vertex: Vertex): ValidationResult {
  const currentPlayer = state.players[state.currentPlayer];
  
  // Check resources
  if (!hasResources(currentPlayer, DEFAULT_BUILD_COSTS.settlement)) {
    return { valid: false, error: { code: 'INSUFFICIENT_RESOURCES', message: 'Not enough resources to build settlement' } };
  }

  // Check vertex availability and distance rule
  if (!isVertexAvailable(state, vertex)) {
    return { valid: false, error: { code: 'INVALID_LOCATION', message: 'Invalid settlement location' } };
  }

  return { valid: true };
}

function validateBuildCity(state: GameState, vertex: Vertex): ValidationResult {
  const currentPlayer = state.players[state.currentPlayer];
  
  // Check resources
  if (!hasResources(currentPlayer, DEFAULT_BUILD_COSTS.city)) {
    return { valid: false, error: { code: 'INSUFFICIENT_RESOURCES', message: 'Not enough resources to build city' } };
  }

  // Check if player has settlement at vertex
  if (!hasSettlementAt(state, vertex, currentPlayer)) {
    return { valid: false, error: { code: 'INVALID_LOCATION', message: 'Must upgrade existing settlement' } };
  }

  return { valid: true };
}

function validateBuildRoad(state: GameState, edge: Edge): ValidationResult {
  const currentPlayer = state.players[state.currentPlayer];
  
  // Check resources
  if (!hasResources(currentPlayer, DEFAULT_BUILD_COSTS.road)) {
    return { valid: false, error: { code: 'INSUFFICIENT_RESOURCES', message: 'Not enough resources to build road' } };
  }

  // Check edge availability and connection to existing roads/settlements
  if (!isEdgeAvailable(state, edge)) {
    return { valid: false, error: { code: 'INVALID_LOCATION', message: 'Invalid road location' } };
  }

  return { valid: true };
}

function validateBuyDevelopmentCard(state: GameState): ValidationResult {
  const currentPlayer = state.players[state.currentPlayer];
  
  // Check resources
  if (!hasResources(currentPlayer, DEFAULT_BUILD_COSTS.developmentCard)) {
    return { valid: false, error: { code: 'INSUFFICIENT_RESOURCES', message: 'Not enough resources to buy development card' } };
  }

  // Check if development cards are available
  if (state.developmentCards.length === 0) {
    return { valid: false, error: { code: 'NO_DEVELOPMENT_CARDS', message: 'No development cards available' } };
  }

  return { valid: true };
}

function validatePlayDevelopmentCard(state: GameState, cardType: string): ValidationResult {
  const currentPlayer = state.players[state.currentPlayer];
  
  // Check if player has the card
  if (!hasCard(currentPlayer, cardType)) {
    return { valid: false, error: { code: 'NO_CARD', message: 'Player does not have this development card' } };
  }

  // Check if card was bought this turn
  if (isCardBoughtThisTurn(state, cardType)) {
    return { valid: false, error: { code: 'CARD_JUST_BOUGHT', message: 'Cannot play development card bought this turn' } };
  }

  return { valid: true };
}

function validateBankTrade(state: GameState, give: ResourceType, receive: ResourceType): ValidationResult {
  const currentPlayer = state.players[state.currentPlayer];
  const tradeRatio = getTradeRatio(state, give);
  
  if (currentPlayer.resources[give] < tradeRatio) {
    return { valid: false, error: { code: 'INSUFFICIENT_RESOURCES', message: 'Not enough resources for bank trade' } };
  }

  return { valid: true };
}

function validatePlayerTrade(
  state: GameState, 
  give: Record<ResourceType, number>, 
  receive: Record<ResourceType, number>, 
  targetPlayer: string
): ValidationResult {
  const currentPlayer = state.players[state.currentPlayer];
  const tradingPartner = state.players[targetPlayer];
  
  // Check if players have sufficient resources
  if (!hasResources(currentPlayer, give)) {
    return { valid: false, error: { code: 'INSUFFICIENT_RESOURCES', message: 'Offering player lacks required resources' } };
  }
  
  if (!hasResources(tradingPartner, receive)) {
    return { valid: false, error: { code: 'INSUFFICIENT_RESOURCES', message: 'Target player lacks required resources' } };
  }

  return { valid: true };
}

function validateMoveRobber(state: GameState, hex: number, targetPlayer?: string): ValidationResult {
  if (hex === state.robber) {
    return { valid: false, error: { code: 'INVALID_LOCATION', message: 'Robber must move to new location' } };
  }
  
  if (targetPlayer && !canStealFrom(state, targetPlayer, hex)) {
    return { valid: false, error: { code: 'INVALID_TARGET', message: 'Cannot steal from this player' } };
  }

  return { valid: true };
}

function validateEndTurn(state: GameState): ValidationResult {
  if (state.phase === 'ROLL') {
    return { valid: false, error: { code: 'WRONG_PHASE', message: 'Must roll dice before ending turn' } };
  }
  return { valid: true };
}

// Helper functions
function hasResources(player: Player, cost: Record<ResourceType, number>): boolean {
  return Object.entries(cost).every(([resource, amount]) => 
    player.resources[resource as ResourceType] >= amount
  );
}

function isVertexAvailable(state: GameState, vertex: Vertex): boolean {
  // Implementation depends on board representation
  return true; // Placeholder
}

function hasSettlementAt(state: GameState, vertex: Vertex, player: Player): boolean {
  // Implementation depends on board representation
  return true; // Placeholder
}

function isEdgeAvailable(state: GameState, edge: Edge): boolean {
  // Implementation depends on board representation
  return true; // Placeholder
}

function hasCard(player: Player, cardType: string): boolean {
  return player.developmentCards.some(card => card.type === cardType && !card.used);
}

function isCardBoughtThisTurn(state: GameState, cardType: string): boolean {
  // Implementation depends on development card tracking
  return false; // Placeholder
}

function getTradeRatio(state: GameState, resource: ResourceType): number {
  // Implementation depends on port configuration
  return 4; // Default trade ratio
}

function canStealFrom(state: GameState, targetPlayer: string, hex: number): boolean {
  // Implementation depends on board representation
  return true; // Placeholder
} 