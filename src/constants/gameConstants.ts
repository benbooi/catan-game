import { GameRules, BuildCost } from '../types/gameLogic';
import { ResourceType } from '../types/game';

export const DEFAULT_BUILD_COSTS: BuildCost = {
  road: {
    lumber: 1,
    brick: 1,
    grain: 0,
    wool: 0,
    ore: 0,
  },
  settlement: {
    lumber: 1,
    brick: 1,
    grain: 1,
    wool: 1,
    ore: 0,
  },
  city: {
    lumber: 0,
    brick: 0,
    grain: 2,
    wool: 0,
    ore: 3,
  },
  developmentCard: {
    lumber: 0,
    brick: 0,
    grain: 1,
    wool: 1,
    ore: 1,
  },
};

export const DEFAULT_GAME_RULES: GameRules = {
  maxPlayers: 4,
  minPlayers: 3,
  pointsToWin: 10,
  initialResources: {
    lumber: 0,
    brick: 0,
    grain: 0,
    wool: 0,
    ore: 0,
  },
  maxHandSize: 7,
  robberThreshold: 7,
  buildCosts: DEFAULT_BUILD_COSTS,
  developmentCards: {
    knight: 14,
    victoryPoint: 5,
    roadBuilding: 2,
    yearOfPlenty: 2,
    monopoly: 2,
  },
};

export const RESOURCE_DISTRIBUTION: Record<ResourceType, number> = {
  lumber: 4,
  brick: 3,
  grain: 4,
  wool: 4,
  ore: 3,
  desert: 1,
};

export const NUMBER_TOKENS = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];

export const PORT_RATIOS: Record<ResourceType | 'any', number> = {
  lumber: 2,
  brick: 2,
  grain: 2,
  wool: 2,
  ore: 2,
  any: 3,
};

export const VICTORY_POINTS = {
  settlement: 1,
  city: 2,
  longestRoad: 2,
  largestArmy: 2,
  victoryPointCard: 1,
}; 