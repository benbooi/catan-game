import { GameState, GameAction, GameError } from '../types/gameState';
import { ResourceType, Player, Vertex, Edge } from '../types/game';
import { ValidationResult } from '../types/gameLogic';
import { DEFAULT_GAME_RULES, DEFAULT_BUILD_COSTS } from '../constants/gameConstants';

export function validateGameAction(state: GameState, action: GameAction): GameError | null {
  switch (action.type) {
    case 'ROLL_DICE':
      return validateRollDice(state);
    case 'BUILD_SETTLEMENT':
      return validateBuildSettlement(state, action.vertexId);
    case 'BUILD_CITY':
      return validateBuildCity(state, action.vertexId);
    case 'BUILD_ROAD':
      return validateBuildRoad(state, action.edgeId);
    case 'BUY_DEVELOPMENT_CARD':
      return validateBuyDevelopmentCard(state);
    case 'PLAY_DEVELOPMENT_CARD':
      return validatePlayDevelopmentCard(state, action.cardIndex);
    case 'TRADE_BANK':
      return validateBankTrade(state, action.give, action.receive);
    case 'TRADE_OFFER':
      return validateTradeOffer(state, action.offer, action.request);
    case 'TRADE_ACCEPT':
      return validateTradeAccept(state);
    case 'TRADE_REJECT':
      return null;
    case 'MOVE_ROBBER':
      return validateMoveRobber(state, action.hexId, action.targetPlayerId);
    case 'END_TURN':
      return null;
    default:
      return { code: 'INVALID_LOCATION', message: 'Unknown action type' };
  }
}

function validateRollDice(state: GameState): GameError | null {
  if (state.phase !== 'ROLL') {
    return { code: 'INVALID_PHASE', message: 'Must roll dice first' };
  }
  return null;
}

function validateBuildSettlement(state: GameState, vertexId: number): GameError | null {
  if (state.phase !== 'MAIN') {
    return { code: 'INVALID_PHASE', message: 'Cannot build during this phase' };
  }

  const player = state.players[state.currentPlayer];
  const vertex = state.board.vertices[vertexId];
  
  if (vertex.building) {
    return { code: 'INVALID_LOCATION', message: 'Vertex is occupied' };
  }

  // Check distance rule
  const adjacentVertices = getAdjacentVertices(vertexId);
  for (const adjVertexId of adjacentVertices) {
    const adjVertex = state.board.vertices[adjVertexId];
    if (adjVertex.building) {
      return { code: 'INVALID_LOCATION', message: 'Too close to another settlement' };
    }
  }

  // Check resources
  if (player.resources.wood < 1 || 
      player.resources.brick < 1 || 
      player.resources.wool < 1 || 
      player.resources.grain < 1) {
    return { code: 'INSUFFICIENT_RESOURCES', message: 'Not enough resources to build settlement' };
  }

  return null;
}

function validateBuildCity(state: GameState, vertexId: number): GameError | null {
  if (state.phase !== 'MAIN') {
    return { code: 'INVALID_PHASE', message: 'Cannot build during this phase' };
  }

  const player = state.players[state.currentPlayer];
  const vertex = state.board.vertices[vertexId];
  
  if (!vertex.building || 
      vertex.building.type !== 'settlement' || 
      vertex.building.playerId !== player.id) {
    return { code: 'INVALID_LOCATION', message: 'Must upgrade your own settlement' };
  }

  if (player.resources.grain < 2 || player.resources.ore < 3) {
    return { code: 'INSUFFICIENT_RESOURCES', message: 'Not enough resources to build city' };
  }

  return null;
}

function validateBuildRoad(state: GameState, edgeId: number): GameError | null {
  if (state.phase !== 'MAIN') {
    return { code: 'INVALID_PHASE', message: 'Cannot build during this phase' };
  }

  const player = state.players[state.currentPlayer];
  const edge = state.board.edges[edgeId];
  
  if (edge.road) {
    return { code: 'INVALID_LOCATION', message: 'Edge is occupied' };
  }

  // Check connection to settlement/city or another road
  const [vertex1, vertex2] = edge.vertices;
  const hasConnection = 
    (state.board.vertices[vertex1].building?.playerId === player.id) ||
    (state.board.vertices[vertex2].building?.playerId === player.id) ||
    state.board.edges.some(e => 
      e.road?.playerId === player.id && 
      (e.vertices.includes(vertex1) || e.vertices.includes(vertex2))
    );

  if (!hasConnection) {
    return { code: 'INVALID_LOCATION', message: 'Road must connect to settlement/city or another road' };
  }

  if (player.resources.wood < 1 || player.resources.brick < 1) {
    return { code: 'INSUFFICIENT_RESOURCES', message: 'Not enough resources to build road' };
  }

  return null;
}

function validateBuyDevelopmentCard(state: GameState): GameError | null {
  if (state.phase !== 'MAIN') {
    return { code: 'INVALID_PHASE', message: 'Cannot buy during this phase' };
  }

  const player = state.players[state.currentPlayer];
  
  if (player.resources.ore < 1 || 
      player.resources.wool < 1 || 
      player.resources.grain < 1) {
    return { code: 'INSUFFICIENT_RESOURCES', message: 'Not enough resources to buy development card' };
  }

  return null;
}

function validatePlayDevelopmentCard(state: GameState, cardIndex: number): GameError | null {
  if (state.phase !== 'MAIN') {
    return { code: 'INVALID_PHASE', message: 'Cannot play card during this phase' };
  }

  const player = state.players[state.currentPlayer];
  const card = player.developmentCards[cardIndex];
  
  if (!card || card.used) {
    return { code: 'INVALID_LOCATION', message: 'Invalid or already used development card' };
  }

  return null;
}

function validateBankTrade(
  state: GameState, 
  give: ResourceType, 
  receive: ResourceType
): GameError | null {
  if (state.phase !== 'MAIN') {
    return { code: 'INVALID_PHASE', message: 'Cannot trade during this phase' };
  }

  const player = state.players[state.currentPlayer];
  const tradeRatio = getTradeRatio(state, give);
  
  if (player.resources[give] < tradeRatio) {
    return { code: 'INSUFFICIENT_RESOURCES', message: 'Not enough resources for bank trade' };
  }

  return null;
}

function validateTradeOffer(
  state: GameState, 
  offer: Record<ResourceType, number>, 
  request: Record<ResourceType, number>
): GameError | null {
  if (state.phase !== 'MAIN') {
    return { code: 'INVALID_PHASE', message: 'Cannot trade during this phase' };
  }

  const player = state.players[state.currentPlayer];
  
  // Check if player has enough resources to offer
  for (const [resource, amount] of Object.entries(offer)) {
    if (player.resources[resource as ResourceType] < amount) {
      return { code: 'INSUFFICIENT_RESOURCES', message: 'Not enough resources to offer' };
    }
  }

  return null;
}

function validateTradeAccept(state: GameState): GameError | null {
  if (state.phase !== 'MAIN') {
    return { code: 'INVALID_PHASE', message: 'Cannot trade during this phase' };
  }

  if (!state.tradeOffer) {
    return { code: 'INVALID_TRADE', message: 'No active trade offer' };
  }

  return null;
}

function validateMoveRobber(
  state: GameState, 
  hexId: number, 
  targetPlayerId?: string
): GameError | null {
  if (state.phase !== 'ROBBER') {
    return { code: 'INVALID_PHASE', message: 'Must move robber during robber phase' };
  }

  if (hexId === state.board.robber.hexId) {
    return { code: 'INVALID_LOCATION', message: 'Must move robber to a new location' };
  }

  if (targetPlayerId) {
    const hex = state.board.hexes[hexId];
    const hasAdjacentBuildings = hex.vertices.some(vertexId => {
      const vertex = state.board.vertices[vertexId];
      return vertex.building?.playerId === targetPlayerId;
    });

    if (!hasAdjacentBuildings) {
      return { code: 'INVALID_TRADE', message: 'Target player has no buildings adjacent to this hex' };
    }
  }

  return null;
}

function getAdjacentVertices(vertexId: number): number[] {
  // Implementation needed
  return [];
}

function getTradeRatio(state: GameState, resource: ResourceType): number {
  // Implementation depends on port configuration
  return 4; // Default trade ratio
} 
} 