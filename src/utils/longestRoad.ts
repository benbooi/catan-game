import { GameState } from '../types/gameState';
import { Edge } from '../types/game';

export function calculateLongestRoad(state: GameState): {
  playerId: string | null;
  length: number;
} {
  let longestRoadPlayer: string | null = state.longestRoad.playerId; // Start with current holder
  let maxLength = state.longestRoad.length; // Start with current length

  // Iterate through each player to check their longest road
  for (const player of state.players) {
    const playerId = player.id;
    const playerEdges = state.board.edges
        .filter(edge => edge.road?.playerId === playerId)
        .map(edge => edge.id);

    if (playerEdges.length === 0) continue;

    let playerMaxLength = 0;
    const visitedEdges = new Set<number>();

    // Find the longest path starting from each edge owned by the player
    for (const startEdgeId of playerEdges) {
      if (!visitedEdges.has(startEdgeId)) {
        // Use DFS or similar to find the longest path from this edge
        const currentPathLength = findLongestPathFromEdge(startEdgeId, playerId, state.board.edges, visitedEdges);
        playerMaxLength = Math.max(playerMaxLength, currentPathLength);
        // Note: Visited edges are updated within findLongestPathFromEdge to avoid redundant checks
      }
    }

    // Update overall longest road if this player's is longer and meets minimum length (usually 5)
    if (playerMaxLength >= 5 && playerMaxLength > maxLength) {
      maxLength = playerMaxLength;
      longestRoadPlayer = playerId;
    }
  }
  
  // If the current holder's longest road is now shorter than the new max (due to road breaking), update.
  // This requires recalculating the original holder's current max length.
  if (state.longestRoad.playerId && state.longestRoad.playerId !== longestRoadPlayer) {
      const originalHolderId = state.longestRoad.playerId;
      const originalHolderEdges = state.board.edges
        .filter(edge => edge.road?.playerId === originalHolderId)
        .map(edge => edge.id);
      
      let originalHolderMaxLength = 0;
      const visitedOriginalHolderEdges = new Set<number>();
       for (const startEdgeId of originalHolderEdges) {
            if (!visitedOriginalHolderEdges.has(startEdgeId)) {
                const currentPathLength = findLongestPathFromEdge(startEdgeId, originalHolderId, state.board.edges, visitedOriginalHolderEdges);
                originalHolderMaxLength = Math.max(originalHolderMaxLength, currentPathLength);
            }
        }
        
        // If the original holder no longer meets the criteria, they lose the title even if no one else beat the old max
        if (originalHolderMaxLength < 5 || originalHolderMaxLength < maxLength) {
             // No change needed if someone else already took the title
             // If no one took the title but the original holder fell below 5, reset longest road
             if (longestRoadPlayer === state.longestRoad.playerId && originalHolderMaxLength < 5) {
                  longestRoadPlayer = null;
                  maxLength = 0;
             } // else longestRoadPlayer is already updated or remains the old holder if still valid
        } else {
            // If original holder is still valid and nobody beat them, they keep it
             if (originalHolderMaxLength > maxLength) {
                 longestRoadPlayer = originalHolderId;
                 maxLength = originalHolderMaxLength;
             }
        }
  }

  return {
    playerId: longestRoadPlayer,
    length: maxLength,
  };
}

// Helper function using DFS to find the longest path of connected roads from a starting edge
function findLongestPathFromEdge(
    startEdgeId: number,
    playerId: string,
    allEdges: Edge[],
    globallyVisited: Set<number> // Keep track of edges visited across all starting points for efficiency
): number {
    let maxLength = 0;

    // Internal DFS helper
    function dfs(currentEdgeId: number, currentPath: number[], visitedInThisPath: Set<number>): void {
        visitedInThisPath.add(currentEdgeId);
        globallyVisited.add(currentEdgeId); // Mark globally visited
        currentPath.push(currentEdgeId);

        maxLength = Math.max(maxLength, currentPath.length);

        const neighbors = getConnectedNeighborEdges(currentEdgeId, playerId, allEdges);

        for (const neighborEdgeId of neighbors) {
            if (!visitedInThisPath.has(neighborEdgeId)) {
                dfs(neighborEdgeId, [...currentPath], new Set(visitedInThisPath));
            }
        }
    }

    dfs(startEdgeId, [], new Set<number>());
    return maxLength;
}

// Helper to get connected neighbor edges for a given edge owned by the player
function getConnectedNeighborEdges(
    edgeId: number,
    playerId: string,
    allEdges: Edge[]
): number[] {
    const edge = allEdges.find(e => e.id === edgeId);
    if (!edge || edge.road?.playerId !== playerId) return [];

    const neighbors: number[] = [];
    const [v1, v2] = edge.vertices;

    // Find other edges connected to v1 or v2 owned by the same player
    for (const otherEdge of allEdges) {
        if (otherEdge.id === edgeId) continue;

        if (otherEdge.road?.playerId === playerId) {
            // Check if the other edge shares a vertex, but ignore the vertex connecting back to the current edge if it's an endpoint in path
            // This simple adjacency check is okay for basic longest road calculation
            if (otherEdge.vertices.includes(v1) || otherEdge.vertices.includes(v2)) {
                neighbors.push(otherEdge.id);
            }
        }
    }
    return neighbors;
} 