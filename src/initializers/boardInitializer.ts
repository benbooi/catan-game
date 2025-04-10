import { Hex, Vertex, Edge, Port } from '../types/game';

/**
 * Initializes a basic Catan board with hexes, vertices, edges, and ports
 * This is a simplified implementation - a complete one would have proper hex coordinates
 * and follow the official Catan layout
 */
export function initializeBoard() {
  const hexes: Hex[] = [];
  const vertices: Record<number, Vertex> = {};
  const edges: Record<number, Edge> = {};
  const ports: Port[] = [];
  
  // Create 19 hexes (5 resource types + desert)
  // In a real implementation, these would be placed according to Catan rules
  // with specific coordinates to form the hexagonal board
  const resourceTypes = ['wood', 'brick', 'ore', 'grain', 'wool', 'desert'];
  const numbers = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12]; // Standard Catan number distribution
  
  // Create hexes with simple grid coordinates for demo
  for (let i = 0; i < 19; i++) {
    const resourceIndex = i % resourceTypes.length;
    const type = resourceTypes[resourceIndex] as any; // Cast to any to avoid type errors
    
    const hex: Hex = {
      id: i,
      type: type === 'desert' ? 'desert' : type, 
      hasRobber: type === 'desert', // Robber starts on desert
      number: type === 'desert' ? undefined : numbers[i % numbers.length],
      vertices: [], // Will be populated after vertices are created
      edges: [], // Will be populated after edges are created
    };
    
    hexes.push(hex);
  }
  
  // Create vertices (54 for a standard Catan board)
  for (let i = 0; i < 54; i++) {
    vertices[i] = {
      id: i,
      x: i % 9, // Simple grid for demo
      y: Math.floor(i / 9),
      adjacentVertices: [],
      adjacentEdges: [],
      // No initial buildings
    };
  }
  
  // Create edges (72 for a standard Catan board)
  for (let i = 0; i < 72; i++) {
    // For demo, connect adjacent vertices
    const v1 = i % 54; // Simplistic connection
    const v2 = (i + 1) % 54; // Simplistic connection
    
    edges[i] = {
      id: i,
      vertices: [v1, v2],
      // No initial roads
    };
    
    // Add edge to vertices' adjacentEdges
    vertices[v1].adjacentEdges.push(i);
    vertices[v2].adjacentEdges.push(i);
    
    // Add vertices to each other's adjacentVertices
    if (!vertices[v1].adjacentVertices.includes(v2)) {
      vertices[v1].adjacentVertices.push(v2);
    }
    if (!vertices[v2].adjacentVertices.includes(v1)) {
      vertices[v2].adjacentVertices.push(v1);
    }
  }
  
  // Add edges and vertices to hexes
  // In a real implementation, this would follow the geometric relationships
  // of a hexagonal grid
  hexes.forEach((hex, index) => {
    // For demo, assign 6 vertices to each hex in a simplistic way
    const startVertex = index * 3 % 54;
    for (let i = 0; i < 6; i++) {
      const vertexId = (startVertex + i) % 54;
      hex.vertices.push(vertexId);
    }
    
    // For demo, assign 6 edges to each hex in a simplistic way
    const startEdge = index * 3 % 72;
    for (let i = 0; i < 6; i++) {
      const edgeId = (startEdge + i) % 72;
      hex.edges.push(edgeId);
    }
  });
  
  // Create 9 ports (4 generic 3:1 ports and 5 resource-specific 2:1 ports)
  const portTypes = ['any', 'any', 'any', 'any', 'wood', 'brick', 'ore', 'grain', 'wool'];
  for (let i = 0; i < 9; i++) {
    const v1 = i * 6 % 54;
    const v2 = (v1 + 1) % 54;
    
    ports.push({
      type: portTypes[i] as any, // Cast to any to avoid type errors
      ratio: portTypes[i] === 'any' ? 3 : 2,
      vertices: [v1, v2]
    });
  }
  
  return {
    hexes,
    vertices,
    edges,
    ports,
    robber: {
      hexId: hexes.findIndex(h => h.type === 'desert')
    }
  };
} 