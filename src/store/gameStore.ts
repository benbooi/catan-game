import { create } from 'zustand';
import { GameState, GameAction, GameError } from '../types/gameState';
import { Player, ResourceType, DevelopmentCard, Hex, Vertex, Edge, Port, GamePhase } from '../types/game';
import { gameReducer } from '../reducers/gameReducer';
import { validateGameAction } from '../validators/gameValidator';
import { calculateLongestRoad } from '../utils/longestRoad';
// import { updateLongestRoad } from '../utils/longestRoad'; // Function doesn't exist or wasn't exported
import { calculateVictoryPoints } from '../utils/scoring'; // Assuming scoring utils exist
import { INITIAL_RESOURCES, DEVELOPMENT_CARDS } from '../constants/gameConstants';
import { initializeBoard } from '../initializers/boardInitializer'; // Assuming board initializer exists
import { v4 as uuidv4 } from 'uuid'; // Ensure uuid is installed

// Define the store state shape, aligning closely with GameState
interface GameStore extends GameState {
  error: GameError | null;
  dispatch: (action: GameAction) => void;
  // Add any UI-specific state if needed, distinct from core GameState
}

// Helper to create initial players
const createInitialPlayers = (numPlayers: number): Record<string, Player> => {
  const colors = ['red', 'blue', 'green', 'orange']; // Example colors
  const players: Record<string, Player> = {};
  for (let i = 0; i < numPlayers; i++) {
    const playerId = uuidv4();
    players[playerId] = {
      id: playerId,
      name: `Player ${i + 1}`,
      color: colors[i % colors.length],
      resources: { ...INITIAL_RESOURCES }, // Use initial resources constant
      developmentCards: [], // Start with empty array of DevelopmentCard objects
      score: 0, // Initialize score
      // Add other player-specific state like knights played, etc.
      knightsPlayed: 0,
      hasLargestArmy: false,
      hasLongestRoad: false,
    };
  }
  return players;
};

// Initialize the game state
// Assuming initializeBoard() returns a board object
const initialBoard = initializeBoard();
const initialPlayers = createInitialPlayers(2); // Start with 2 players
const initialPlayerIds = Object.keys(initialPlayers);

const initialState: GameState = {
  players: Object.values(initialPlayers),
  currentPlayer: initialPlayerIds[0], // Start with the first player
  board: initialBoard,
  phase: 'SETUP', // Initial phase
  turnNumber: 1,
  diceRoll: null,
  developmentCardDeck: [...DEVELOPMENT_CARDS], // Use the development cards from constants
  longestRoad: { playerId: null, length: 0 },
  largestArmy: { playerId: null, size: 0 },
  tradeOffer: null,
  playedDevelopmentCard: false, // Track if a card was played this turn
  mustMoveRobber: false,      // Flag set after rolling a 7
  setupPhase: { 
    round: 1, 
    direction: 'forward', 
    settlementsPlaced: 0, 
    roadsPlaced: 0 
  }, // Initial setup state
  diceRolled: false
};

// Create the Zustand store
export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,
  error: null,

  // Dispatch function to handle actions
  dispatch: (action: GameAction) => {
    const currentState = get();
    let nextState: GameState = { ...currentState }; // Start with current state
    let error: GameError | null = null;

    // 1. Validate Action
    // Create a temporary GameState without store-specific methods/properties
    const coreGameState: GameState = {
        players: currentState.players,
        currentPlayer: currentState.currentPlayer,
        board: currentState.board,
        phase: currentState.phase,
        turnNumber: currentState.turnNumber,
        diceRoll: currentState.diceRoll,
        developmentCardDeck: currentState.developmentCardDeck,
        longestRoad: currentState.longestRoad,
        largestArmy: currentState.largestArmy,
        tradeOffer: currentState.tradeOffer,
        playedDevelopmentCard: currentState.playedDevelopmentCard,
        mustMoveRobber: currentState.mustMoveRobber,
        setupPhase: currentState.setupPhase,
        winner: currentState.winner,
        diceRolled: currentState.diceRolled
    };
    error = validateGameAction(coreGameState, action);

    if (error) {
      console.error('Validation Error:', error);
      set({ error: error });
      return; // Stop processing if invalid action
    }

    // 2. Apply Action via Reducer
    try {
        // Pass the core game state to the reducer
      nextState = gameReducer(coreGameState, action);
    } catch (e: any) {
      console.error('Reducer Error:', e);
      set({ error: { code: 'INVALID_LOCATION', message: e.message || 'Error applying action.' }});
      return;
    }
    
    // 3. Post-Action Updates (Scoring, Longest Road, Largest Army, Winner Check)
    // These should ideally operate on the `nextState` produced by the reducer
    
    // Recalculate Longest Road
    const longestRoadResult = calculateLongestRoad(nextState);
    if (longestRoadResult.playerId !== nextState.longestRoad.playerId || longestRoadResult.length !== nextState.longestRoad.length) {
        // Update hasLongestRoad status for players
        const playersWithUpdatedRoad = [...nextState.players];
        const longestRoadPlayerIndex = playersWithUpdatedRoad.findIndex(p => p.id === nextState.longestRoad.playerId);
        const newLongestRoadPlayerIndex = playersWithUpdatedRoad.findIndex(p => p.id === longestRoadResult.playerId);
        
        if (longestRoadPlayerIndex !== -1) {
            playersWithUpdatedRoad[longestRoadPlayerIndex].hasLongestRoad = false;
        }
        if (newLongestRoadPlayerIndex !== -1) {
            playersWithUpdatedRoad[newLongestRoadPlayerIndex].hasLongestRoad = true;
        }
        
        nextState = { 
            ...nextState, 
            longestRoad: longestRoadResult,
            players: playersWithUpdatedRoad 
        };
    }

    // Recalculate Victory Points for all players
    let updatedPlayers = [...nextState.players];
    let potentialWinner: string | null = null;
    for (let i = 0; i < updatedPlayers.length; i++) {
        const playerId = updatedPlayers[i].id;
        const score = calculateVictoryPoints(nextState, playerId);
        updatedPlayers[i] = { ...updatedPlayers[i], score: score };
        if (score >= 10) { // Check for winner (use constant for VP goal)
            potentialWinner = playerId;
        }
    }
    nextState = { ...nextState, players: updatedPlayers };

    // Check for winner - needs to happen *after* all points are calculated
    if (potentialWinner && !nextState.winner) { // Only declare winner once
        nextState = { ...nextState, winner: potentialWinner, phase: 'FINISHED' as GamePhase };
    }

    // 4. Update Store State
    // Only include properties that are part of GameStore
    set({
        ...nextState, // Spread the updated core game state
        error: null, // Clear previous errors on success
        // Ensure store-specific properties are preserved if they weren't part of GameState
        // dispatch: currentState.dispatch // dispatch doesn't change
    });
  },
}));

// Optional: Selector for convenience
export const useGame = useGameStore; 