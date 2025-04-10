import React from 'react';
import { Box, Text, Circle, useDisclosure, VStack, Tooltip, useToast, Flex } from '@chakra-ui/react';
import { useGameStore } from '../hooks/useGameStore';
import { RESOURCE_COLORS, PLAYER_COLORS } from '../utils/theme';
import { HexType, BuildingType, ResourceType } from '../types/game';
import { canBuildSettlement, canBuildRoad, canBuildCity } from '../utils/gameLogic';
import { isAIPlayer } from '../utils/aiPlayer';
import { RiSwordLine } from 'react-icons/ri';

export const GameBoard = () => {
  const { 
    board, 
    phase, 
    currentPlayer, 
    players,
    buildSettlement, 
    buildRoad, 
    buildCity,
    moveRobber,
    setupPhase
  } = useGameStore();
  
  const toast = useToast();
  
  const currentPlayerObj = players.find(p => p.id === currentPlayer);
  const isCurrentPlayerAI = currentPlayerObj ? isAIPlayer(currentPlayerObj.name) : false;
  
  // Hex component
  const Hex = ({ id, type, number, position, hasRobber }: {
    id: number;
    type: HexType;
    number?: number;
    position: { x: number; y: number };
    hasRobber: boolean;
  }) => {
    const hexSize = 50;
    
    const handleClick = () => {
      // Only handle clicks during ROBBER phase when robber must be moved
      if (phase === 'ROBBER' && !isCurrentPlayerAI) {
        // Find players with buildings adjacent to this hex
        const adjacentVertices = board.vertices.filter(v => 
          v.adjacentHexes.includes(id) && v.building
        );
        
        // Get unique player IDs excluding current player
        const playerIds = [...new Set(
          adjacentVertices
            .map(v => v.building?.playerId)
            .filter(pid => pid && pid !== currentPlayer)
        )];
        
        if (playerIds.length > 0) {
          // If there are players to steal from, let user choose
          // In a real implementation, show a UI for player selection
          // For simplicity, just choose the first player
          moveRobber(id, playerIds[0] as string);
        } else {
          // No players to steal from
          moveRobber(id);
        }
      }
    };
    
    const numberColor = (number === 6 || number === 8) ? 'red.600' : 'black';
    const numberBg = (number === 6 || number === 8) ? 'red.50' : 'white';
    
    // Dots to represent probability
    const getProbabilityDots = (num?: number) => {
      if (!num) return null;
      
      const dots = Math.abs(7 - num);
      return (
        <Flex justify="center" mt={1}>
          {Array(dots).fill(0).map((_, i) => (
            <Box 
              key={i} 
              w="4px" 
              h="4px" 
              borderRadius="full" 
              bg={numberColor} 
              mx="1px" 
            />
          ))}
        </Flex>
      );
    };
    
    return (
      <Box 
        position="absolute"
        left={`${position.x - hexSize}px`}
        top={`${position.y - hexSize}px`}
        width={`${hexSize * 2}px`}
        height={`${hexSize * 2}px`}
        transform="rotate(30deg)"
        cursor={phase === 'ROBBER' ? 'pointer' : 'default'}
        onClick={handleClick}
        _before={{
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: RESOURCE_COLORS[type],
          clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
          opacity: 0.8,
        }}
      >
        <VStack
          position="absolute"
          top="50%"
          left="50%"
          transform="translate(-50%, -50%) rotate(-30deg)"
          spacing={0}
          zIndex={1}
          pointerEvents="none"
        >
          {number && (
            <Circle 
              size="30px" 
              bg={numberBg} 
              color={numberColor} 
              fontWeight="bold"
              fontSize="lg"
              boxShadow="sm"
            >
              {number}
            </Circle>
          )}
          {getProbabilityDots(number)}
          {hasRobber && (
            <Box 
              fontSize="2xl" 
              color="black" 
              mt={2} 
              bg="gray.100" 
              borderRadius="full" 
              p={1}
              opacity={0.8}
            >
              <RiSwordLine />
            </Box>
          )}
        </VStack>
      </Box>
    );
  };
  
  // Vertex (Settlement/City) component
  const VertexPoint = ({ id, position, building }: {
    id: number;
    position: { x: number; y: number };
    building?: { type: BuildingType; playerId: string };
  }) => {
    const handleClick = () => {
      if (isCurrentPlayerAI) return; // AI handles its own actions
      
      if (phase === 'SETUP') {
        // In setup phase, only place settlements
        if (setupPhase && setupPhase.settlementsPlaced > setupPhase.roadsPlaced) {
          toast({
            title: "Place a road first",
            status: "warning",
            duration: 2000,
          });
          return;
        }
        
        if (!canBuildSettlement({ ...useGameStore.getState() }, id, currentPlayer)) {
          toast({
            title: "Invalid location",
            status: "error",
            duration: 2000,
          });
          return;
        }
        
        buildSettlement(id);
      } else if (phase === 'MAIN') {
        if (building) {
          // Try to upgrade to city if it's a settlement owned by current player
          if (building.type === 'settlement' && building.playerId === currentPlayer) {
            if (!canBuildCity({ ...useGameStore.getState() }, id, currentPlayer)) {
              toast({
                title: "Not enough resources",
                description: "City requires 2 grain and 3 ore",
                status: "error",
                duration: 2000,
              });
              return;
            }
            
            buildCity(id);
          }
        } else {
          // Try to build new settlement
          if (!canBuildSettlement({ ...useGameStore.getState() }, id, currentPlayer)) {
            toast({
              title: "Invalid location or insufficient resources",
              description: "Settlements cost 1 wood, 1 brick, 1 wool, 1 grain",
              status: "error",
              duration: 2000,
            });
            return;
          }
          
          buildSettlement(id);
        }
      }
    };
    
    const showTooltip = phase === 'MAIN' || phase === 'SETUP';
    const isValidSettlement = !building && canBuildSettlement({ ...useGameStore.getState() }, id, currentPlayer);
    const isValidCity = building?.type === 'settlement' && 
                        building.playerId === currentPlayer && 
                        canBuildCity({ ...useGameStore.getState() }, id, currentPlayer);
    
    const size = building?.type === 'city' ? '20px' : '15px';
    const shape = building?.type === 'city' ? 'square' : 'circle';
    
    const vertexColor = building 
      ? PLAYER_COLORS[building.playerId as keyof typeof PLAYER_COLORS] 
      : (isValidSettlement && !isCurrentPlayerAI ? 'gray.300' : 'transparent');
    
    const vertexComponent = (
      <Box
        position="absolute"
        left={`${position.x}px`}
        top={`${position.y}px`}
        width={size}
        height={size}
        bg={vertexColor}
        border="2px solid"
        borderColor={building ? 'white' : (isValidSettlement && !isCurrentPlayerAI ? 'gray.400' : 'transparent')}
        borderRadius={shape === 'circle' ? '50%' : '3px'}
        transform="translate(-50%, -50%)"
        cursor={(isValidSettlement || isValidCity) && !isCurrentPlayerAI ? 'pointer' : 'default'}
        zIndex={10}
        onClick={handleClick}
        transition="all 0.2s"
        _hover={{ 
          transform: (isValidSettlement || isValidCity) && !isCurrentPlayerAI 
            ? 'translate(-50%, -50%) scale(1.2)' 
            : 'translate(-50%, -50%)' 
        }}
      />
    );
    
    return showTooltip && (isValidSettlement || isValidCity) && !isCurrentPlayerAI ? (
      <Tooltip 
        label={isValidCity ? "Upgrade to City" : "Build Settlement"} 
        placement="top"
      >
        {vertexComponent}
      </Tooltip>
    ) : vertexComponent;
  };
  
  // Edge (Road) component
  const EdgeLine = ({ id, vertices, road }: {
    id: number;
    vertices: [number, number];
    road?: { playerId: string };
  }) => {
    const v1 = board.vertices.find(v => v.id === vertices[0]);
    const v2 = board.vertices.find(v => v.id === vertices[1]);
    
    if (!v1 || !v2) return null;
    
    const handleClick = () => {
      if (isCurrentPlayerAI) return; // AI handles its own actions
      
      if (road) return; // Already has a road
      
      if (phase === 'SETUP') {
        // In setup phase, must place a settlement first
        if (setupPhase && setupPhase.settlementsPlaced <= setupPhase.roadsPlaced) {
          toast({
            title: "Place a settlement first",
            status: "warning",
            duration: 2000,
          });
          return;
        }
        
        if (!canBuildRoad({ ...useGameStore.getState() }, id, currentPlayer)) {
          toast({
            title: "Invalid location",
            status: "error",
            duration: 2000,
          });
          return;
        }
        
        buildRoad(id);
      } else if (phase === 'MAIN') {
        if (!canBuildRoad({ ...useGameStore.getState() }, id, currentPlayer)) {
          toast({
            title: "Invalid location or insufficient resources",
            description: "Roads cost 1 wood and 1 brick",
            status: "error",
            duration: 2000,
          });
          return;
        }
        
        buildRoad(id);
      }
    };
    
    // Calculate edge position and angle
    const x1 = v1.position.x;
    const y1 = v1.position.y;
    const x2 = v2.position.x;
    const y2 = v2.position.y;
    
    // Calculate angle for the road
    const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
    
    // Calculate length of the road
    const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    
    const isValidRoad = !road && canBuildRoad({ ...useGameStore.getState() }, id, currentPlayer);
    const showTooltip = phase === 'MAIN' || phase === 'SETUP';
    
    const roadComponent = (
      <Box
        position="absolute"
        left={`${x1}px`}
        top={`${y1}px`}
        width={`${length}px`}
        height={road ? '8px' : '6px'}
        bg={road 
          ? PLAYER_COLORS[road.playerId as keyof typeof PLAYER_COLORS] 
          : (isValidRoad && !isCurrentPlayerAI ? 'gray.300' : 'transparent')
        }
        transform={`rotate(${angle}deg)`}
        transformOrigin="left center"
        cursor={isValidRoad && !isCurrentPlayerAI ? 'pointer' : 'default'}
        zIndex={5}
        onClick={handleClick}
        opacity={road ? 1 : (isValidRoad && !isCurrentPlayerAI ? 0.5 : 0)}
        _hover={{ 
          opacity: isValidRoad && !isCurrentPlayerAI ? 1 : (road ? 1 : 0)
        }}
      />
    );
    
    return showTooltip && isValidRoad && !isCurrentPlayerAI ? (
      <Tooltip label="Build Road" placement="top">
        {roadComponent}
      </Tooltip>
    ) : roadComponent;
  };
  
  // Port component
  const Port = ({ type, ratio, position, rotation }: {
    type: ResourceType | 'any';
    ratio: number;
    position: { x: number; y: number; rotation: number };
  }) => {
    return (
      <Box
        position="absolute"
        left={`${position.x}px`}
        top={`${position.y}px`}
        transform={`translate(-50%, -50%) rotate(${rotation}deg)`}
        zIndex={3}
      >
        <Tooltip label={`${type === 'any' ? 'Any resource' : type} ${ratio}:1`}>
          <Box
            width="30px"
            height="40px"
            bg={type === 'any' ? 'gray.500' : RESOURCE_COLORS[type as HexType]}
            borderRadius="sm"
            display="flex"
            alignItems="center"
            justifyContent="center"
            fontSize="xs"
            fontWeight="bold"
            color="white"
            border="2px solid white"
          >
            {ratio}:1
          </Box>
        </Tooltip>
      </Box>
    );
  };
  
  return (
    <Box 
      position="relative" 
      width="100%" 
      height="600px" 
      overflow="hidden"
      border="1px solid"
      borderColor="gray.200"
      borderRadius="lg"
      bg="#b5e0f7" // Light blue for water
      boxShadow="lg"
    >
      {/* Render hexes */}
      {board.hexes.map((hex) => (
        <Hex
          key={`hex-${hex.id}`}
          id={hex.id}
          type={hex.type}
          number={hex.number}
          position={hex.position}
          hasRobber={hex.hasRobber}
        />
      ))}
      
      {/* Render edges (roads) */}
      {board.edges.map((edge) => (
        <EdgeLine
          key={`edge-${edge.id}`}
          id={edge.id}
          vertices={edge.vertices}
          road={edge.road}
        />
      ))}
      
      {/* Render vertices (settlements/cities) */}
      {board.vertices.map((vertex) => (
        <VertexPoint
          key={`vertex-${vertex.id}`}
          id={vertex.id}
          position={vertex.position}
          building={vertex.building}
        />
      ))}
      
      {/* Render ports */}
      {board.ports.map((port, index) => (
        <Port
          key={`port-${index}`}
          type={port.type}
          ratio={port.ratio}
          position={port.position}
        />
      ))}
      
      {/* Game phase indicator */}
      {phase === 'SETUP' && (
        <Box
          position="absolute"
          top="10px"
          left="50%"
          transform="translateX(-50%)"
          bg="white"
          color="black"
          px={4}
          py={2}
          borderRadius="md"
          fontWeight="bold"
          zIndex={20}
        >
          Setup Phase: {setupPhase?.round === 1 ? 'First' : 'Second'} Round
        </Box>
      )}
      
      {phase === 'ROBBER' && (
        <Box
          position="absolute"
          top="10px"
          left="50%"
          transform="translateX(-50%)"
          bg="red.500"
          color="white"
          px={4}
          py={2}
          borderRadius="md"
          fontWeight="bold"
          zIndex={20}
        >
          Move the Robber
        </Box>
      )}
    </Box>
  );
}; 