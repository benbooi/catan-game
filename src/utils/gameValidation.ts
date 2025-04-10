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

function validateBuildSettlement(state: GameState, vertexId: number): boolean {
  const player = state.players[state.currentPlayer];
  const vertex = state.board.vertices[vertexId];
  
  // Check if vertex is empty
  if (vertex.building) {
    return false;
  }

  // Check distance rule
  const adjacentVertices = getAdjacentVertices(vertexId);
  for (const adjVertexId of adjacentVertices) {
    const adjVertex = state.board.vertices[adjVertexId];
    if (adjVertex.building) {
      return false;
    }
  }

  // Check resources
  const hasResources = 
    player.resources.wood >= 1 &&
    player.resources.brick >= 1 &&
    player.resources.wool >= 1 &&
    player.resources.grain >= 1;

  return hasResources;
}

function validateBuildCity(state: GameState, vertexId: number): boolean {
  const player = state.players[state.currentPlayer];
  const vertex = state.board.vertices[vertexId];
  
  // Check if vertex has a settlement belonging to the player
  if (!vertex.building || 
      vertex.building.type !== 'settlement' || 
      vertex.building.playerId !== player.id) {
    return false;
  }

  // Check resources
  const hasResources = 
    player.resources.grain >= 2 &&
    player.resources.ore >= 3;

  return hasResources;
}

function validateBuildRoad(state: GameState, edgeId: number): boolean {
  const player = state.players[state.currentPlayer];
  const edge = state.board.edges[edgeId];
  
  // Check if edge is empty
  if (edge.road) {
    return false;
  }

  // Check if connected to settlement/city or another road
  const [vertex1, vertex2] = edge.vertices;
  const hasConnection = 
    (state.board.vertices[vertex1].building?.playerId === player.id) ||
    (state.board.vertices[vertex2].building?.playerId === player.id) ||
    state.board.edges.some(e => 
      e.road?.playerId === player.id && 
      (e.vertices.includes(vertex1) || e.vertices.includes(vertex2))
    );

  if (!hasConnection) {
    return false;
  }

  // Check resources
  const hasResources = 
    player.resources.wood >= 1 &&
    player.resources.brick >= 1;

  return hasResources;
}

function validateBuyDevelopmentCard(state: GameState): boolean {
  const player = state.players[state.currentPlayer];
  
  // Check resources
  const hasResources = 
    player.resources.ore >= 1 &&
    player.resources.wool >= 1 &&
    player.resources.grain >= 1;

  return hasResources;
}

function validatePlayDevelopmentCard(state: GameState, cardIndex: number): boolean {
  const player = state.players[state.currentPlayer];
  const card = player.developmentCards[cardIndex];
  
  // Check if card exists and hasn't been used this turn
  if (!card || card.used) {
    return false;
  }

  return true;
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

function validateMoveRobber(state: GameState, hexId: number, targetPlayerId?: string): boolean {
  // Check if hex exists and is not current robber location
  if (hexId === state.board.robberHex) {
    return false;
  }

  // If targeting a player, check if they have settlements/cities adjacent to the hex
  if (targetPlayerId) {
    const hex = state.board.hexes[hexId];
    const hasAdjacentBuildings = hex.vertices.some(vertexId => {
      const vertex = state.board.vertices[vertexId];
      return vertex.building?.playerId === targetPlayerId;
    });

    if (!hasAdjacentBuildings) {
      return false;
    }
  }

  return true;
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

function getAdjacentVertices(vertexId: number): number[] {
  // Implementation needed
  return [];
}

function getAdjacentEdges(vertexId: number): number[] {
  // Implementation needed
  return [];
}

function getAdjacentHexes(vertexId: number): number[] {
  // Implementation needed
  return [];
}

function getTradeRatio(state: GameState, resource: ResourceType): number {
  // Implementation depends on port configuration
  return 4; // Default trade ratio
} 