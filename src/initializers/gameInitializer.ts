import { GameState, GameInitializer } from '../types/gameLogic';
import { ResourceType, Player, Hex, Vertex, Edge } from '../types/game';
import { BOARD_LAYOUT, getHexVertices, getHexEdges, getNeighbors } from '../utils/boardLayout';
import { v4 as uuidv4 } from 'uuid';

const INITIAL_RESOURCES: Record<ResourceType, number> = {
  brick: 0,
  lumber: 0,
  ore: 0,
  grain: 0,
  wool: 0
};

const PLAYER_COLORS = ['red', 'blue', 'white', 'orange'];

const createInitialBoard = () => {
  const hexes: Hex[] = BOARD_LAYOUT.map((layout, index) => ({
    id: index,
    type: layout.type,
    number: layout.number || null,
    hasRobber: layout.type === 'desert',
    vertices: [],
    edges: []
  }));

  // Create vertices and edges
  const vertices: Vertex[] = [];
  const edges: Edge[] = [];
  let vertexId = 0;
  let edgeId = 0;

  // Create vertices for each hex
  hexes.forEach(hex => {
    const hexVertices = getHexVertices(hex.id, 0).map(coords => {
      const vertex: Vertex = {
        id: vertexId++,
        building: null,
        adjacentHexes: [hex.id],
        adjacentVertices: [],
        adjacentEdges: []
      };
      vertices.push(vertex);
      return vertex.id;
    });
    hex.vertices = hexVertices;

    // Create edges between vertices
    for (let i = 0; i < 6; i++) {
      const edge: Edge = {
        id: edgeId++,
        road: null,
        vertices: [hexVertices[i], hexVertices[(i + 1) % 6]],
        adjacentEdges: []
      };
      edges.push(edge);
      hex.edges.push(edge.id);
    }
  });

  // Connect adjacent vertices and edges
  hexes.forEach(hex => {
    const neighbors = getNeighbors(hex.id, 0);
    neighbors.forEach((neighbor, i) => {
      const neighborHex = hexes.find(h => h.id === neighbor[0]);
      if (neighborHex) {
        // Connect shared vertices
        const sharedVertices = hex.vertices.filter(v => 
          neighborHex.vertices.includes(v)
        );
        sharedVertices.forEach(v => {
          const vertex = vertices.find(vert => vert.id === v);
          if (vertex && !vertex.adjacentHexes.includes(neighborHex.id)) {
            vertex.adjacentHexes.push(neighborHex.id);
          }
        });

        // Connect shared edges
        const sharedEdges = hex.edges.filter(e => 
          neighborHex.edges.includes(e)
        );
        sharedEdges.forEach(e => {
          const edge = edges.find(edg => edg.id === e);
          if (edge) {
            edge.adjacentEdges.push(...neighborHex.edges.filter(ne => 
              ne !== e && edges.find(edg => edg.id === ne)?.vertices.some(v => 
                edge.vertices.includes(v)
              )
            ));
          }
        });
      }
    });
  });

  return { hexes, vertices, edges };
};

export const gameInitializer: GameInitializer = (numPlayers: number): GameState => {
  if (numPlayers < 2 || numPlayers > 4) {
    throw new Error('Invalid number of players');
  }

  const players: Player[] = Array(numPlayers).fill(null).map((_, i) => ({
    id: i,
    name: `Player ${i + 1}`,
    color: PLAYER_COLORS[i],
    resources: { ...INITIAL_RESOURCES },
    developmentCards: [],
    buildings: {
      settlements: [],
      cities: [],
      roads: []
    },
    knights: 0,
    victoryPoints: 0
  }));

  return {
    players,
    currentPlayer: 0,
    phase: 'SETUP',
    turnNumber: 1,
    diceRoll: null,
    setupPhase: {
      round: 1,
      direction: 'forward'
    },
    board: createInitialBoard(),
    longestRoad: {
      player: null,
      length: 0
    },
    largestArmy: {
      player: null,
      size: 0
    },
    tradeOffer: null
  };
}; 