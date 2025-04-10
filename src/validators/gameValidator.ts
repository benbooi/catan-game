import { GameState, GameValidator } from '../types/gameLogic';
import { ResourceType, DevelopmentCardType } from '../types/game';
import { getNeighbors } from '../utils/boardLayout';

const hasResources = (resources: Record<ResourceType, number>, required: Partial<Record<ResourceType, number>>): boolean => {
  return Object.entries(required).every(([type, count]) => 
    resources[type as ResourceType] >= (count || 0)
  );
};

const BUILDING_COSTS = {
  road: { brick: 1, lumber: 1 },
  settlement: { brick: 1, lumber: 1, wool: 1, grain: 1 },
  city: { ore: 3, grain: 2 },
  developmentCard: { ore: 1, wool: 1, grain: 1 }
} as const;

export const gameValidator: GameValidator = {
  canBuildSettlement: (state: GameState, vertexId: number): boolean => {
    const player = state.players[state.currentPlayer];
    const vertex = state.board.vertices.find(v => v.id === vertexId);
    
    if (!vertex) return false;
    if (vertex.building) return false;

    // Check resources unless in setup phase
    if (!state.setupPhase && !hasResources(player.resources, BUILDING_COSTS.settlement)) {
      return false;
    }

    // Check distance rule - no adjacent settlements
    const hasAdjacentSettlement = vertex.adjacentVertices.some(adjId => {
      const adjVertex = state.board.vertices.find(v => v.id === adjId);
      return adjVertex?.building !== undefined;
    });
    if (hasAdjacentSettlement) return false;

    // Check connected to road (except during setup)
    if (!state.setupPhase) {
      const hasConnectedRoad = vertex.adjacentEdges.some(edgeId => {
        const edge = state.board.edges.find(e => e.id === edgeId);
        return edge?.road?.player === state.currentPlayer;
      });
      if (!hasConnectedRoad) return false;
    }

    return true;
  },

  canBuildCity: (state: GameState, vertexId: number): boolean => {
    const player = state.players[state.currentPlayer];
    const vertex = state.board.vertices.find(v => v.id === vertexId);
    
    if (!vertex) return false;
    if (!vertex.building || vertex.building.type !== 'settlement' || vertex.building.player !== state.currentPlayer) {
      return false;
    }

    return hasResources(player.resources, BUILDING_COSTS.city);
  },

  canBuildRoad: (state: GameState, edgeId: number): boolean => {
    const player = state.players[state.currentPlayer];
    const edge = state.board.edges.find(e => e.id === edgeId);
    
    if (!edge || edge.road) return false;

    // Check resources unless in setup phase
    if (!state.setupPhase && !hasResources(player.resources, BUILDING_COSTS.road)) {
      return false;
    }

    // Must connect to existing road or settlement/city (except during setup)
    if (!state.setupPhase) {
      const hasValidConnection = edge.vertices.some(vertexId => {
        const vertex = state.board.vertices.find(v => v.id === vertexId);
        if (vertex?.building?.player === state.currentPlayer) return true;
        
        return vertex?.adjacentEdges.some(adjEdgeId => {
          const adjEdge = state.board.edges.find(e => e.id === adjEdgeId);
          return adjEdge?.road?.player === state.currentPlayer;
        });
      });
      if (!hasValidConnection) return false;
    }

    return true;
  },

  canBuyDevelopmentCard: (state: GameState): boolean => {
    const player = state.players[state.currentPlayer];
    return hasResources(player.resources, BUILDING_COSTS.developmentCard);
  },

  canPlayDevelopmentCard: (state: GameState, cardType: DevelopmentCardType): boolean => {
    const player = state.players[state.currentPlayer];
    const card = player.developmentCards.find(c => c === cardType);
    return !!card && state.phase === 'MAIN';
  },

  canMoveRobber: (state: GameState, hexId: number, targetPlayerId: number): boolean => {
    if (state.phase !== 'ROBBER') return false;
    
    const hex = state.board.hexes.find(h => h.id === hexId);
    if (!hex || hex.hasRobber) return false;

    const targetPlayer = state.players[targetPlayerId];
    return targetPlayer.resources.brick + 
           targetPlayer.resources.lumber + 
           targetPlayer.resources.ore + 
           targetPlayer.resources.grain + 
           targetPlayer.resources.wool > 0;
  },

  canOfferTrade: (state: GameState, give: Partial<Record<ResourceType, number>>, want: Partial<Record<ResourceType, number>>): boolean => {
    const player = state.players[state.currentPlayer];
    return state.phase === 'MAIN' && hasResources(player.resources, give);
  },

  canAcceptTrade: (state: GameState): boolean => {
    if (!state.tradeOffer || state.phase !== 'MAIN') return false;
    const player = state.players[state.currentPlayer];
    return hasResources(player.resources, state.tradeOffer.want);
  },

  canBankTrade: (state: GameState, give: ResourceType[], want: ResourceType): boolean => {
    const player = state.players[state.currentPlayer];
    const ratio = 4; // Default bank trade ratio, could be modified by ports
    return state.phase === 'MAIN' && 
           give.length === ratio && 
           give.every(resource => give[0] === resource) && 
           player.resources[give[0]] >= ratio;
  },

  canEndTurn: (state: GameState): boolean => {
    return state.phase === 'MAIN' || 
           (state.setupPhase && state.board.vertices.some(v => 
             v.building?.player === state.currentPlayer && 
             v.building?.type === 'settlement'
           ));
  }
}; 