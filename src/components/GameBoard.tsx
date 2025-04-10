import React from 'react';
import { Box /*, Grid, SimpleGrid, Text, VStack, useToast*/ } from '@chakra-ui/react'; // Removed unused imports
import { useGameStore } from '../store/gameStore';
import { Hex, Vertex, Edge, ResourceType } from '../types/game';

// --- Color Mappings (ensure these match constants/theme) ---
const RESOURCE_COLORS: Record<ResourceType | 'desert', string> = {
  brick: '#C41E3A', // More reddish
  wood: '#8B4513', // SaddleBrown
  ore: '#71797E', // SlateGray
  grain: '#FFD700', // Gold
  wool: '#90EE90', // LightGreen
  desert: '#F4A460', // SandyBrown
};
const PLAYER_COLORS: Record<string, string> = {
  red: 'red.500',
  blue: 'blue.500',
  green: 'green.500',
  orange: 'orange.500',
  // Add more if needed
};

// --- Helper Functions for Rendering --- 

// Basic placeholder for Hex positioning - REPLACE with actual layout logic
const getHexPosition = (hexIndex: number, totalHexes: number): { top: string; left: string } => {
   // VERY basic grid layout - needs proper hex grid math
   const numCols = Math.ceil(Math.sqrt(totalHexes)); 
   const row = Math.floor(hexIndex / numCols);
   const col = hexIndex % numCols;
   const hexSize = 60; // Example size
   return { 
       top: `${row * hexSize * 0.8}px`, // Approximate vertical spacing
       left: `${col * hexSize + (row % 2 === 1 ? hexSize / 2 : 0)}px` // Approximate horizontal spacing with offset
   };
};

// Basic placeholder for Vertex positioning - REPLACE with actual layout logic
const getVertexPosition = (vertex: Vertex): { top: string; left: string } => {
   // Needs calculation based on connected hexes or absolute coords if available
   // Use vertex.x, vertex.y if they are pixel coordinates
   return { top: `${(vertex.y || 0) * 50}px`, left: `${(vertex.x || 0) * 50}px` }; // Example using x,y 
};

// Basic placeholder for Edge positioning/rotation - REPLACE with actual layout logic
const getEdgeStyle = (edge: Edge, vertices: Record<number, Vertex>): React.CSSProperties => {
   const v1 = vertices[edge.vertices[0]];
   const v2 = vertices[edge.vertices[1]];
   if (!v1 || !v2) return {}; 

   const midX = ((v1.x || 0) + (v2.x || 0)) / 2 * 50; // Example using x,y
   const midY = ((v1.y || 0) + (v2.y || 0)) / 2 * 50;
   const dx = (v2.x || 0) - (v1.x || 0);
   const dy = (v2.y || 0) - (v1.y || 0);
   const length = Math.sqrt(dx*dx + dy*dy) * 50; // Scale length
   const angle = Math.atan2(dy, dx) * (180 / Math.PI); 

   return {
      position: 'absolute',
      top: `${midY}px`, 
      left: `${midX - length / 2}px`, // Center the line horizontally
      width: `${length}px`, 
      height: '4px', 
      backgroundColor: 'black', // Default road color
      transform: `rotate(${angle}deg)`,
      transformOrigin: 'center left',
      zIndex: 1, 
   };
};

// --- GameBoard Component ---
export function GameBoard() {
  const { board, players, dispatch, phase, currentPlayer, setupPhase } = useGameStore(state => ({ 
      board: state.board,
      players: state.players,
      dispatch: state.dispatch,
      phase: state.phase,
      currentPlayer: state.currentPlayer,
      setupPhase: state.setupPhase
  }));
  // const toast = useToast(); // Keep if error/info toasts are needed

  const handleHexClick = (hexId: number) => {
      if (phase === 'ROBBER') {
          // TODO: Implement logic to select target player if needed
          dispatch({ type: 'MOVE_ROBBER', hexId });
      }
      // Other click logic?
  };

  const handleVertexClick = (vertexId: number) => {
     if (phase === 'SETUP' || phase === 'MAIN') {
        // Check if it's the setup phase for initial placement
        if (setupPhase && setupPhase.settlementsPlaced < (setupPhase.round === 1 ? 1 : 2)) {
             // Allow placing first/second settlement
             dispatch({ type: 'BUILD_SETTLEMENT', vertexId });
        } else if (phase === 'MAIN') {
             // Allow building settlement/city during main phase
            const vertex = board.vertices[vertexId];
            if (vertex?.building?.playerId === currentPlayer && vertex.building.type === 'settlement') {
                dispatch({ type: 'BUILD_CITY', vertexId });
            } else if (!vertex?.building) {
                dispatch({ type: 'BUILD_SETTLEMENT', vertexId });
            }
        }
     }
  };

 const handleEdgeClick = (edgeId: number) => {
     if (phase === 'SETUP' || phase === 'MAIN') {
        // Check setup phase conditions for road placement
        if (setupPhase && setupPhase.roadsPlaced < (setupPhase.round === 1 ? 1 : 2)) {
             // Allow placing first/second road linked to settlement
             dispatch({ type: 'BUILD_ROAD', edgeId });
        } else if (phase === 'MAIN') {
             dispatch({ type: 'BUILD_ROAD', edgeId });
        }
     }
  };


  return (
    <Box position="relative" height="600px" width="100%" borderWidth="1px" borderRadius="lg"> 
      {/* Render Hexes */}
      {board.hexes.map((hex, index) => {
        const pos = getHexPosition(index, board.hexes.length); // Use index for placeholder positioning
        const color = RESOURCE_COLORS[hex.type];
        const isRobberHex = board.robber.hexId === hex.id;

        return (
          <Box
            key={hex.id}
            position="absolute"
            top={pos.top}
            left={pos.left}
            width="60px" 
            height="70px" // Slightly taller for hex shape illusion
            bg={color}
            clipPath="polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" // Hexagon shape
            cursor={phase === 'ROBBER' ? 'pointer' : 'default'}
            onClick={() => handleHexClick(hex.id)}
            borderWidth={isRobberHex ? '3px' : '1px'}
            borderColor={isRobberHex ? 'black' : 'gray.300'}
            display="flex"
            alignItems="center"
            justifyContent="center"
            flexDirection="column"
          >
             {/* Display Hex Number Token */}
             {hex.number && (
                 <Box 
                     borderRadius="full" 
                     bg="whiteAlpha.800" 
                     w="25px" 
                     h="25px" 
                     display="flex" 
                     alignItems="center" 
                     justifyContent="center" 
                     fontWeight="bold"
                     fontSize="sm"
                     color={hex.number === 6 || hex.number === 8 ? 'red.600' : 'black'}
                     mb={1} // Margin bottom for number
                 >
                     {hex.number}
                 </Box>
             )}
             {/* Display Robber Icon/Indicator */}
             {isRobberHex && (
                 <Box fontSize="xl">&#9760;</Box> // Skull icon for robber
             )}
          </Box>
        );
      })}

      {/* Render Edges (Roads) */}
      {Object.entries(board.edges).map(([edgeId, edge]) => {
        const style = getEdgeStyle(edge, board.vertices);
        const playerColor = edge.road ? PLAYER_COLORS[players[edge.road.playerId]?.color] || 'gray' : 'transparent';
        return (
          <Box
            key={edgeId}
            {...style} // Apply calculated position, width, rotation
            height="6px" // Make roads thicker
            bg={playerColor} // Use player color if road exists
            borderRadius="sm"
            cursor="pointer"
            zIndex={2} // Roads on top of hexes but below vertices
            onClick={() => handleEdgeClick(Number(edgeId))} 
          />
        );
      })}
      
      {/* Render Vertices (Settlements/Cities) */}
      {Object.entries(board.vertices).map(([vertexId, vertex]) => {
        const pos = getVertexPosition(vertex);
        let buildingColor = 'transparent';
        let buildingSize = '15px';
        let buildingShape: React.CSSProperties = {};

        if (vertex.building) {
           // Corrected access to player color
           buildingColor = PLAYER_COLORS[players[vertex.building.playerId]?.color] || 'gray'; 
           if (vertex.building.type === 'city') {
               buildingSize = '20px';
               // Square shape for city
               buildingShape = { borderRadius: '2px' };
           } else {
               // Circle shape for settlement
               buildingShape = { borderRadius: 'full' }; 
           }
        }

        return (
          <Box
            key={vertexId}
            position="absolute"
            top={pos.top}
            left={pos.left}
            width={buildingSize}
            height={buildingSize}
            bg={buildingColor}
            border={!vertex.building ? '1px dashed gray' : '1px solid black'} // Indicate potential build spots
            transform="translate(-50%, -50%)" // Center the vertex marker
            cursor="pointer"
            zIndex={3} // Vertices on top
            {...buildingShape} // Apply shape style
            onClick={() => handleVertexClick(Number(vertexId))}
          />
        );
      })}

    </Box>
  );
} 