import { Hex, Vertex, Edge, Port, GameBoard, HexType, ResourceType } from '../types/game';
import { RESOURCE_DISTRIBUTION, NUMBER_TOKENS } from '../constants/gameConstants';

// Layout constants
const HEX_SIZE = 60; // Size of hexagon (distance from center to corner)
const HEX_WIDTH = HEX_SIZE * 2;
const HEX_HEIGHT = HEX_SIZE * Math.sqrt(3);
const BOARD_CENTER_X = 250;
const BOARD_CENTER_Y = 250;

// Coordinates for the standard Catan board layout
// Format: [row offset, column offset] from center
const HEX_POSITIONS = [
  [0, 0],    // Center
  [-1, 0], [-1, 1], [0, 1], [1, 0], [1, -1], [0, -1], // Inner ring
  [-2, 0], [-2, 1], [-2, 2], [-1, 2], [0, 2], [1, 1], [2, 0], [2, -1], [2, -2], [1, -2], [0, -2], [-1, -1] // Outer ring
];

// Convert hex grid coordinates to pixel coordinates
const getHexPosition = (row: number, col: number): { x: number, y: number } => {
  const x = BOARD_CENTER_X + col * (HEX_WIDTH * 0.75);
  const y = BOARD_CENTER_Y + row * HEX_HEIGHT;
  return { x, y };
};

// Generate the hexes for the board
export const generateHexes = (): Hex[] => {
  // Create array of resource types based on distribution
  const hexTypes: HexType[] = [];
  Object.entries(RESOURCE_DISTRIBUTION).forEach(([type, count]) => {
    for (let i = 0; i < count; i++) {
      hexTypes.push(type as HexType);
    }
  });
  
  // Shuffle resource types
  for (let i = hexTypes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [hexTypes[i], hexTypes[j]] = [hexTypes[j], hexTypes[i]];
  }
  
  // Shuffle number tokens (excluding 7)
  const numbers = [...NUMBER_TOKENS];
  for (let i = numbers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
  }
  
  // Create hexes
  const hexes: Hex[] = [];
  let desertIndex = -1;
  let numberIndex = 0;
  
  HEX_POSITIONS.forEach(([row, col], index) => {
    const position = getHexPosition(row, col);
    const type = hexTypes[index];
    const isDesert = type === 'desert';
    
    if (isDesert) {
      desertIndex = index;
    }
    
    hexes.push({
      id: index,
      type,
      number: isDesert ? undefined : numbers[numberIndex++],
      hasRobber: isDesert, // Robber starts on desert
      position
    });
  });
  
  return hexes;
};

// Generate vertices at the corners of hexes
export const generateVertices = (hexes: Hex[]): Vertex[] => {
  const vertices: Vertex[] = [];
  const vertexMap = new Map<string, number>(); // Map to track vertices by position
  
  // For each hex, create vertices at its 6 corners
  hexes.forEach(hex => {
    // Angles for the 6 corners of a hexagon (in radians)
    for (let i = 0; i < 6; i++) {
      const angle = Math.PI / 3 * i;
      const x = Math.round(hex.position.x + HEX_SIZE * Math.cos(angle));
      const y = Math.round(hex.position.y + HEX_SIZE * Math.sin(angle));
      
      // Create a key for this vertex position
      const key = `${x},${y}`;
      
      // If this vertex doesn't exist yet, create it
      if (!vertexMap.has(key)) {
        const vertexId = vertices.length;
        vertices.push({
          id: vertexId,
          position: { x, y },
          adjacentHexes: [hex.id],
          adjacentVertices: []
        });
        vertexMap.set(key, vertexId);
      } else {
        // If it exists, add this hex to its adjacent hexes
        const vertexId = vertexMap.get(key)!;
        vertices[vertexId].adjacentHexes.push(hex.id);
      }
    }
  });
  
  // Calculate adjacent vertices
  for (let i = 0; i < vertices.length; i++) {
    const vertex = vertices[i];
    
    // Find all vertices that share a hex with this one
    vertices.forEach((otherVertex, otherIndex) => {
      if (i === otherIndex) return; // Skip self
      
      // Check if they share any hexes
      const sharedHexes = vertex.adjacentHexes.filter(hexId => 
        otherVertex.adjacentHexes.includes(hexId)
      );
      
      if (sharedHexes.length > 0) {
        // Check if they're close enough to be connected (edges of same hex)
        const dx = vertex.position.x - otherVertex.position.x;
        const dy = vertex.position.y - otherVertex.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= HEX_SIZE * 1.1) { // Allow some margin for rounding errors
          if (!vertex.adjacentVertices.includes(otherIndex)) {
            vertex.adjacentVertices.push(otherIndex);
          }
        }
      }
    });
  }
  
  return vertices;
};

// Generate edges between adjacent vertices
export const generateEdges = (vertices: Vertex[]): Edge[] => {
  const edges: Edge[] = [];
  const edgeMap = new Set<string>(); // To avoid duplicate edges
  
  // For each vertex
  vertices.forEach((vertex, vertexId) => {
    // For each adjacent vertex
    vertex.adjacentVertices.forEach(adjVertexId => {
      // Create a unique key for this edge
      const edgeKey = [vertexId, adjVertexId].sort().join(',');
      
      // If we haven't created this edge yet
      if (!edgeMap.has(edgeKey)) {
        edges.push({
          id: edges.length,
          vertices: [vertexId, adjVertexId] as [number, number]
        });
        edgeMap.add(edgeKey);
      }
    });
  });
  
  return edges;
};

// Generate ports around the board
export const generatePorts = (vertices: Vertex[]): Port[] => {
  const ports: Port[] = [];
  
  // Shuffle port types
  const portTypes: (ResourceType | 'any')[] = [
    'wood', 'brick', 'ore', 'grain', 'wool',
    'any', 'any', 'any', 'any'
  ];
  
  for (let i = portTypes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [portTypes[i], portTypes[j]] = [portTypes[j], portTypes[i]];
  }
  
  // Find vertices on the outer edge of the board
  // We'll identify these by having fewer than 3 adjacent hexes
  const outerVertices = vertices
    .filter(v => v.adjacentHexes.length < 3)
    .map(v => v.id);
  
  // Group outer vertices to form port locations
  // In a real implementation, you'd need to ensure these are properly paired
  for (let i = 0; i < portTypes.length; i++) {
    // For simplicity, let's use sequential pairs of outer vertices
    const index1 = i * 2 % outerVertices.length;
    const index2 = (i * 2 + 1) % outerVertices.length;
    
    const vertex1 = vertices[outerVertices[index1]];
    const vertex2 = vertices[outerVertices[index2]];
    
    // Calculate port position (between the two vertices, but pushed outward)
    const midX = (vertex1.position.x + vertex2.position.x) / 2;
    const midY = (vertex1.position.y + vertex2.position.y) / 2;
    
    // Calculate vector from board center to midpoint
    const dirX = midX - BOARD_CENTER_X;
    const dirY = midY - BOARD_CENTER_Y;
    
    // Normalize and scale
    const length = Math.sqrt(dirX * dirX + dirY * dirY);
    const normalizedX = dirX / length;
    const normalizedY = dirY / length;
    
    // Position slightly outside the vertices
    const portX = midX + normalizedX * HEX_SIZE * 0.5;
    const portY = midY + normalizedY * HEX_SIZE * 0.5;
    
    // Calculate rotation angle
    const rotation = Math.atan2(dirY, dirX) * (180 / Math.PI);
    
    ports.push({
      type: portTypes[i],
      ratio: portTypes[i] === 'any' ? 3 : 2,
      vertices: [outerVertices[index1], outerVertices[index2]],
      position: {
        x: portX,
        y: portY,
        rotation
      }
    });
  }
  
  return ports;
};

// Generate a complete Catan board
export const generateBoard = (): GameBoard => {
  const hexes = generateHexes();
  const vertices = generateVertices(hexes);
  const edges = generateEdges(vertices);
  const ports = generatePorts(vertices);
  
  // Find desert hex for initial robber position
  const desertHex = hexes.find(hex => hex.type === 'desert');
  const robberHexId = desertHex ? desertHex.id : 0;
  
  return {
    hexes,
    vertices,
    edges,
    ports,
    robber: {
      hexId: robberHexId
    }
  };
}; 