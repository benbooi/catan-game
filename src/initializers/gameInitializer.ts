import { GameState } from '../types/gameState';
import { Player, DevelopmentCard, DevelopmentCardType } from '../types/game';
import { v4 as uuidv4 } from 'uuid';
import { initializeBoard } from './boardInitializer';
import { INITIAL_RESOURCES, DEVELOPMENT_CARDS } from '../constants/gameConstants';

// Helper to create initial players
const createInitialPlayers = (numPlayers: number): Record<string, Player> => {
  const colors = ['red', 'blue', 'green', 'orange', 'purple', 'brown']; // Example colors
  const players: Record<string, Player> = {};
  for (let i = 0; i < numPlayers; i++) {
    const playerId = uuidv4();
    players[playerId] = {
      id: playerId,
      name: `Player ${i + 1}`,
      color: colors[i % colors.length],
      resources: { ...INITIAL_RESOURCES }, // Use initial resources constant correctly
      developmentCards: [], // Initialize as empty array of DevelopmentCard
      score: 0,
      knightsPlayed: 0,
      hasLargestArmy: false,
      hasLongestRoad: false,
      // Ensure all required Player properties from types/game.ts are initialized
    };
  }
  return players;
};

// Create the development card deck
const createDevelopmentCardDeck = (): DevelopmentCard[] => {
  const deck: DevelopmentCard[] = [];
  
  // Create knight cards
  for (let i = 0; i < DEVELOPMENT_CARDS.knight; i++) {
    deck.push({ type: 'knight' as DevelopmentCardType, used: false });
  }
  // Create victoryPoint cards
  for (let i = 0; i < DEVELOPMENT_CARDS.victoryPoint; i++) {
    deck.push({ type: 'victoryPoint' as DevelopmentCardType, used: false });
  }
  // Create roadBuilding cards
  for (let i = 0; i < DEVELOPMENT_CARDS.roadBuilding; i++) {
    deck.push({ type: 'roadBuilding' as DevelopmentCardType, used: false });
  }
  // Create yearOfPlenty cards
  for (let i = 0; i < DEVELOPMENT_CARDS.yearOfPlenty; i++) {
    deck.push({ type: 'yearOfPlenty' as DevelopmentCardType, used: false });
  }
  // Create monopoly cards
  for (let i = 0; i < DEVELOPMENT_CARDS.monopoly; i++) {
    deck.push({ type: 'monopoly' as DevelopmentCardType, used: false });
  }
  
  return deck;
};

// Function to initialize the complete GameState
export const initializeGame = (numPlayers: number = 2): GameState => {
  const board = initializeBoard(); // Get the initialized board
  const players = createInitialPlayers(numPlayers);
  const playerIds = Object.keys(players);

  // Find the hex where the robber starts (first desert hex)
  let initialRobberHexId = board.hexes.findIndex(hex => hex.type === 'desert');
  if (initialRobberHexId === -1) {
      console.warn('No desert hex found for initial robber placement!');
      // Place robber on first hex as fallback
      initialRobberHexId = 0; 
  }
  
  const developmentCardDeck = createDevelopmentCardDeck();

  const initialState: GameState = {
    players: Object.values(players),
    currentPlayer: playerIds[0], // First player starts
    board: {
        ...board, // Spread the initialized board
        robber: { hexId: initialRobberHexId } // Set initial robber position
    },
    phase: 'SETUP',
    turnNumber: 1,
    diceRolled: false,
    diceRoll: null,
    developmentCardDeck: developmentCardDeck,
    longestRoad: { playerId: null, length: 0 },
    largestArmy: { playerId: null, size: 0 },
    tradeOffer: null,
    playedDevelopmentCard: false,
    mustMoveRobber: false,
    setupPhase: {
      round: 1,
      direction: 'forward',
      settlementsPlaced: 0, 
      roadsPlaced: 0,
      // Removed settlementVertexId and roadEdgeId here, they belong to turn-specific state if needed
    }
  };

  return initialState;
}; 