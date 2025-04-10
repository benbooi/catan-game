import { GameState } from '../types/gameState';

interface RoadNetwork {
  edges: number[];
  length: number;
}

export function calculateLongestRoad(state: GameState): { playerId: string; length: number } {
  const playerRoads = new Map<string, RoadNetwork[]>();
  
  // Group roads by player
  state.board.edges.forEach((edge, index) => {
    if (edge.road) {
      const { playerId } = edge.road;
      if (!playerRoads.has(playerId)) {
        playerRoads.set(playerId, []);
      }
      playerRoads.get(playerId)?.push({ edges: [index], length: 1 });
    }
  });

  // Find longest road for each player
  let longestRoad = { playerId: '', length: 0 };
  
  playerRoads.forEach((networks, playerId) => {
    const maxLength = Math.max(...networks.map(n => n.length));
    if (maxLength > longestRoad.length) {
      longestRoad = { playerId, length: maxLength };
    }
  });

  return longestRoad;
}

function findConnectedRoads(
  state: GameState,
  startEdge: number,
  playerId: string,
  visited: Set<number>
): number[] {
  const connected: number[] = [];
  const edge = state.board.edges[startEdge];
  
  if (!edge.road || edge.road.playerId !== playerId) {
    return connected;
  }

  visited.add(startEdge);
  connected.push(startEdge);

  // Find adjacent edges through vertices
  const [vertex1, vertex2] = edge.vertices;
  const adjacentEdges = [
    ...getAdjacentEdges(vertex1),
    ...getAdjacentEdges(vertex2)
  ].filter(id => !visited.has(id));

  for (const adjEdgeId of adjacentEdges) {
    const adjEdge = state.board.edges[adjEdgeId];
    if (adjEdge.road?.playerId === playerId) {
      connected.push(...findConnectedRoads(state, adjEdgeId, playerId, visited));
    }
  }

  return connected;
}

function getAdjacentEdges(vertexId: number): number[] {
  // Implementation needed
  return [];
} 