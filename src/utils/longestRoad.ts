import { Edge, Vertex } from '../types/game';

interface RoadNetwork {
  visited: Set<number>;
  length: number;
}

function findLongestPath(
  startEdge: Edge,
  edges: Edge[],
  vertices: Vertex[],
  playerId: number,
  visited: Set<number> = new Set(),
  depth: number = 0
): number {
  if (depth > 30) return 0; // Prevent infinite recursion
  if (visited.has(startEdge.id)) return 0;
  if (!startEdge.road || startEdge.road.player !== playerId) return 0;

  visited.add(startEdge.id);
  let maxLength = 1;

  // Get connected edges through vertices
  const connectedEdges = startEdge.vertices.flatMap(vertexId => {
    const vertex = vertices.find(v => v.id === vertexId);
    if (!vertex) return [];
    
    // If there's an opponent's settlement/city, road path is blocked
    if (vertex.building && vertex.building.player !== playerId) {
      return [];
    }

    return vertex.adjacentEdges
      .filter(edgeId => edgeId !== startEdge.id)
      .map(edgeId => edges.find(e => e.id === edgeId))
      .filter((e): e is Edge => e !== undefined);
  });

  // Recursively find the longest path through each connected edge
  for (const nextEdge of connectedEdges) {
    const length = findLongestPath(
      nextEdge,
      edges,
      vertices,
      playerId,
      new Set(visited),
      depth + 1
    );
    maxLength = Math.max(maxLength, length + 1);
  }

  return maxLength;
}

export function calculateLongestRoad(
  edges: Edge[],
  vertices: Vertex[],
  playerId: number
): number {
  let maxRoadLength = 0;

  // Start from each edge owned by the player
  const playerEdges = edges.filter(edge => edge.road?.player === playerId);

  for (const startEdge of playerEdges) {
    const length = findLongestPath(startEdge, edges, vertices, playerId);
    maxRoadLength = Math.max(maxRoadLength, length);
  }

  return maxRoadLength;
}

export function updateLongestRoad(
  edges: Edge[],
  vertices: Vertex[],
  players: number[]
): { player: number | null; length: number } {
  let longestRoad = {
    player: null as number | null,
    length: 4 // Minimum length to get longest road
  };

  for (const playerId of players) {
    const roadLength = calculateLongestRoad(edges, vertices, playerId);
    if (roadLength > longestRoad.length) {
      longestRoad = {
        player: playerId,
        length: roadLength
      };
    }
  }

  return longestRoad;
} 