import { GameState, GameAction /*, GameError */ } from '../types/gameState'; // Removed unused GameError
import { Player, ResourceType /*, DevelopmentCardType */ } from '../types/game'; // Removed unused DevelopmentCardType
import { gameValidator } from '../validators/gameValidator';

// --- Helper Functions (potentially move to utils) ---

function distributeResources(state: GameState, diceRoll: number): GameState {
  if (diceRoll === 7) {
    // Robber activation - handled separately or by setting mustMoveRobber flag
    return { ...state, mustMoveRobber: true }; 
  }

  const players = [...state.players];

  state.board.hexes.forEach(hex => {
    if (hex.number === diceRoll && hex.id !== state.board.robber.hexId) {
      hex.vertices.forEach(vertexId => {
        const vertex = state.board.vertices[vertexId];
        if (vertex?.building) {
          const playerId = vertex.building.playerId;
          const playerIndex = players.findIndex(p => p.id === playerId);
          
          if (playerIndex !== -1 && hex.type !== 'desert') {
            const player = players[playerIndex];
            const resourceCount = vertex.building.type === 'city' ? 2 : 1;
            // Ensure resource key exists before incrementing
            if (hex.type in player.resources) {
                 players[playerIndex] = {
                   ...player,
                   resources: {
                     ...player.resources,
                     [hex.type]: (player.resources[hex.type as ResourceType] || 0) + resourceCount,
                   },
                 };
            }
          }
        }
      });
    }
  });

  return { ...state, players };
}

function applyRobberDiscard(state: GameState, discards: Record<string, Partial<Record<ResourceType, number>>>): GameState {
    const players = [...state.players];
    
    for (const playerId in discards) {
        const playerIndex = players.findIndex(p => p.id === playerId);
        if (playerIndex !== -1) {
            const player = players[playerIndex];
            const playerDiscards = discards[playerId];
            const newResources = { ...player.resources };
            
            for (const resourceKey in playerDiscards) {
                const resource = resourceKey as ResourceType;
                const amount = playerDiscards[resource];
                if (amount !== undefined && newResources[resource] !== undefined) {
                    newResources[resource] = Math.max(0, newResources[resource] - amount);
                }
            }
            
            players[playerIndex] = { ...player, resources: newResources };
        }
    }
    
    return { ...state, players, phase: 'MAIN' }; // Move to MAIN after discard
}

function applyRobberMove(state: GameState, hexId: number, targetPlayerId?: string): GameState {
  let players = [...state.players];
  const currentPlayerId = state.currentPlayer;

  // Steal resource if a target is chosen and valid
  if (targetPlayerId && targetPlayerId !== currentPlayerId) {
    const targetPlayerIndex = players.findIndex(p => p.id === targetPlayerId);
    const currentPlayerIndex = players.findIndex(p => p.id === currentPlayerId);
    
    if (targetPlayerIndex !== -1 && currentPlayerIndex !== -1) {
        const targetPlayer = players[targetPlayerIndex];
        const currentPlayer = players[currentPlayerIndex];
        
        const availableResources = Object.entries(targetPlayer.resources)
            .filter(([_, count]) => count > 0)
            .map(([resource, _]) => resource as ResourceType);

        if (availableResources.length > 0) {
            const stolenResource = availableResources[Math.floor(Math.random() * availableResources.length)];
            
            const newTargetResources = {
                 ...targetPlayer.resources,
                 [stolenResource]: targetPlayer.resources[stolenResource] - 1,
            };
            const newCurrentResources = {
                ...currentPlayer.resources,
                [stolenResource]: (currentPlayer.resources[stolenResource] || 0) + 1,
            };

            players[targetPlayerIndex] = { ...targetPlayer, resources: newTargetResources };
            players[currentPlayerIndex] = { ...currentPlayer, resources: newCurrentResources };
        }
    }
  }

  return {
    ...state,
    players,
    board: { ...state.board, robber: { hexId: hexId } },
    mustMoveRobber: false, // Robber has been moved
  };
}

function nextPlayer(state: GameState): string {
    const playerIds = state.players.map(p => p.id);
    const currentIndex = playerIds.indexOf(state.currentPlayer);
    const nextIndex = (currentIndex + 1) % playerIds.length;
    return playerIds[nextIndex];
}

// --- Main Reducer --- 

export function gameReducer(state: GameState, action: GameAction): GameState {
  // Always return a new state object, don't mutate the original state
  switch (action.type) {
    case 'ROLL_DICE': {
      const dice1 = Math.floor(Math.random() * 6) + 1;
      const dice2 = Math.floor(Math.random() * 6) + 1;
      const roll = dice1 + dice2;
      const newState = {
        ...state,
        diceRoll: roll,
        diceRolled: true,
        phase: roll === 7 ? 'ROBBER' : 'MAIN', // Move to ROBBER on 7, else MAIN
        mustMoveRobber: roll === 7, // Set flag if 7 rolled
      };
      // Only distribute resources if not a 7
      return roll === 7 ? newState : distributeResources(newState, roll);
    }

     case 'MOVE_ROBBER': {
        // Assuming validation happened before dispatch
        // Stealing logic is handled within applyRobberMove
        return applyRobberMove(state, action.hexId, action.targetPlayerId);
    }

    case 'DISCARD_CARDS': {
        // Action should contain player discards: action.discards
        return applyRobberDiscard(state, action.discards);
    }

    case 'BUILD_SETTLEMENT': {
      const playerIndex = state.players.findIndex(p => p.id === state.currentPlayer);
      if (playerIndex === -1) return state;
      
      const player = state.players[playerIndex];
      const cost = { wood: 1, brick: 1, wool: 1, grain: 1 };
      const newResources = { ...player.resources };
      let canAfford = true;

      if (!state.setupPhase) { // No cost during setup
          for (const resourceKey in cost) {
              const resource = resourceKey as ResourceType;
              const amount = cost[resource as keyof typeof cost];
              if (newResources[resource] < amount) {
                  canAfford = false; // Should be caught by validation, but double-check
                  break;
              }
              newResources[resource] -= amount;
          }
      }
      
      if (!canAfford && !state.setupPhase) return state; // Should not happen if validated

      const vertex = state.board.vertices[action.vertexId];
      if (!vertex || vertex.building) return state; // Invalid location

      const newVertex = {
          ...vertex,
          building: { type: 'settlement', playerId: state.currentPlayer },
      };

      // Update setup phase state if applicable
      let nextSetupPhase = state.setupPhase;
      if (state.setupPhase) {
          nextSetupPhase = {
               ...state.setupPhase,
               settlementsPlaced: (state.setupPhase.settlementsPlaced || 0) + 1,
               // Store the vertex for the road placement
               settlementVertexId: action.vertexId 
          };
      }

      const updatedPlayers = [...state.players];
      updatedPlayers[playerIndex] = { ...player, resources: newResources };

      return {
        ...state,
        players: updatedPlayers,
        board: {
          ...state.board,
          vertices: {
            ...state.board.vertices,
            [action.vertexId]: newVertex,
          },
        },
        setupPhase: nextSetupPhase,
        // After placing settlement in setup, move to road placement step
        phase: state.setupPhase ? 'SETUP' : state.phase, 
      };
    }

    case 'BUILD_CITY': {
      const playerIndex = state.players.findIndex(p => p.id === state.currentPlayer);
      if (playerIndex === -1) return state;
      
      const player = state.players[playerIndex];
      const cost = { grain: 2, ore: 3 };
      const newResources = { ...player.resources };
      let canAfford = true;

       for (const resourceKey in cost) {
            const resource = resourceKey as ResourceType;
            const amount = cost[resource as keyof typeof cost];
            if (newResources[resource] < amount) {
                canAfford = false;
                break;
            }
            newResources[resource] -= amount;
        }
        
      if (!canAfford) return state; // Validation should prevent this

      const vertex = state.board.vertices[action.vertexId];
      // Must be upgrading own settlement
      if (!vertex?.building || vertex.building.type !== 'settlement' || vertex.building.playerId !== state.currentPlayer) {
        return state;
      }

      const newVertex = {
          ...vertex,
          building: { ...vertex.building, type: 'city' },
      };

      const updatedPlayers = [...state.players];
      updatedPlayers[playerIndex] = { ...player, resources: newResources };

      return {
        ...state,
        players: updatedPlayers,
        board: {
          ...state.board,
          vertices: {
            ...state.board.vertices,
            [action.vertexId]: newVertex,
          },
        },
      };
    }

    case 'BUILD_ROAD': {
      const playerIndex = state.players.findIndex(p => p.id === state.currentPlayer);
      if (playerIndex === -1) return state;
      
      const player = state.players[playerIndex];
      const cost = { wood: 1, brick: 1 };
      const newResources = { ...player.resources };
      let canAfford = true;

      if (!state.setupPhase) { // No cost during setup
            for (const resourceKey in cost) {
                const resource = resourceKey as ResourceType;
                const amount = cost[resource as keyof typeof cost];
                if (newResources[resource] < amount) {
                    canAfford = false;
                    break;
                }
                newResources[resource] -= amount;
            }
      }
      
      if (!canAfford && !state.setupPhase) return state; // Validation should prevent

      const edge = state.board.edges[action.edgeId];
      if (!edge || edge.road) return state; // Invalid location

      const newEdge = {
        ...edge,
        road: { playerId: state.currentPlayer },
      };
      
      // Update setup phase state if applicable
      let nextSetupPhase = state.setupPhase;
      let nextPhase = state.phase;
      if (state.setupPhase) {
          nextSetupPhase = {
               ...state.setupPhase,
               roadsPlaced: (state.setupPhase.roadsPlaced || 0) + 1,
               roadEdgeId: action.edgeId // Store road placed
          };
          // Determine if setup round/phase ends
          const numPlayers = state.players.length;
          if (nextSetupPhase.round === 1 && nextSetupPhase.roadsPlaced === numPlayers) {
              // End of first round, reverse direction
              nextSetupPhase = { ...nextSetupPhase, round: 2, direction: 'backward', settlementsPlaced: 0, roadsPlaced: 0 };
              // Player order reversal happens in END_TURN logic during setup?
          } else if (nextSetupPhase.round === 2 && nextSetupPhase.roadsPlaced === numPlayers) {
              // End of setup phase
              nextSetupPhase = undefined; // Clear setupPhase object
              nextPhase = 'ROLL'; // Move to ROLL phase for the first player of round 2 start?
          }
      }

      const updatedPlayers = [...state.players];
      updatedPlayers[playerIndex] = { ...player, resources: newResources };

      // Note: Longest road calculation happens in the store after the reducer

      return {
        ...state,
        players: updatedPlayers,
        board: {
          ...state.board,
          edges: {
            ...state.board.edges,
            [action.edgeId]: newEdge,
          },
        },
        setupPhase: nextSetupPhase,
        phase: nextPhase, // Update phase if setup ended
      };
    }

    case 'BUY_DEVELOPMENT_CARD': {
        const playerIndex = state.players.findIndex(p => p.id === state.currentPlayer);
        if (playerIndex === -1) return state;
        
        const player = state.players[playerIndex];
        const cost = { ore: 1, wool: 1, grain: 1 };
        const newResources = { ...player.resources };
        let canAfford = true;

        for (const resourceKey in cost) {
            const resource = resourceKey as ResourceType;
            const amount = cost[resource as keyof typeof cost];
            if (newResources[resource] < amount) {
                canAfford = false;
                break;
            }
            newResources[resource] -= amount;
        }

        if (!canAfford) return state;
        if (!state.developmentCardDeck || state.developmentCardDeck.length === 0) return state; // Should be validated

        const remainingDeck = [...state.developmentCardDeck];
        // Consider shuffling deck initially in the store
        const drawnCard = remainingDeck.pop(); // Take from the end (or beginning)

        if (!drawnCard) return state; // Should not happen if length > 0

        const newCard = { 
             ...drawnCard, 
             turnPurchased: state.turnNumber, // Record turn bought
             used: false // Mark as unused initially
        };
        const newDevCards = [...player.developmentCards, newCard];

        const updatedPlayers = [...state.players];
        updatedPlayers[playerIndex] = {
            ...player,
            resources: newResources,
            developmentCards: newDevCards
        };

        return {
             ...state,
             players: updatedPlayers,
             developmentCardDeck: remainingDeck,
        };
    }

    case 'PLAY_DEVELOPMENT_CARD': { 
        const playerIndex = state.players.findIndex(p => p.id === state.currentPlayer);
        if (playerIndex === -1) return state;
        
        const player = state.players[playerIndex];
        const card = player.developmentCards?.[action.cardIndex];

        // Validation should prevent playing invalid/used/wrong turn cards
        if (!card || card.used || card.turnPurchased === state.turnNumber || card.type === 'victoryPoint') {
             return state;
        }

        const newDevCards = [...player.developmentCards];
        newDevCards[action.cardIndex] = { ...card, used: true };

        const updatedPlayers = [...state.players];
        updatedPlayers[playerIndex] = {
            ...player, 
            developmentCards: newDevCards
        };

        let nextState = { 
            ...state, 
            players: updatedPlayers,
            playedDevelopmentCard: true, // Mark that a card was played this turn
        };

        // Apply card effects (Knight, Road Building, Year of Plenty, Monopoly)
        switch (card.type) {
            case 'knight':
                 // Update knights played count for Largest Army calculation
                const updatedPlayer = { ...nextState.players[playerIndex], knightsPlayed: (player.knightsPlayed || 0) + 1 };
                const knightPlayers = [...nextState.players];
                knightPlayers[playerIndex] = updatedPlayer;
                
                nextState = {
                     ...nextState, 
                     players: knightPlayers,
                     mustMoveRobber: true, // Player must now move the robber
                     phase: 'ROBBER' // Or handle within MAIN phase logic?
                };
                break;
                
            case 'roadBuilding':
                // Allow player to build 2 roads for free - could be handled via UI state
                // Here we could just set a flag for the UI to allow 2 free road placements
                break;
                
            case 'yearOfPlenty':
                // Player takes 2 resource cards of their choice
                if (action.resources && action.resources.length <= 2) {
                    const chosenResources = action.resources;
                    const updatedPlayerIndex = nextState.players.findIndex(p => p.id === state.currentPlayer);
                    const resourcesToAdd = { ...nextState.players[updatedPlayerIndex].resources };
                    chosenResources.forEach(res => {
                        resourcesToAdd[res] = (resourcesToAdd[res] || 0) + 1;
                    });
                    
                    const yearOfPlentyPlayers = [...nextState.players];
                    const updatedPlayerWithResources = { 
                        ...nextState.players[updatedPlayerIndex], 
                        resources: resourcesToAdd 
                    };
                    yearOfPlentyPlayers[updatedPlayerIndex] = updatedPlayerWithResources;
                    
                    nextState = { ...nextState, players: yearOfPlentyPlayers };
                }
                break;
                
            case 'monopoly':
                // Player takes all resources of one type from all other players
                if (action.resource) {
                    const monopolizedResource = action.resource;
                    const updatedPlayers = [...nextState.players];
                    let totalStolen = 0;
                    
                    // Take resources from all other players
                    for (let i = 0; i < updatedPlayers.length; i++) {
                        if (updatedPlayers[i].id !== state.currentPlayer) {
                            const targetPlayer = updatedPlayers[i];
                            const amount = targetPlayer.resources[monopolizedResource] || 0;
                            if (amount > 0) {
                                totalStolen += amount;
                                updatedPlayers[i] = {
                                    ...targetPlayer,
                                    resources: {
                                        ...targetPlayer.resources,
                                        [monopolizedResource]: 0
                                    }
                                };
                            }
                        }
                    }
                    
                    // Add the stolen resources to the current player
                    const currentPlayerIndex = updatedPlayers.findIndex(p => p.id === state.currentPlayer);
                    const currentPlayerResources = { ...updatedPlayers[currentPlayerIndex].resources };
                    currentPlayerResources[monopolizedResource] = (currentPlayerResources[monopolizedResource] || 0) + totalStolen;
                    updatedPlayers[currentPlayerIndex] = { 
                        ...updatedPlayers[currentPlayerIndex], 
                        resources: currentPlayerResources 
                    };
                    
                    nextState = { ...nextState, players: updatedPlayers };
                }
                break;
        }
        
        return nextState;
    }

    case 'TRADE_BANK': {
        const playerIndex = state.players.findIndex(p => p.id === state.currentPlayer);
        if (playerIndex === -1) return state;
        
        const player = state.players[playerIndex];
        const { give, receive } = action;
        
        // Determine trade ratio (4:1 default, can be improved by ports)
        const ratio = getTradeRatio(state, state.currentPlayer, give);
        const loss = { [give]: ratio };
        const gain = { [receive]: 1 };
        
        // Check if player has enough resources
        if (player.resources[give] < ratio) return state;
        
        // Apply the trade
        const newResources = { ...player.resources };
        newResources[give] = newResources[give] - ratio;
        newResources[receive] = (newResources[receive] || 0) + gain[receive];
        
        const updatedPlayers = [...state.players];
        updatedPlayers[playerIndex] = { ...player, resources: newResources };
        
        return {
            ...state,
            players: updatedPlayers
        };
    }

    case 'TRADE_OFFER': {
        // Create a new trade offer
        if (state.tradeOffer) return state; // Already a trade in progress
        
        return {
            ...state,
            tradeOffer: {
                playerId: state.currentPlayer,
                offer: action.offer,
                request: action.request,
            }
        };
    }

    case 'TRADE_ACCEPT': {
        // Accept and execute a trade offer
        if (!state.tradeOffer) return state;
        
        const offeringPlayerId = state.tradeOffer.playerId;
        const acceptingPlayerId = state.currentPlayer;
        
        const offeringPlayerIndex = state.players.findIndex(p => p.id === offeringPlayerId);
        const acceptingPlayerIndex = state.players.findIndex(p => p.id === acceptingPlayerId);
        
        if (offeringPlayerIndex === -1 || acceptingPlayerIndex === -1) return state;
        
        const offeringPlayer = state.players[offeringPlayerIndex];
        const acceptingPlayer = state.players[acceptingPlayerIndex];
        
        const { offer, request } = state.tradeOffer;
        
        // Verify both players have enough resources
        for (const resource in offer) {
            const resourceType = resource as ResourceType;
            if ((offeringPlayer.resources[resourceType] || 0) < (offer[resourceType] || 0)) {
                return state; // Offering player doesn't have enough
            }
        }
        
        for (const resource in request) {
            const resourceType = resource as ResourceType;
            if ((acceptingPlayer.resources[resourceType] || 0) < (request[resourceType] || 0)) {
                return state; // Accepting player doesn't have enough
            }
        }
        
        // Execute the trade
        const updatedOfferingResources = { ...offeringPlayer.resources };
        const updatedAcceptingResources = { ...acceptingPlayer.resources };
        
        // Transfer resources from offering player to accepting player
        for (const resource in offer) {
            const resourceType = resource as ResourceType;
            const amount = offer[resourceType] || 0;
            updatedOfferingResources[resourceType] -= amount;
            updatedAcceptingResources[resourceType] = (updatedAcceptingResources[resourceType] || 0) + amount;
        }
        
        // Transfer resources from accepting player to offering player
        for (const resource in request) {
            const resourceType = resource as ResourceType;
            const amount = request[resourceType] || 0;
            updatedAcceptingResources[resourceType] -= amount;
            updatedOfferingResources[resourceType] = (updatedOfferingResources[resourceType] || 0) + amount;
        }
        
        const updatedPlayers = [...state.players];
        updatedPlayers[offeringPlayerIndex] = { ...offeringPlayer, resources: updatedOfferingResources };
        updatedPlayers[acceptingPlayerIndex] = { ...acceptingPlayer, resources: updatedAcceptingResources };
        
        return {
            ...state,
            players: updatedPlayers,
            tradeOffer: null // Clear the trade offer
        };
    }

    case 'TRADE_REJECT': {
        // Reject a trade offer (just clear it)
        if (!state.tradeOffer) return state;
        
        return {
            ...state,
            tradeOffer: null
        };
    }

    case 'END_TURN': {
        const playerIds = state.players.map(p => p.id);
        let nextPlayerId = state.currentPlayer;
        let nextTurnNumber = state.turnNumber;
        
        // Determine next player based on normal play or setup phase rules
        if (state.setupPhase) {
            const currentIndex = playerIds.indexOf(state.currentPlayer);
            const direction = state.setupPhase.direction;
            const playerCount = playerIds.length;
            
            if (direction === 'forward') {
                // In forward direction, increment index
                nextPlayerId = playerIds[(currentIndex + 1) % playerCount];
            } else { // backward
                // In backward direction, decrement index
                nextPlayerId = playerIds[(currentIndex - 1 + playerCount) % playerCount];
            }
            
            // Reset setupPhase properties if we've moved to a new player
            let nextSetupPhase = { ...state.setupPhase };
            if (nextPlayerId !== state.currentPlayer) {
                nextSetupPhase = { ...nextSetupPhase, settlementsPlaced: 0, roadsPlaced: 0, settlementVertexId: undefined, roadEdgeId: undefined };
            }
            
            // Increment turn number if we've looped back to the first player
            nextTurnNumber = state.turnNumber + (playerIds.indexOf(nextPlayerId) === 0 ? 1 : 0); // Increment turn number when back to first player
            
            return {
                ...state,
                currentPlayer: nextPlayerId,
                setupPhase: nextSetupPhase,
                turnNumber: nextTurnNumber
            };
        } else {
            // Normal play - go to next player in order
            nextPlayerId = nextPlayer(state);
            nextTurnNumber = playerIds.indexOf(nextPlayerId) === 0 ? state.turnNumber + 1 : state.turnNumber;
            
            return {
                ...state,
                currentPlayer: nextPlayerId,
                turnNumber: nextTurnNumber,
                diceRolled: false, // Reset for next turn
                playedDevelopmentCard: false // Reset for next turn
            };
        }
    }

    default:
      return state;
  }
}

// Helper function to check if a player has enough resources for a cost
function hasEnoughResources(
    playerResources: Record<ResourceType, number>,
    cost: Partial<Record<ResourceType, number>>
): boolean {
    for (const resource in cost) {
        const resourceType = resource as ResourceType;
        if ((playerResources[resourceType] || 0) < (cost[resourceType] || 0)) {
            return false;
        }
    }
    return true;
}

// Helper function to get trade ratio for a resource based on ports
function getTradeRatio(state: GameState, playerId: string, resource: ResourceType): number {
  const player = state.players.find(p => p.id === playerId);
  
  if (!player) return 4; // Default ratio
  
  let minRatio = 4; // Default trade ratio
  
  const playerVertices = Object.entries(state.board.vertices)
      .filter(([_, vertex]) => vertex.building?.playerId === playerId)
      .map(([id, _]) => Number(id));
  
  state.board.ports?.forEach(port => {
      if (port.vertices.some(pv => playerVertices.includes(pv))) {
          if (port.type === 'generic' || port.type === resource) {
              minRatio = Math.min(minRatio, port.ratio);
          }
      }
  });
  
  return minRatio;
} 