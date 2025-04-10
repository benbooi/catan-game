import { GameState, GameAction } from '../types/gameState';
import { ResourceType } from '../types/game';
import { getNeighbors } from '../utils/boardLayout';

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