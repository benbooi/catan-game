import { GameState, GameAction, GameError } from '../types/gameState';
import { ResourceType } from '../types/game';
// import { getNeighbors } from '../utils/boardLayout'; // Marked as unused

// --- Placeholder Adjacency Functions --- (Assume correct implementation exists elsewhere or will be added)
function getAdjacentVertices(vertexId: number): number[] {
  console.warn('getAdjacentVertices placeholder used', vertexId);
  return [];
}
function getAdjacentEdges(vertexId: number): number[] {
  console.warn('getAdjacentEdges placeholder used', vertexId);
  return [];
}

// --- Main Validation Function ---
export function validateGameAction(state: GameState, action: GameAction): GameError | null {
  const player = state.players[state.currentPlayer];
  if (!player) return { code: 'INVALID_PLAYER', message: 'Player not found' };

  switch (action.type) {
    case 'ROLL_DICE':
      return validateRollDice(state);
    case 'BUILD_SETTLEMENT':
      return validateBuildSettlement(state, player.id, action.vertexId);
    case 'BUILD_CITY':
      return validateBuildCity(state, player.id, action.vertexId);
    case 'BUILD_ROAD':
      return validateBuildRoad(state, player.id, action.edgeId);
    case 'BUY_DEVELOPMENT_CARD':
      return validateBuyDevelopmentCard(state, player.id);
    case 'PLAY_DEVELOPMENT_CARD':
      return validatePlayDevelopmentCard(state, player.id, action.cardIndex);
    case 'TRADE_BANK':
      // Ensure action properties match GameAction definition for TRADE_BANK
      return validateBankTrade(state, player.id, action.give, action.receive);
    case 'TRADE_OFFER':
      // Ensure action properties match GameAction definition for TRADE_OFFER
      return validateTradeOffer(state, player.id, action.offer, action.request);
    case 'TRADE_ACCEPT':
      return validateTradeAccept(state, player.id);
    case 'TRADE_REJECT':
      // Rejecting usually only needs phase check if an offer exists
      if (state.phase !== 'MAIN') return { code: 'INVALID_PHASE', message: 'Cannot reject trade outside MAIN phase.' };
      if (!state.tradeOffer) return { code: 'INVALID_ACTION', message: 'No trade offer to reject.' };
      return null;
    case 'MOVE_ROBBER':
      return validateMoveRobber(state, action.hexId, action.targetPlayerId);
    case 'END_TURN':
      return validateEndTurn(state);
    default:
       // Exhaustiveness check
       // const _exhaustiveCheck: never = action;
      return { code: 'INVALID_ACTION', message: 'Unknown action type' };
  }
}

// --- Individual Validation Functions (Reviewing for errors from log) ---

function validateRollDice(state: GameState): GameError | null {
  if (state.phase !== 'ROLL') {
    return { code: 'INVALID_PHASE', message: 'Cannot roll dice outside of the ROLL phase.' };
  }
  // Assuming GameState has a diceRolled boolean or similar
  if (state.diceRolled) { // Check if property exists
    return { code: 'INVALID_ACTION', message: 'Dice already rolled this turn.' };
  }
  return null;
}

function validateBuildSettlement(state: GameState, playerId: string, vertexId: number): GameError | null {
  // Allow building in MAIN or SETUP phase
  if (state.phase !== 'MAIN' && !state.setupPhase) {
    return { code: 'INVALID_PHASE', message: 'Cannot build settlement during this phase.' };
  }

  const player = state.players[playerId];
  const vertex = state.board.vertices[vertexId];

  if (!vertex) {
    return { code: 'INVALID_LOCATION', message: 'Invalid vertex ID.' };
  }
  if (vertex.building) {
    return { code: 'INVALID_LOCATION', message: 'Vertex is already occupied.' };
  }

  // Distance Rule: Check adjacent vertices
  const adjacentVertices = getAdjacentVertices(vertexId);
  for (const adjVertexId of adjacentVertices) {
    // Check if adjacent vertex exists before accessing building
    const adjVertex = state.board.vertices[adjVertexId];
    if (adjVertex?.building) {
      return { code: 'INVALID_LOCATION', message: 'Too close to another settlement (distance rule).' };
    }
  }

  // Connection and Resource Rules depend on phase
  if (state.setupPhase) {
      // Setup specific rules (e.g., connecting to initial road on round 2)
      // Needs details from setupPhase structure (e.g., state.setupPhase.round, state.setupPhase.roadEdgeId)
       if (state.setupPhase.round === 2) {
           const placedRoadEdge = state.board.edges[state.setupPhase.roadEdgeId!]; // Use non-null assertion if sure it exists
           if (!placedRoadEdge || !placedRoadEdge.vertices.includes(vertexId)) {
               return { code: 'INVALID_LOCATION', message: 'Second settlement must connect to the first placed road.' };
           }
       } // Else (round 1), no connection needed
       // No resource cost in setup
  } else {
      // MAIN Phase Rules
      // Connection Rule: Must connect to own road
      const isConnected = getAdjacentEdges(vertexId).some(edgeId => {
           const edge = state.board.edges[edgeId];
           return edge?.road?.playerId === playerId;
       });
      if (!isConnected) {
          return { code: 'INVALID_LOCATION', message: 'Settlement must connect to one of your roads.' };
      }
      // Resource Check
      const cost: Partial<Record<ResourceType, number>> = { wood: 1, brick: 1, wool: 1, grain: 1 };
      if (!hasEnoughResources(player.resources, cost)) {
          return { code: 'INSUFFICIENT_RESOURCES', message: 'Insufficient resources to build settlement.' };
      }
  }

  // Check settlement limit (assuming max 5 settlements, 4 cities)
  const settlementCount = Object.values(state.board.vertices).filter(v => v.building?.playerId === playerId && v.building.type === 'settlement').length;
  // Consider city count if there's a combined limit
  if (settlementCount >= 5) {
     return { code: 'LIMIT_REACHED', message: 'Maximum number of settlements reached.' };
  }

  return null;
}

function validateBuildCity(state: GameState, playerId: string, vertexId: number): GameError | null {
  if (state.phase !== 'MAIN') {
    return { code: 'INVALID_PHASE', message: 'Cannot build city during this phase.' };
  }

  const player = state.players[playerId];
  const vertex = state.board.vertices[vertexId];

  if (!vertex?.building || vertex.building.type !== 'settlement' || vertex.building.playerId !== playerId) {
    return { code: 'INVALID_LOCATION', message: 'Must upgrade one of your own settlements.' };
  }

  const cost: Partial<Record<ResourceType, number>> = { grain: 2, ore: 3 };
  if (!hasEnoughResources(player.resources, cost)) {
    return { code: 'INSUFFICIENT_RESOURCES', message: 'Insufficient resources to build city.' };
  }

  // Check city limit (e.g., max 4 cities)
  const cityCount = Object.values(state.board.vertices).filter(v => v.building?.playerId === playerId && v.building.type === 'city').length;
  if (cityCount >= 4) {
     return { code: 'LIMIT_REACHED', message: 'Maximum number of cities reached.' };
  }

  return null;
}

function validateBuildRoad(state: GameState, playerId: string, edgeId: number): GameError | null {
  if (state.phase !== 'MAIN' && !state.setupPhase) {
    return { code: 'INVALID_PHASE', message: 'Cannot build road during this phase.' };
  }

  const player = state.players[playerId];
  const edge = state.board.edges[edgeId];

  if (!edge) {
      return { code: 'INVALID_LOCATION', message: 'Invalid edge ID.' };
  }
  if (edge.road) {
    return { code: 'INVALID_LOCATION', message: 'Edge is already occupied by a road.' };
  }

  // Connection Rule depends on phase
   if (state.setupPhase) {
       // Must connect to settlement placed this turn
       const settlementVertexId = state.setupPhase.settlementVertexId;
       if (settlementVertexId === undefined || !edge.vertices.includes(settlementVertexId)) {
           return { code: 'INVALID_LOCATION', message: 'Setup road must connect to the settlement placed this turn.' };
       }
       // No resource cost
   } else {
       // MAIN Phase Connection Rule: Must connect to own existing road, settlement, or city
       const [v1, v2] = edge.vertices;
       const isConnected = (
           state.board.vertices[v1]?.building?.playerId === playerId ||
           state.board.vertices[v2]?.building?.playerId === playerId ||
           getAdjacentEdges(v1).some(adjEdgeId => state.board.edges[adjEdgeId]?.road?.playerId === playerId) || // Check adj edges at v1
           getAdjacentEdges(v2).some(adjEdgeId => state.board.edges[adjEdgeId]?.road?.playerId === playerId)    // Check adj edges at v2
       );
       if (!isConnected) {
           return { code: 'INVALID_LOCATION', message: 'Road must connect to one of your existing roads, settlements, or cities.' };
       }
       // Resource Check
       const cost: Partial<Record<ResourceType, number>> = { wood: 1, brick: 1 };
       if (!hasEnoughResources(player.resources, cost)) {
           return { code: 'INSUFFICIENT_RESOURCES', message: 'Insufficient resources to build road.' };
       }
   }

   // Check road limit (e.g., max 15 roads)
   const roadCount = Object.values(state.board.edges).filter(e => e.road?.playerId === playerId).length;
   if (roadCount >= 15) {
      return { code: 'LIMIT_REACHED', message: 'Maximum number of roads reached.' };
   }

  return null;
}

function validateBuyDevelopmentCard(state: GameState, playerId: string): GameError | null {
  if (state.phase !== 'MAIN') {
    return { code: 'INVALID_PHASE', message: 'Cannot buy development card during this phase.' };
  }

  const player = state.players[playerId];
  const cost: Partial<Record<ResourceType, number>> = { ore: 1, wool: 1, grain: 1 };

  if (!hasEnoughResources(player.resources, cost)) {
    return { code: 'INSUFFICIENT_RESOURCES', message: 'Insufficient resources to buy development card.' };
  }

  // Check if deck exists and is not empty
  if (!state.developmentCardDeck || state.developmentCardDeck.length === 0) {
      return { code: 'INVALID_ACTION', message: 'No more development cards available in the deck.' };
  }

  return null;
}

function validatePlayDevelopmentCard(state: GameState, playerId: string, cardIndex: number): GameError | null {
  if (state.phase !== 'MAIN') {
    return { code: 'INVALID_PHASE', message: 'Cannot play development card during this phase.' };
  }

  const player = state.players[playerId];
  const card = player.developmentCards?.[cardIndex]; // Use optional chaining

  if (!card) {
    return { code: 'INVALID_ACTION', message: 'Invalid development card index.' };
  }
  if (card.used) {
    return { code: 'INVALID_ACTION', message: 'Development card has already been used.' };
  }
  // VP cards are revealed at the end, not actively played
  if (card.type === 'victoryPoint') {
      return { code: 'INVALID_ACTION', message: 'Victory Point cards cannot be played.' };
  }
  // Cannot play non-VP card purchased this turn
  if (card.turnPurchased === state.turnNumber) {
      return { code: 'INVALID_ACTION', message: 'Cannot play a development card on the same turn it was purchased.' };
  }
  // Cannot play more than one non-VP card per turn
  // Assuming state.playedDevelopmentCard tracks this
  if (state.playedDevelopmentCard) { 
      return { code: 'INVALID_ACTION', message: 'Only one development card can be played per turn.' };
  }

  // Specific card conditions (optional)
  // e.g., if (card.type === 'knight' && !state.mustMoveRobber) { /* potentially invalid */ }

  return null;
}

function validateBankTrade(
  state: GameState,
  playerId: string,
  give: ResourceType,
  receive: ResourceType
): GameError | null {
  if (state.phase !== 'MAIN') {
    return { code: 'INVALID_PHASE', message: 'Cannot trade with the bank during this phase.' };
  }

  const player = state.players[playerId];
  const tradeRatio = getTradeRatio(state, playerId, give); // Get player-specific ratio

  const cost: Partial<Record<ResourceType, number>> = { [give]: tradeRatio };
  if (!hasEnoughResources(player.resources, cost)) {
    return { code: 'INSUFFICIENT_RESOURCES', message: `Insufficient ${give} to trade (Need ${tradeRatio}).` };
  }

  // Prevent trading for the same resource
  if (give === receive) {
      return { code: 'INVALID_TRADE', message: 'Cannot trade for the same resource type.' };
  }

  // Ensure 'receive' is a valid ResourceType key (should be guaranteed by TS types)
  if (!(receive in player.resources)) { // Basic check
       return { code: 'INVALID_TRADE', message: 'Invalid resource type requested from bank.' };
  }

  return null;
}

function validateTradeOffer(
  state: GameState,
  playerId: string, // The player making the offer
  offer: Partial<Record<ResourceType, number>>,
  request: Partial<Record<ResourceType, number>>
): GameError | null {
  if (state.phase !== 'MAIN') {
    return { code: 'INVALID_PHASE', message: 'Cannot offer trade during this phase.' };
  }

  if (state.tradeOffer) {
       return { code: 'INVALID_ACTION', message: 'Another trade offer is already active.' };
  }

  const offeringPlayer = state.players[playerId];

  // Validate offer amounts (must be non-negative integers)
  let offerAmount = 0;
  for (const resourceKey in offer) {
      const resource = resourceKey as ResourceType;
      const amount = offer[resource];
      if (amount === undefined) continue; // Skip if not offered
      if (amount < 0 || !Number.isInteger(amount)) return { code: 'INVALID_TRADE', message: `Invalid offer amount for ${resource}.` };
      // Check player has enough
      if (offeringPlayer.resources[resource] < amount) {
          return { code: 'INSUFFICIENT_RESOURCES', message: `Insufficient ${resource} to offer.` };
      }
      offerAmount += amount;
  }

  // Validate request amounts (must be non-negative integers)
  let requestAmount = 0;
  for (const resourceKey in request) {
      const resource = resourceKey as ResourceType;
      const amount = request[resource];
       if (amount === undefined) continue; // Skip if not requested
      if (amount < 0 || !Number.isInteger(amount)) return { code: 'INVALID_TRADE', message: `Invalid request amount for ${resource}.` };
      requestAmount += amount;
  }

  // Trade must involve at least one resource
  if (offerAmount === 0 && requestAmount === 0) {
      return { code: 'INVALID_TRADE', message: 'Trade offer cannot be empty.' };
  }

  return null;
}

function validateTradeAccept(state: GameState, acceptingPlayerId: string): GameError | null {
  if (state.phase !== 'MAIN') {
    return { code: 'INVALID_PHASE', message: 'Cannot accept trade during this phase.' };
  }

  if (!state.tradeOffer) {
    return { code: 'INVALID_TRADE', message: 'No active trade offer to accept.' };
  }

  // Cannot accept own offer
  if (state.tradeOffer.playerId === acceptingPlayerId) {
      return { code: 'INVALID_ACTION', message: 'Cannot accept your own trade offer.' };
  }

  const acceptingPlayer = state.players[acceptingPlayerId];
  const offeringPlayer = state.players[state.tradeOffer.playerId];
  const { offer, request } = state.tradeOffer;

  // Check if accepting player exists and has the requested resources
  if (!acceptingPlayer) return { code: 'INVALID_PLAYER', message: 'Accepting player not found.' };
  if (!hasEnoughResources(acceptingPlayer.resources, request)) {
    return { code: 'INSUFFICIENT_RESOURCES', message: `You lack the resources requested in the trade.` };
  }

  // Check if offering player *still* exists and has the offered resources
  if (!offeringPlayer) return { code: 'INVALID_PLAYER', message: 'Offering player not found.' };
  if (!hasEnoughResources(offeringPlayer.resources, offer)) {
       return { code: 'INVALID_TRADE', message: 'The offering player no longer has the resources for this trade.' };
   }

  return null;
}

function validateMoveRobber(
  state: GameState,
  hexId: number,
  targetPlayerId?: string // Player to steal from (optional)
): GameError | null {
  // Check phase (Robber moved after 7 or by Knight)
  let isKnightMove = false;
  if (state.phase === 'MAIN') {
      // Check if a Knight was just played (needs state tracking like state.playedDevCardType === 'knight')
      // If not tracked, this validation might be too simple here.
      // Let's assume for now the game logic ensures this call is valid in MAIN phase.
      isKnightMove = true; // Tentative assumption
  } else if (state.phase !== 'ROBBER') {
       return { code: 'INVALID_PHASE', message: 'Cannot move robber now.' };
  }

  const targetHex = state.board.hexes[hexId];
  // Cannot place on desert or invalid hex index
  if (!targetHex || targetHex.type === 'desert') {
      return { code: 'INVALID_LOCATION', message: 'Invalid hex selected for robber (cannot be desert).' };
  }

  // Must move to a *different* hex
  if (hexId === state.board.robber.hexId) {
    return { code: 'INVALID_LOCATION', message: 'Robber must be moved to a different hex.' };
  }

  // Determine players adjacent to the target hex with resources, excluding self
  const potentialTargets = new Set<string>();
  targetHex.vertices.forEach(vertexId => {
      const buildingPlayerId = state.board.vertices[vertexId]?.building?.playerId;
      if (buildingPlayerId && buildingPlayerId !== state.currentPlayer) {
          const player = state.players[buildingPlayerId];
          // Check if player exists and has any resources
          if (player && Object.values(player.resources).some(count => count > 0)) {
              potentialTargets.add(buildingPlayerId);
          }
      }
  });

  // Validate target player selection
  if (targetPlayerId) {
    // Cannot steal from self
    if (targetPlayerId === state.currentPlayer) {
        return { code: 'INVALID_TARGET', message: 'Cannot steal from yourself.' };
    }
    // Target must exist
    if (!state.players[targetPlayerId]) {
        return { code: 'INVALID_TARGET', message: 'Target player does not exist.' };
    }
    // Target must be adjacent and have resources
    if (!potentialTargets.has(targetPlayerId)) {
      return { code: 'INVALID_TARGET', message: 'Target player is not adjacent to this hex or has no resources.' };
    }
    // Target is valid
  } else {
    // No target specified - this is only valid if there are NO potential targets
    if (potentialTargets.size > 0) {
      return { code: 'MISSING_TARGET', message: 'Must select a player to steal from on this hex.' };
    }
    // No target specified and no potential targets - valid move (place robber without stealing)
  }

  return null;
}

function validateEndTurn(state: GameState): GameError | null {
    // Can only end turn in MAIN phase
    if (state.phase !== 'MAIN') {
        return { code: 'INVALID_PHASE', message: 'Cannot end turn outside of the MAIN phase.' };
    }

    // If mustMoveRobber flag is set (e.g., after rolling 7), it must be done
    // Assuming state.mustMoveRobber exists and is boolean
    if (state.mustMoveRobber) {
        return { code: 'ACTION_REQUIRED', message: 'You must move the robber before ending your turn.' };
    }

    // Check if dice were rolled if it's not the setup phase
    // Assuming state.diceRolled exists and setupPhase is handled
    if (!state.setupPhase && !state.diceRolled) {
        // This might be too strict depending on allowed actions before rolling.
        // Comment out if actions like playing dev card before roll are allowed.
        // return { code: 'ACTION_REQUIRED', message: 'You must roll the dice before ending your turn.' };
    }

    // Check if trade offer needs resolution (optional rule)
    if (state.tradeOffer) {
        // return { code: 'ACTION_REQUIRED', message: 'Active trade offer must be resolved.' };
    }

    return null;
}

// --- Helper Functions ---

// Helper to get trade ratio, considering ports
function getTradeRatio(state: GameState, playerId: string, resource: ResourceType): number {
  let minRatio = 4; // Default bank ratio
  const player = state.players[playerId];
  if (!player) return minRatio; // Should not happen if called after player validation

  // Find vertices occupied by the player
  const playerVertices = Object.keys(state.board.vertices)
      .map(Number) // Convert keys to numbers
      .filter(vertexId => state.board.vertices[vertexId]?.building?.playerId === playerId);

  // Check ports connected to these vertices
  // Use optional chaining for ports array
  state.board.ports?.forEach(port => {
      // Check if any of the player's vertices are part of this port's vertices
      if (port.vertices.some(portVertexId => playerVertices.includes(portVertexId))) {
          // Check if port is generic or specific to the resource being traded
          if (port.type === 'generic' || port.type === resource) {
              minRatio = Math.min(minRatio, port.ratio);
          }
      }
  });

  return minRatio;
}

// Helper to check resource availability
function hasEnoughResources(
    playerResources: Record<ResourceType, number>,
    cost: Partial<Record<ResourceType, number>>
): boolean {
    for (const resourceKey in cost) {
        const resource = resourceKey as ResourceType;
        const requiredAmount = cost[resource];
        // Ensure required amount is a positive number
        if (requiredAmount !== undefined && requiredAmount > 0) {
             // Check if player has the resource and enough of it
            if (!(resource in playerResources) || playerResources[resource] < requiredAmount) {
                return false;
            }
        }
    }
    return true;
}

export const gameValidator = {
  canRollDice: (state: GameState): boolean => {
    return state.phase === 'ROLL';
  },

  canBuildSettlement: (state: GameState, vertexId: number): boolean => {
    const vertex = state.board.vertices[vertexId];
    if (!vertex) return false;

    // Check if vertex is already occupied
    if (vertex.building) return false;

    // Check if adjacent vertices are occupied
    const hasAdjacentSettlement = getAdjacentVertices(vertexId).some(adjId => {
      const adjVertex = state.board.vertices[adjId];
      return adjVertex?.building !== undefined;
    });
    if (hasAdjacentSettlement) return false;

    // In setup phase, check if player has a connected road
    if (state.setupPhase) {
      const hasConnectedRoad = getAdjacentEdges(vertexId).some(edgeId => {
        const edge = state.board.edges[edgeId];
        return edge?.road?.playerId === state.currentPlayer;
      });
      if (!hasConnectedRoad) return false;
    }

    // Check if player has enough resources
    const player = state.players[state.currentPlayer];
    if (!player) return false;
    return (
      player.resources.wood >= 1 &&
      player.resources.brick >= 1 &&
      player.resources.grain >= 1 &&
      player.resources.wool >= 1
    );
  },

  canBuildCity: (state: GameState, vertexId: number): boolean => {
    const vertex = state.board.vertices[vertexId];
    if (!vertex || !vertex.building || vertex.building.type !== 'settlement') return false;
    if (vertex.building.playerId !== state.currentPlayer) return false;

    const player = state.players[state.currentPlayer];
    if (!player) return false;
    return player.resources.ore >= 3 && player.resources.grain >= 2;
  },

  canBuildRoad: (state: GameState, edgeId: number): boolean => {
    const edge = state.board.edges[edgeId];
    if (!edge || edge.road) return false;

    // Check if player has enough resources
    const player = state.players[state.currentPlayer];
    if (!player) return false;
    if (player.resources.wood < 1 || player.resources.brick < 1) return false;

    // Check if road connects to existing road or settlement
    const hasValidConnection = edge.vertices.some(vertexId => {
      const vertex = state.board.vertices[vertexId];
      if (!vertex) return false;

      // Check if vertex has player's settlement
      if (vertex.building?.playerId === state.currentPlayer) return true;

      // Check if vertex has player's road
      return getAdjacentEdges(vertexId).some(adjEdgeId => {
        const adjEdge = state.board.edges[adjEdgeId];
        return adjEdge?.road?.playerId === state.currentPlayer;
      });
    });

    return hasValidConnection;
  },

  canBuyDevelopmentCard: (state: GameState): boolean => {
    const player = state.players[state.currentPlayer];
    if (!player) return false;
    return (
      player.resources.ore >= 1 &&
      player.resources.grain >= 1 &&
      player.resources.wool >= 1
    );
  },

  canPlayDevelopmentCard: (state: GameState, cardType: string): boolean => {
    const player = state.players[state.currentPlayer];
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

  canBankTrade: (state: GameState, give: ResourceType): boolean => {
    const player = state.players[state.currentPlayer];
    if (!player) return false;
    return player.resources[give] >= 1;
  },

  canOfferTrade: (state: GameState, give: Partial<Record<ResourceType, number>>): boolean => {
    const player = state.players[state.currentPlayer];
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
    const hex = state.board.hexes[hexId];
    if (!hex) return false;

    // Check if target player has resources
    const targetPlayer = state.players[targetPlayerId];
    if (!targetPlayer) return false;

    return Object.values(targetPlayer.resources).some(count => count > 0);
  },

  canEndTurn: (state: GameState): boolean => {
    return state.phase === 'MAIN';
  }
}; 