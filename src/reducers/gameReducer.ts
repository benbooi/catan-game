import { GameState, GameAction /*, GameError */ } from '../types/gameState'; // Removed unused GameError
import { Player, ResourceType /*, DevelopmentCardType */ } from '../types/game'; // Removed unused DevelopmentCardType
import { gameValidator } from '../validators/gameValidator';

// --- Helper Functions (potentially move to utils) ---

function distributeResources(state: GameState, diceRoll: number): GameState {
  if (diceRoll === 7) {
    // Robber activation - handled separately or by setting mustMoveRobber flag
    return { ...state, mustMoveRobber: true }; 
  }

  const players = { ...state.players };

  state.board.hexes.forEach(hex => {
    if (hex.number === diceRoll && hex.id !== state.board.robber.hexId) {
      hex.vertices.forEach(vertexId => {
        const vertex = state.board.vertices[vertexId];
        if (vertex?.building) {
          const playerId = vertex.building.playerId;
          const player = players[playerId];
          if (player && hex.type !== 'desert') {
            const resourceCount = vertex.building.type === 'city' ? 2 : 1;
            // Ensure resource key exists before incrementing
            if (hex.type in player.resources) {
                 players[playerId] = {
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
    const players = { ...state.players };
    for (const playerId in discards) {
        const player = players[playerId];
        if (player) {
            const playerDiscards = discards[playerId];
            const newResources = { ...player.resources };
            for (const resourceKey in playerDiscards) {
                const resource = resourceKey as ResourceType;
                const amount = playerDiscards[resource];
                if (amount !== undefined && newResources[resource] !== undefined) {
                    newResources[resource] = Math.max(0, newResources[resource] - amount);
                }
            }
            players[playerId] = { ...players[playerId], resources: newResources };
        }
    }
    return { ...state, players, phase: 'MAIN' }; // Move to MAIN after discard
}

function applyRobberMove(state: GameState, hexId: number, targetPlayerId?: string): GameState {
  let players = { ...state.players };
  const currentPlayerId = state.currentPlayer;

  // Steal resource if a target is chosen and valid
  if (targetPlayerId && targetPlayerId !== currentPlayerId) {
    const targetPlayer = players[targetPlayerId];
    const currentPlayer = players[currentPlayerId];
    
    if (targetPlayer && currentPlayer) {
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

            players = {
                ...players,
                [targetPlayerId]: { ...targetPlayer, resources: newTargetResources },
                [currentPlayerId]: { ...currentPlayer, resources: newCurrentResources },
            };
        }
    }
  }

  return {
    ...state,
    players,
    board: { ...state.board, robber: { hexId: hexId } },
    mustMoveRobber: false, // Robber has been moved
    // Phase might change depending on whether this was from a 7 roll or Knight
    // If from a 7 roll, phase might transition back to MAIN or stay ROBBER for discard
    // If from Knight, stay in MAIN
  };
}

function nextPlayer(state: GameState): string {
    const playerIds = Object.keys(state.players);
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
      const player = state.players[state.currentPlayer];
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

      const newVertex: typeof vertex = {
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

      return {
        ...state,
        players: {
          ...state.players,
          [state.currentPlayer]: { ...player, resources: newResources },
        },
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
      const player = state.players[state.currentPlayer];
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

      const newVertex: typeof vertex = {
          ...vertex,
          building: { ...vertex.building, type: 'city' },
      };

      return {
        ...state,
        players: {
          ...state.players,
          [state.currentPlayer]: { ...player, resources: newResources },
        },
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
      const player = state.players[state.currentPlayer];
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

      const newEdge: typeof edge = {
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
          const numPlayers = Object.keys(state.players).length;
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

      // Note: Longest road calculation happens in the store after the reducer

      return {
        ...state,
        players: {
          ...state.players,
          [state.currentPlayer]: { ...player, resources: newResources },
        },
        board: {
          ...state.board,
          edges: {
            ...state.board.edges,
            [action.edgeId]: newEdge,
          },
        },
        setupPhase: nextSetupPhase,
        phase: nextPhase, // Update phase if setup ended
        // If setup ended, who is the next player? Should be handled by END_TURN?
      };
    }

    case 'BUY_DEVELOPMENT_CARD': {
        const player = state.players[state.currentPlayer];
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
        if (state.developmentCardDeck.length === 0) return state; // Should be validated

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

        return {
             ...state,
             players: {
                 ...state.players,
                 [state.currentPlayer]: { 
                     ...player, 
                     resources: newResources,
                     developmentCards: newDevCards
                 },
             },
             developmentCardDeck: remainingDeck,
        };
    }

    case 'PLAY_DEVELOPMENT_CARD': { 
        const player = state.players[state.currentPlayer];
        const card = player.developmentCards?.[action.cardIndex];

        // Validation should prevent playing invalid/used/wrong turn cards
        if (!card || card.used || card.turnPurchased === state.turnNumber || card.type === 'victoryPoint') {
             return state;
        }

        const newDevCards = [...player.developmentCards];
        newDevCards[action.cardIndex] = { ...card, used: true };

        let nextState = { 
            ...state, 
            players: { 
                ...state.players, 
                [state.currentPlayer]: { ...player, developmentCards: newDevCards } 
            },
            playedDevelopmentCard: true, // Mark that a card was played this turn
        };

        // Apply card effects (Knight, Road Building, Year of Plenty, Monopoly)
        switch (card.type) {
            case 'knight':
                 // Update knights played count for Largest Army calculation
                const updatedPlayer = { ...nextState.players[state.currentPlayer], knightsPlayed: (player.knightsPlayed || 0) + 1 };
                nextState = {
                     ...nextState, 
                     players: { ...nextState.players, [state.currentPlayer]: updatedPlayer },
                     mustMoveRobber: true, // Player must now move the robber
                     phase: 'ROBBER' // Or handle within MAIN phase logic?
                };
                break;
            case 'roadBuilding':
                // Grant player resources/flags to build 2 roads for free
                // This might require temporary state or specific handling in BUILD_ROAD
                // Option 1: Add temporary resources (less clean)
                // Option 2: Add a flag `player.canBuildFreeRoads = 2`
                console.warn('Road Building effect needs implementation');
                break;
            case 'yearOfPlenty':
                // Player chooses 2 resources from the bank
                // This requires additional action/payload: action.resources = [res1, res2]
                const chosenResources = action.resources; // Assuming payload exists
                if (chosenResources && chosenResources.length === 2) {
                    const resourcesToAdd = { ...nextState.players[state.currentPlayer].resources };
                    chosenResources.forEach(res => {
                        if (res in resourcesToAdd) {
                             resourcesToAdd[res] = (resourcesToAdd[res] || 0) + 1;
                        }
                    });
                     const updatedPlayerWithResources = { ...nextState.players[state.currentPlayer], resources: resourcesToAdd };
                     nextState = { ...nextState, players: { ...nextState.players, [state.currentPlayer]: updatedPlayerWithResources } };
                } else {
                     console.error('Year of Plenty requires 2 chosen resources in action payload');
                     return state; // Or handle error state
                }
                break;
            case 'monopoly':
                // Player chooses 1 resource type, takes all of it from other players
                // Requires action.resource: ResourceType
                const monopolizedResource = action.resource;
                if (monopolizedResource) {
                    let totalStolen = 0;
                    const updatedPlayers = { ...nextState.players };
                    for (const pId in updatedPlayers) {
                         if (pId !== state.currentPlayer) {
                             const targetPlayer = updatedPlayers[pId];
                             const amountStolen = targetPlayer.resources[monopolizedResource] || 0;
                             if (amountStolen > 0) {
                                 totalStolen += amountStolen;
                                 updatedPlayers[pId] = { 
                                     ...targetPlayer, 
                                     resources: { ...targetPlayer.resources, [monopolizedResource]: 0 }
                                 };
                             }
                         }
                     }
                    const currentPlayerResources = { ...updatedPlayers[state.currentPlayer].resources };
                    currentPlayerResources[monopolizedResource] = (currentPlayerResources[monopolizedResource] || 0) + totalStolen;
                    updatedPlayers[state.currentPlayer] = { ...updatedPlayers[state.currentPlayer], resources: currentPlayerResources };
                    nextState = { ...nextState, players: updatedPlayers };
                } else {
                    console.error('Monopoly requires chosen resource in action payload');
                    return state;
                }
                break;
            // victoryPoint case is handled by not being playable
        }

        return nextState;
    }

    case 'TRADE_BANK': {
        const player = state.players[state.currentPlayer];
        const ratio = getTradeRatio(state, state.currentPlayer, action.give); // Use helper
        const cost = { [action.give]: ratio };
        const gain = { [action.receive]: 1 };

        if (!hasEnoughResources(player.resources, cost)) return state; // Validation check

        const newResources = { ...player.resources };
        newResources[action.give] -= ratio;
        newResources[action.receive] = (newResources[action.receive] || 0) + gain[action.receive];

        return {
            ...state,
            players: {
                ...state.players,
                [state.currentPlayer]: { ...player, resources: newResources },
            },
        };
    }

    case 'TRADE_OFFER': {
        // Action simply sets the trade offer in the state
        // Validation ensures the player has the resources to offer
        return {
            ...state,
            tradeOffer: {
                 playerId: state.currentPlayer,
                 offer: action.offer,
                 request: action.request,
            },
        };
    }

    case 'TRADE_ACCEPT': { 
        if (!state.tradeOffer) return state; // No offer to accept

        const acceptingPlayerId = state.currentPlayer;
        const offeringPlayerId = state.tradeOffer.playerId;
        
        if (acceptingPlayerId === offeringPlayerId) return state; // Cannot accept own

        const acceptingPlayer = state.players[acceptingPlayerId];
        const offeringPlayer = state.players[offeringPlayerId];
        const { offer, request } = state.tradeOffer;

        if (!acceptingPlayer || !offeringPlayer) return state; // Players must exist

        // Double check resources just before exchange
        if (!hasEnoughResources(acceptingPlayer.resources, request) || !hasEnoughResources(offeringPlayer.resources, offer)) {
            console.warn('Trade resources changed between offer and accept, cancelling.');
            return { ...state, tradeOffer: null }; // Cancel trade if resources changed
        }

        // Perform the resource exchange
        const newAcceptingResources = { ...acceptingPlayer.resources };
        const newOfferingResources = { ...offeringPlayer.resources };

        // Subtract requested from accepter, add offered to accepter
        for (const resKey in request) {
             const res = resKey as ResourceType;
             newAcceptingResources[res] -= (request[res] ?? 0);
        }
        for (const resKey in offer) {
            const res = resKey as ResourceType;
            newAcceptingResources[res] = (newAcceptingResources[res] || 0) + (offer[res] ?? 0);
        }

        // Subtract offered from offerer, add requested to offerer
        for (const resKey in offer) {
             const res = resKey as ResourceType;
             newOfferingResources[res] -= (offer[res] ?? 0);
        }
         for (const resKey in request) {
            const res = resKey as ResourceType;
            newOfferingResources[res] = (newOfferingResources[res] || 0) + (request[res] ?? 0);
        }

        return {
             ...state,
             players: {
                 ...state.players,
                 [acceptingPlayerId]: { ...acceptingPlayer, resources: newAcceptingResources },
                 [offeringPlayerId]: { ...offeringPlayer, resources: newOfferingResources },
             },
             tradeOffer: null, // Clear the trade offer after completion
        };
    }

    case 'TRADE_REJECT': {
         // Simply clear the trade offer
        if (!state.tradeOffer) return state;
        return { ...state, tradeOffer: null };
    }

    case 'END_TURN': {
        // Determine next player based on current phase (setup vs main game)
        let nextPlayerId = state.currentPlayer;
        let nextPhase = state.phase;
        let nextTurnNumber = state.turnNumber;
        let nextSetupPhase = state.setupPhase;

        if (state.setupPhase) {
             // Setup Phase Turn Progression
             const playerIds = Object.keys(state.players);
             const currentIndex = playerIds.indexOf(state.currentPlayer);

             if (state.setupPhase.round === 1) {
                  // Forward direction
                  if (currentIndex < playerIds.length - 1) {
                      nextPlayerId = playerIds[currentIndex + 1];
                  } else {
                      // Last player finished round 1, starts round 2 immediately
                      nextPlayerId = playerIds[currentIndex]; 
                      // Round 1 completion logic (reversing) is handled in BUILD_ROAD?
                  }
             } else { // Round 2
                  // Backward direction
                  if (currentIndex > 0) {
                      nextPlayerId = playerIds[currentIndex - 1];
                  } else {
                      // First player (last in backward) finished round 2
                      nextPlayerId = playerIds[0]; // Game starts with the first player
                       // Setup phase end logic is handled in BUILD_ROAD?
                  }
             }
             // Reset placement flags for the new turn in setup
             if (nextSetupPhase) {
                  nextSetupPhase = { ...nextSetupPhase, settlementsPlaced: 0, roadsPlaced: 0, settlementVertexId: undefined, roadEdgeId: undefined };
             }
             // Phase remains SETUP until explicitly changed (e.g., in BUILD_ROAD)

        } else {
            // Main Game Turn Progression
             nextPlayerId = nextPlayer(state);
             nextPhase = 'ROLL'; // Next player starts with ROLL phase
             nextTurnNumber = state.turnNumber + (playerIds.indexOf(nextPlayerId) === 0 ? 1 : 0); // Increment turn number when back to first player
        }

        return {
          ...state,
          currentPlayer: nextPlayerId,
          phase: nextPhase,
          turnNumber: nextTurnNumber,
          diceRolled: false, // Reset for next turn
          playedDevelopmentCard: false, // Reset for next turn
          tradeOffer: null, // Clear any lingering trade offer
          setupPhase: nextSetupPhase, // Update setup phase state
          mustMoveRobber: false, // Reset flag (should be handled by MOVE_ROBBER action)
        };
    }

    default:
      // Should not happen if action types are exhaustive
      return state;
  }
}


// Need helper functions like hasEnoughResources, getTradeRatio if not imported
function hasEnoughResources(
    playerResources: Record<ResourceType, number>,
    cost: Partial<Record<ResourceType, number>>
): boolean {
    for (const resourceKey in cost) {
        const resource = resourceKey as ResourceType;
        const requiredAmount = cost[resource];
        if (requiredAmount !== undefined && requiredAmount > 0) {
            if (!(resource in playerResources) || playerResources[resource] < requiredAmount) {
                return false;
            }
        }
    }
    return true;
}

function getTradeRatio(state: GameState, playerId: string, resource: ResourceType): number {
  let minRatio = 4; 
  const player = state.players[playerId];
  if (!player) return minRatio;

  const playerVertices = Object.keys(state.board.vertices)
      .map(Number)
      .filter(vertexId => state.board.vertices[vertexId]?.building?.playerId === playerId);

  state.board.ports?.forEach(port => {
      if (port.vertices.some(portVertexId => playerVertices.includes(portVertexId))) {
          if (port.type === 'generic' || port.type === resource) {
              minRatio = Math.min(minRatio, port.ratio);
          }
      }
  });
  return minRatio;
}

function distributeResources(state: GameState, diceRoll: number): GameState {
  if (diceRoll === 7) {
    // Robber activation - handled separately or by setting mustMoveRobber flag
    return { ...state, mustMoveRobber: true }; 
  }

  const players = { ...state.players };

  state.board.hexes.forEach(hex => {
    if (hex.number === diceRoll && hex.id !== state.board.robber.hexId) {
      hex.vertices.forEach(vertexId => {
        const vertex = state.board.vertices[vertexId];
        if (vertex?.building) {
          const playerId = vertex.building.playerId;
          const player = players[playerId];
          if (player && hex.type !== 'desert') {
            const resourceCount = vertex.building.type === 'city' ? 2 : 1;
            // Ensure resource key exists before incrementing
            if (hex.type in player.resources) {
                 players[playerId] = {
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
    const players = { ...state.players };
    for (const playerId in discards) {
        const player = players[playerId];
        if (player) {
            const playerDiscards = discards[playerId];
            const newResources = { ...player.resources };
            for (const resourceKey in playerDiscards) {
                const resource = resourceKey as ResourceType;
                const amount = playerDiscards[resource];
                if (amount !== undefined && newResources[resource] !== undefined) {
                    newResources[resource] = Math.max(0, newResources[resource] - amount);
                }
            }
            players[playerId] = { ...players[playerId], resources: newResources };
        }
    }
    return { ...state, players, phase: 'MAIN' }; // Move to MAIN after discard
}

function applyRobberMove(state: GameState, hexId: number, targetPlayerId?: string): GameState {
  let players = { ...state.players };
  const currentPlayerId = state.currentPlayer;

  // Steal resource if a target is chosen and valid
  if (targetPlayerId && targetPlayerId !== currentPlayerId) {
    const targetPlayer = players[targetPlayerId];
    const currentPlayer = players[currentPlayerId];
    
    if (targetPlayer && currentPlayer) {
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

            players = {
                ...players,
                [targetPlayerId]: { ...targetPlayer, resources: newTargetResources },
                [currentPlayerId]: { ...currentPlayer, resources: newCurrentResources },
            };
        }
    }
  }

  return {
    ...state,
    players,
    board: { ...state.board, robber: { hexId: hexId } },
    mustMoveRobber: false, // Robber has been moved
    // Phase might change depending on whether this was from a 7 roll or Knight
    // If from a 7 roll, phase might transition back to MAIN or stay ROBBER for discard
    // If from Knight, stay in MAIN
  };
}

function nextPlayer(state: GameState): string {
    const playerIds = Object.keys(state.players);
    const currentIndex = playerIds.indexOf(state.currentPlayer);
    const nextIndex = (currentIndex + 1) % playerIds.length;
    return playerIds[nextIndex];
} 