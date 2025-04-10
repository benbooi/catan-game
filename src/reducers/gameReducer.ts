import { GameState, GameAction, GameError } from '../types/gameState';
import { ResourceType, DevelopmentCardType } from '../types/game';
import { gameValidator } from '../validators/gameValidator';

export function gameReducer(state: GameState, action: GameAction): GameState | GameError {
  switch (action.type) {
    case 'ROLL_DICE': {
      if (!gameValidator.canRollDice(state)) {
        return { code: 'INVALID_PHASE', message: 'Cannot roll dice in current phase' };
      }

      const die1 = Math.floor(Math.random() * 6) + 1;
      const die2 = Math.floor(Math.random() * 6) + 1;
      const total = die1 + die2;

      let newState = { ...state, diceRoll: total };

      if (total === 7) {
        return {
          ...newState,
          phase: 'ROBBER'
        };
      }

      // Distribute resources
      const newPlayers = [...state.players];
      state.board.hexes.forEach(hex => {
        if (hex.number === total && !hex.hasRobber) {
          hex.vertices.forEach(vertexId => {
            const vertex = state.board.vertices.find(v => v.id === vertexId);
            if (vertex?.building) {
              const resourceCount = vertex.building.type === 'city' ? 2 : 1;
              const player = newPlayers[vertex.building.player];
              player.resources[hex.type] += resourceCount;
            }
          });
        }
      });

      return {
        ...newState,
        players: newPlayers,
        phase: 'MAIN'
      };
    }

    case 'BUILD_SETTLEMENT': {
      if (!gameValidator.canBuildSettlement(state, action.vertexId)) {
        return { code: 'INVALID_MOVE', message: 'Cannot build settlement at this location' };
      }

      const newPlayers = [...state.players];
      const player = newPlayers[state.currentPlayer];
      const newVertices = state.board.vertices.map(v => 
        v.id === action.vertexId 
          ? { ...v, building: { type: 'settlement', player: state.currentPlayer } }
          : v
      );

      // Deduct resources if not in setup phase
      if (!state.setupPhase) {
        player.resources.brick--;
        player.resources.lumber--;
        player.resources.wool--;
        player.resources.grain--;
      }

      player.buildings.settlements.push(action.vertexId);
      player.victoryPoints++;

      return {
        ...state,
        players: newPlayers,
        board: {
          ...state.board,
          vertices: newVertices
        }
      };
    }

    case 'BUILD_CITY': {
      if (!gameValidator.canBuildCity(state, action.vertexId)) {
        return { code: 'INVALID_MOVE', message: 'Cannot build city at this location' };
      }

      const newPlayers = [...state.players];
      const player = newPlayers[state.currentPlayer];
      const newVertices = state.board.vertices.map(v => 
        v.id === action.vertexId 
          ? { ...v, building: { type: 'city', player: state.currentPlayer } }
          : v
      );

      // Deduct resources
      player.resources.ore -= 3;
      player.resources.grain -= 2;

      // Update buildings and points
      player.buildings.settlements = player.buildings.settlements.filter(id => id !== action.vertexId);
      player.buildings.cities.push(action.vertexId);
      player.victoryPoints++;

      return {
        ...state,
        players: newPlayers,
        board: {
          ...state.board,
          vertices: newVertices
        }
      };
    }

    case 'BUILD_ROAD': {
      if (!gameValidator.canBuildRoad(state, action.edgeId)) {
        return { code: 'INVALID_MOVE', message: 'Cannot build road at this location' };
      }

      const newPlayers = [...state.players];
      const player = newPlayers[state.currentPlayer];
      const newEdges = state.board.edges.map(e => 
        e.id === action.edgeId 
          ? { ...e, road: { player: state.currentPlayer } }
          : e
      );

      // Deduct resources if not in setup phase
      if (!state.setupPhase) {
        player.resources.brick--;
        player.resources.lumber--;
      }

      player.buildings.roads.push(action.edgeId);

      // Check for longest road
      // TODO: Implement longest road calculation

      return {
        ...state,
        players: newPlayers,
        board: {
          ...state.board,
          edges: newEdges
        }
      };
    }

    case 'MOVE_ROBBER': {
      if (!gameValidator.canMoveRobber(state, action.hexId, action.targetPlayerId)) {
        return { code: 'INVALID_MOVE', message: 'Cannot move robber to this location' };
      }

      const newHexes = state.board.hexes.map(h => ({
        ...h,
        hasRobber: h.id === action.hexId
      }));

      // Steal a random resource
      const newPlayers = [...state.players];
      const targetPlayer = newPlayers[action.targetPlayerId];
      const currentPlayer = newPlayers[state.currentPlayer];
      
      const targetResources = Object.entries(targetPlayer.resources)
        .filter(([_, count]) => count > 0)
        .map(([type]) => type as ResourceType);

      if (targetResources.length > 0) {
        const stolenResource = targetResources[Math.floor(Math.random() * targetResources.length)];
        targetPlayer.resources[stolenResource]--;
        currentPlayer.resources[stolenResource]++;
      }

      return {
        ...state,
        players: newPlayers,
        board: {
          ...state.board,
          hexes: newHexes
        },
        phase: 'MAIN'
      };
    }

    case 'OFFER_TRADE': {
      if (!gameValidator.canOfferTrade(state, action.give, action.want)) {
        return { code: 'INVALID_TRADE', message: 'Invalid trade offer' };
      }

      return {
        ...state,
        tradeOffer: {
          from: state.currentPlayer,
          to: action.toPlayer,
          give: action.give,
          want: action.want
        }
      };
    }

    case 'ACCEPT_TRADE': {
      if (!gameValidator.canAcceptTrade(state)) {
        return { code: 'INVALID_TRADE', message: 'Cannot accept trade' };
      }

      const { tradeOffer } = state;
      if (!tradeOffer) {
        return { code: 'INVALID_TRADE', message: 'No trade offer exists' };
      }

      const newPlayers = [...state.players];
      const fromPlayer = newPlayers[tradeOffer.from];
      const toPlayer = newPlayers[state.currentPlayer];

      // Exchange resources
      Object.entries(tradeOffer.give).forEach(([type, count]) => {
        fromPlayer.resources[type as ResourceType] -= count || 0;
        toPlayer.resources[type as ResourceType] += count || 0;
      });

      Object.entries(tradeOffer.want).forEach(([type, count]) => {
        toPlayer.resources[type as ResourceType] -= count || 0;
        fromPlayer.resources[type as ResourceType] += count || 0;
      });

      return {
        ...state,
        players: newPlayers,
        tradeOffer: null
      };
    }

    case 'DECLINE_TRADE': {
      return {
        ...state,
        tradeOffer: null
      };
    }

    case 'BANK_TRADE': {
      if (!gameValidator.canBankTrade(state, action.give, action.want)) {
        return { code: 'INVALID_TRADE', message: 'Invalid bank trade' };
      }

      const newPlayers = [...state.players];
      const player = newPlayers[state.currentPlayer];

      // Execute bank trade
      player.resources[action.give[0]] -= action.give.length;
      player.resources[action.want]++;

      return {
        ...state,
        players: newPlayers
      };
    }

    case 'END_TURN': {
      if (!gameValidator.canEndTurn(state)) {
        return { code: 'INVALID_PHASE', message: 'Cannot end turn in current phase' };
      }

      let nextPlayer = state.currentPlayer;
      let nextPhase = 'ROLL' as const;
      let setupPhase = state.setupPhase;

      if (state.setupPhase) {
        if (state.setupPhase.direction === 'forward') {
          nextPlayer = (state.currentPlayer + 1) % state.players.length;
          if (nextPlayer === 0) {
            setupPhase = { round: 2, direction: 'backward' };
          }
        } else {
          nextPlayer = (state.currentPlayer - 1 + state.players.length) % state.players.length;
          if (nextPlayer === state.players.length - 1) {
            setupPhase = null;
            nextPhase = 'ROLL';
          }
        }
      } else {
        nextPlayer = (state.currentPlayer + 1) % state.players.length;
      }

      return {
        ...state,
        currentPlayer: nextPlayer,
        phase: nextPhase,
        setupPhase,
        turnNumber: state.turnNumber + 1,
        diceRoll: null
      };
    }

    default:
      return { code: 'INVALID_MOVE', message: 'Invalid action type' };
  }
} 