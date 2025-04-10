import { GameState, GameAction, GameError } from '../types/gameState';
import { ResourceType } from '../types/game';
import { getNeighbors } from '../utils/boardLayout';

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
    case 'TRADE':
      return validateTrade(state, action.offer, action.request);
    case 'MOVE_ROBBER':
      return validateMoveRobber(state, action.hexId, action.targetPlayerId);
    case 'END_TURN':
      return null;
    default:
      return { code: 'INVALID_ACTION', message: 'Unknown action type' };
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
    return { code: 'INVALID_CARD', message: 'Invalid or already used development card' };
  }

  return null;
}

function validateTrade(
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

function validateMoveRobber(
  state: GameState, 
  hexId: number, 
  targetPlayerId?: string
): GameError | null {
  if (state.phase !== 'ROBBER') {
    return { code: 'INVALID_PHASE', message: 'Must move robber during robber phase' };
  }

  if (hexId === state.board.robberHex) {
    return { code: 'INVALID_LOCATION', message: 'Must move robber to a new location' };
  }

  if (targetPlayerId) {
    const hex = state.board.hexes[hexId];
    const hasAdjacentBuildings = hex.vertices.some(vertexId => {
      const vertex = state.board.vertices[vertexId];
      return vertex.building?.playerId === targetPlayerId;
    });

    if (!hasAdjacentBuildings) {
      return { code: 'INVALID_TARGET', message: 'Target player has no buildings adjacent to this hex' };
    }
  }

  return null;
}

function getAdjacentVertices(vertexId: number): number[] {
  // Implementation needed
  return [];
}

export const gameValidator = {
  canRollDice: (state: GameState): boolean => {
    return state.phase === 'ROLL';
  },

  canBuildSettlement: (state: GameState, vertexId: number): boolean => {
    const vertex = state.board.vertices.find(v => v.id === vertexId);
    if (!vertex) return false;

    // Check if vertex is already occupied
    if (vertex.building) return false;

    // Check if adjacent vertices are occupied
    const hasAdjacentSettlement = vertex.adjacentVertices.some(adjId => {
      const adjVertex = state.board.vertices.find(v => v.id === adjId);
      return adjVertex?.building !== undefined;
    });
    if (hasAdjacentSettlement) return false;

    // In setup phase, check if player has a connected road
    if (state.setupPhase) {
      const hasConnectedRoad = vertex.adjacentEdges.some(edgeId => {
        const edge = state.board.edges.find(e => e.id === edgeId);
        return edge?.road?.playerId === state.currentPlayer;
      });
      if (!hasConnectedRoad) return false;
    }

    // Check if player has enough resources
    const player = state.players.find(p => p.id === state.currentPlayer);
    if (!player) return false;
    return (
      player.resources.wood >= 1 &&
      player.resources.brick >= 1 &&
      player.resources.grain >= 1 &&
      player.resources.wool >= 1
    );
  },

  canBuildCity: (state: GameState, vertexId: number): boolean => {
    const vertex = state.board.vertices.find(v => v.id === vertexId);
    if (!vertex || !vertex.building || vertex.building.type !== 'settlement') return false;
    if (vertex.building.playerId !== state.currentPlayer) return false;

    const player = state.players.find(p => p.id === state.currentPlayer);
    if (!player) return false;
    return player.resources.ore >= 3 && player.resources.grain >= 2;
  },

  canBuildRoad: (state: GameState, edgeId: number): boolean => {
    const edge = state.board.edges.find(e => e.id === edgeId);
    if (!edge || edge.road) return false;

    // Check if player has enough resources
    const player = state.players.find(p => p.id === state.currentPlayer);
    if (!player) return false;
    if (player.resources.wood < 1 || player.resources.brick < 1) return false;

    // Check if road connects to existing road or settlement
    const hasValidConnection = edge.vertices.some(vertexId => {
      const vertex = state.board.vertices.find(v => v.id === vertexId);
      if (!vertex) return false;

      // Check if vertex has player's settlement
      if (vertex.building?.playerId === state.currentPlayer) return true;

      // Check if vertex has player's road
      return vertex.adjacentEdges.some(adjEdgeId => {
        const adjEdge = state.board.edges.find(e => e.id === adjEdgeId);
        return adjEdge?.road?.playerId === state.currentPlayer;
      });
    });

    return hasValidConnection;
  },

  canBuyDevelopmentCard: (state: GameState): boolean => {
    const player = state.players.find(p => p.id === state.currentPlayer);
    if (!player) return false;
    return (
      player.resources.ore >= 1 &&
      player.resources.grain >= 1 &&
      player.resources.wool >= 1
    );
  },

  canPlayDevelopmentCard: (state: GameState, cardType: string): boolean => {
    const player = state.players.find(p => p.id === state.currentPlayer);
    if (!player) return false;

    const card = player.developmentCards.find(c => c.type === cardType && !c.used);
    if (!card) return false;

    // Check if card can be played in current phase
    if (cardType === 'knight') return state.phase === 'MAIN';
    if (cardType === 'roadBuilding') return state.phase === 'MAIN';
    if (cardType === 'yearOfPlenty') return state.phase === 'MAIN';
    if (cardType === 'monopoly') return state.phase === 'MAIN';
    if (cardType === 'victoryPoint') return false; // Can't play victory point cards

    return false;
  },

  canBankTrade: (state: GameState, give: ResourceType, want: ResourceType): boolean => {
    const player = state.players.find(p => p.id === state.currentPlayer);
    if (!player) return false;
    return player.resources[give] >= 1;
  },

  canOfferTrade: (state: GameState, give: Partial<Record<ResourceType, number>>, want: Partial<Record<ResourceType, number>>): boolean => {
    const player = state.players.find(p => p.id === state.currentPlayer);
    if (!player) return false;

    // Check if player has enough resources to give
    return Object.entries(give).every(([resource, count]) => 
      player.resources[resource as ResourceType] >= (count || 0)
    );
  },

  canAcceptTrade: (state: GameState): boolean => {
    return state.tradeOffer !== null && state.phase === 'MAIN';
  },

  canMoveRobber: (state: GameState, hexId: number, targetPlayerId: string): boolean => {
    const hex = state.board.hexes.find(h => h.id === hexId);
    if (!hex) return false;

    // Check if target player has resources
    const targetPlayer = state.players.find(p => p.id === targetPlayerId);
    if (!targetPlayer) return false;

    return Object.values(targetPlayer.resources).some(count => count > 0);
  },

  canEndTurn: (state: GameState): boolean => {
    return state.phase === 'MAIN';
  }
}; 