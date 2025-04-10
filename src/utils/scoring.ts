import { GameState } from '../types/gameState';

/**
 * Calculate the victory points for a player
 */
export function calculateVictoryPoints(state: GameState, playerId: string): number {
  // Find the player
  const player = state.players.find(p => p.id === playerId);
  if (!player) return 0;
  
  let score = 0;
  
  // Count Settlements (1 point each)
  const settlements = Object.values(state.board.vertices)
    .filter(v => v.building?.playerId === playerId && v.building.type === 'settlement')
    .length;
  score += settlements;
  
  // Count Cities (2 points each)
  const cities = Object.values(state.board.vertices)
    .filter(v => v.building?.playerId === playerId && v.building.type === 'city')
    .length;
  score += cities * 2;
  
  // Add Victory Point cards
  const victoryPointCards = player.developmentCards.filter(card => 
    card.type === 'victoryPoint').length;
  score += victoryPointCards;
  
  // Add Longest Road bonus (2 points)
  if (state.longestRoad.playerId === playerId) {
    score += 2;
  }
  
  // Add Largest Army bonus (2 points)
  if (state.largestArmy.playerId === playerId) {
    score += 2;
  }
  
  return score;
} 