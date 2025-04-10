import { GameRules, BuildCost } from '../types/gameLogic';
import { ResourceType, DevelopmentCardType } from '../types/game';

export const RESOURCE_TYPES: ResourceType[] = ['wood', 'brick', 'ore', 'grain', 'wool'];

export const BUILD_COSTS: Record<string, Partial<Record<ResourceType, number>>> = {
  road: { wood: 1, brick: 1 },
  settlement: { wood: 1, brick: 1, wool: 1, grain: 1 },
  city: { ore: 3, grain: 2 },
  developmentCard: { ore: 1, wool: 1, grain: 1 }
} as const;

export const DEVELOPMENT_CARDS: Record<DevelopmentCardType, number> = {
  knight: 14,
  victoryPoint: 5,
  roadBuilding: 2,
  yearOfPlenty: 2,
  monopoly: 2
} as const;

export const INITIAL_RESOURCES: Record<ResourceType, number> = {
  wood: 0,
  brick: 0,
  ore: 0,
  grain: 0,
  wool: 0
};

export const PORT_RATIOS = {
  wood: 2,
  brick: 2,
  ore: 2,
  grain: 2,
  wool: 2,
  any: 3
} as const;

export const VICTORY_POINTS = {
  settlement: 1,
  city: 2,
  longestRoad: 2,
  largestArmy: 2
} as const;

export const DEFAULT_BUILD_COSTS: BuildCost = {
  road: {
    wood: 1,
    brick: 1,
    grain: 0,
    wool: 0,
    ore: 0,
  },
  settlement: {
    wood: 1,
    brick: 1,
    grain: 1,
    wool: 1,
    ore: 0,
  },
  city: {
    wood: 0,
    brick: 0,
    grain: 2,
    wool: 0,
    ore: 3,
  },
  developmentCard: {
    wood: 0,
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
    wood: 0,
    brick: 0,
    grain: 0,
    wool: 0,
    ore: 0,
  },
  maxHandSize: 7,
  robberThreshold: 7,
  buildCosts: DEFAULT_BUILD_COSTS,
  developmentCards: {
    knights: 14,
    victoryPoints: 5,
    roadBuilding: 2,
    yearOfPlenty: 2,
    monopoly: 2,
  },
  setupRules: {
    settlementsPerPlayer: 2,
    roadsPerPlayer: 2,
  },
  bankTrade: {
    defaultRatio: 4,
    portRatios: {
      wood: 2,
      brick: 2,
      ore: 2,
      grain: 2,
      wool: 2,
    },
  }
};

export const RESOURCE_DISTRIBUTION: Record<ResourceType | 'desert', number> = {
  wood: 4,
  brick: 3,
  ore: 3,
  grain: 4,
  wool: 4,
  desert: 1,
};

export const NUMBER_TOKENS = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12]; 