import { GameState, GameAction, GameError } from '../types/gameState';
import { ResourceType, DevelopmentCardType } from '../types/game';
import { gameValidator } from '../validators/gameValidator';

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'ROLL_DICE': {
      if (!gameValidator.canRollDice(state)) {
        return { ...state, error: { code: 'INVALID_PHASE', message: 'Cannot roll dice at this time' } };
      }
      const roll = Math.floor(Math.random() * 6) + Math.floor(Math.random() * 6) + 2;
      return { ...state, diceRoll: roll, phase: 'MAIN' };
    }

    case 'BUILD_SETTLEMENT': {
      if (!gameValidator.canBuildSettlement(state, action.vertexId)) {
        return { ...state, error: { code: 'INVALID_LOCATION', message: 'Cannot build settlement at this location' } };
      }
      const newPlayers = [...state.players];
      const player = newPlayers.find(p => p.id === state.currentPlayer);
      if (!player) {
        return { ...state, error: { code: 'INVALID_PLAYER', message: 'Player not found' } };
      }
      player.resources.wood--;
      player.resources.brick--;
      player.resources.grain--;
      player.resources.wool--;
      return { ...state, players: newPlayers };
    }

    case 'BUILD_CITY': {
      if (!gameValidator.canBuildCity(state, action.vertexId)) {
        return { ...state, error: { code: 'INVALID_LOCATION', message: 'Cannot build city at this location' } };
      }
      const newPlayers = [...state.players];
      const player = newPlayers.find(p => p.id === state.currentPlayer);
      if (!player) {
        return { ...state, error: { code: 'INVALID_PLAYER', message: 'Player not found' } };
      }
      player.resources.ore -= 3;
      player.resources.grain -= 2;
      return { ...state, players: newPlayers };
    }

    case 'BUILD_ROAD': {
      if (!gameValidator.canBuildRoad(state, action.edgeId)) {
        return { ...state, error: { code: 'INVALID_LOCATION', message: 'Cannot build road at this location' } };
      }
      const newPlayers = [...state.players];
      const player = newPlayers.find(p => p.id === state.currentPlayer);
      if (!player) {
        return { ...state, error: { code: 'INVALID_PLAYER', message: 'Player not found' } };
      }
      player.resources.wood--;
      player.resources.brick--;
      return { ...state, players: newPlayers };
    }

    case 'BUY_DEVELOPMENT_CARD': {
      if (!gameValidator.canBuyDevelopmentCard(state)) {
        return { ...state, error: { code: 'INSUFFICIENT_RESOURCES', message: 'Cannot buy development card' } };
      }
      const newPlayers = [...state.players];
      const player = newPlayers.find(p => p.id === state.currentPlayer);
      if (!player) {
        return { ...state, error: { code: 'INVALID_PLAYER', message: 'Player not found' } };
      }
      player.resources.ore--;
      player.resources.grain--;
      player.resources.wool--;
      return { ...state, players: newPlayers };
    }

    case 'PLAY_DEVELOPMENT_CARD': {
      if (!gameValidator.canPlayDevelopmentCard(state, action.cardIndex.toString())) {
        return { ...state, error: { code: 'INVALID_PHASE', message: 'Cannot play development card at this time' } };
      }
      const newPlayers = [...state.players];
      const player = newPlayers.find(p => p.id === state.currentPlayer);
      if (!player) {
        return { ...state, error: { code: 'INVALID_PLAYER', message: 'Player not found' } };
      }
      player.developmentCards[action.cardIndex].used = true;
      return { ...state, players: newPlayers };
    }

    case 'TRADE_BANK': {
      if (!gameValidator.canBankTrade(state, action.give, action.want)) {
        return { ...state, error: { code: 'INVALID_TRADE', message: 'Cannot trade with bank' } };
      }
      const newPlayers = [...state.players];
      const player = newPlayers.find(p => p.id === state.currentPlayer);
      if (!player) {
        return { ...state, error: { code: 'INVALID_PLAYER', message: 'Player not found' } };
      }
      player.resources[action.give]--;
      player.resources[action.want]++;
      return { ...state, players: newPlayers };
    }

    case 'TRADE_OFFER': {
      if (!gameValidator.canOfferTrade(state, action.give, action.want)) {
        return { ...state, error: { code: 'INVALID_TRADE', message: 'Cannot offer trade' } };
      }
      return {
        ...state,
        tradeOffer: {
          from: state.currentPlayer,
          to: action.to,
          give: action.give,
          want: action.want
        }
      };
    }

    case 'TRADE_ACCEPT': {
      if (!gameValidator.canAcceptTrade(state)) {
        return { ...state, error: { code: 'INVALID_TRADE', message: 'Cannot accept trade' } };
      }
      const newPlayers = [...state.players];
      const tradeOffer = state.tradeOffer;
      if (!tradeOffer) {
        return { ...state, error: { code: 'INVALID_TRADE', message: 'No active trade offer' } };
      }
      const fromPlayer = newPlayers.find(p => p.id === tradeOffer.from);
      const toPlayer = newPlayers.find(p => p.id === state.currentPlayer);
      if (!fromPlayer || !toPlayer) {
        return { ...state, error: { code: 'INVALID_PLAYER', message: 'Player not found' } };
      }
      Object.entries(tradeOffer.give).forEach(([resource, count]) => {
        fromPlayer.resources[resource as ResourceType] -= count;
        toPlayer.resources[resource as ResourceType] += count;
      });
      Object.entries(tradeOffer.want).forEach(([resource, count]) => {
        fromPlayer.resources[resource as ResourceType] += count;
        toPlayer.resources[resource as ResourceType] -= count;
      });
      return { ...state, players: newPlayers, tradeOffer: null };
    }

    case 'TRADE_REJECT': {
      return { ...state, tradeOffer: null };
    }

    case 'MOVE_ROBBER': {
      if (!gameValidator.canMoveRobber(state, action.hexId, action.targetPlayerId)) {
        return { ...state, error: { code: 'INVALID_LOCATION', message: 'Cannot move robber to this location' } };
      }
      const newPlayers = [...state.players];
      const targetPlayer = newPlayers.find(p => p.id === action.targetPlayerId);
      const currentPlayer = newPlayers.find(p => p.id === state.currentPlayer);
      if (!targetPlayer || !currentPlayer) {
        return { ...state, error: { code: 'INVALID_PLAYER', message: 'Player not found' } };
      }
      const resources = Object.entries(targetPlayer.resources)
        .filter(([_, count]) => count > 0)
        .map(([resource]) => resource as ResourceType);
      if (resources.length > 0) {
        const stolenResource = resources[Math.floor(Math.random() * resources.length)];
        targetPlayer.resources[stolenResource]--;
        currentPlayer.resources[stolenResource]++;
      }
      return {
        ...state,
        players: newPlayers,
        board: {
          ...state.board,
          robber: { hexId: action.hexId }
        }
      };
    }

    case 'END_TURN': {
      if (!gameValidator.canEndTurn(state)) {
        return { ...state, error: { code: 'INVALID_PHASE', message: 'Cannot end turn at this time' } };
      }
      const currentPlayerIndex = state.players.findIndex(p => p.id === state.currentPlayer);
      const nextPlayerIndex = (currentPlayerIndex + 1) % state.players.length;
      return {
        ...state,
        currentPlayer: state.players[nextPlayerIndex].id,
        phase: 'ROLL',
        diceRoll: null
      };
    }

    default:
      return { ...state, error: { code: 'INVALID_PHASE', message: 'Invalid action type' } };
  }
} 