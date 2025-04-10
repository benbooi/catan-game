import { Box, Grid, SimpleGrid, Text, VStack, Circle, useToast } from '@chakra-ui/react';
import { useGameStore } from '../store/gameStore';
import { Hex, Vertex, Edge } from '../types/game';

const RESOURCE_COLORS = {
  brick: '#E57373', // red clay
  lumber: '#81C784', // dark forest green
  ore: '#90A4AE', // stone gray
  grain: '#FDD835', // wheat yellow
  wool: '#A5D6A7', // pasture light green
  desert: '#FFE0B2', // sand color
};

const PLAYER_COLORS = ['red', 'blue', 'white', 'orange'];

interface VertexProps {
  vertex: Vertex;
  canBuild: boolean;
  onClick: () => void;
}

const VertexPoint = ({ vertex, canBuild, onClick }: VertexProps) => {
  const size = vertex.building ? '20px' : '12px';
  const color = vertex.building?.player !== undefined 
    ? PLAYER_COLORS[vertex.building.player] 
    : canBuild ? 'green.300' : 'gray.300';
  
  return (
    <Circle
      position="absolute"
      left={`${vertex.x * 50}px`}
      top={`${vertex.y * 50}px`}
      size={size}
      bg={color}
      border="2px solid"
      borderColor="white"
      cursor={canBuild ? 'pointer' : 'not-allowed'}
      onClick={canBuild ? onClick : undefined}
      _hover={canBuild ? { transform: 'scale(1.2)' } : undefined}
      transition="all 0.2s"
    />
  );
};

interface EdgeProps {
  edge: Edge;
  canBuild: boolean;
  onClick: () => void;
}

const EdgeLine = ({ edge, canBuild, onClick }: EdgeProps) => {
  const color = edge.road?.player !== undefined 
    ? PLAYER_COLORS[edge.road.player] 
    : canBuild ? 'green.300' : 'gray.300';
  
  const [v1, v2] = edge.vertices;
  const angle = Math.atan2(v2.y - v1.y, v2.x - v1.x);
  const length = Math.sqrt(Math.pow(v2.x - v1.x, 2) + Math.pow(v2.y - v1.y, 2));
  
  return (
    <Box
      position="absolute"
      left={`${v1.x * 50}px`}
      top={`${v1.y * 50}px`}
      width={`${length * 50}px`}
      height="4px"
      bg={color}
      transform={`rotate(${angle}rad)`}
      transformOrigin="left"
      cursor={canBuild ? 'pointer' : 'not-allowed'}
      onClick={canBuild ? onClick : undefined}
      _hover={canBuild ? { opacity: 0.8 } : undefined}
      transition="all 0.2s"
    />
  );
};

interface HexProps {
  hex: Hex;
  canMoveRobber: boolean;
  onClick: () => void;
}

const HexTile = ({ hex, canMoveRobber, onClick }: HexProps) => {
  return (
    <Box
      position="relative"
      w="100px"
      h="115px"
      bg={RESOURCE_COLORS[hex.type]}
      clipPath="polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)"
      display="flex"
      alignItems="center"
      justifyContent="center"
      border="2px solid"
      borderColor="gray.300"
      transition="transform 0.2s"
      _hover={{ transform: canMoveRobber ? 'scale(1.05)' : 'none' }}
      cursor={canMoveRobber ? 'pointer' : 'default'}
      onClick={canMoveRobber ? onClick : undefined}
    >
      {hex.number && (
        <Box
          position="absolute"
          bg="white"
          borderRadius="full"
          w="30px"
          h="30px"
          display="flex"
          alignItems="center"
          justifyContent="center"
          fontSize="lg"
          fontWeight="bold"
          boxShadow="md"
        >
          {hex.number}
        </Box>
      )}
      {hex.hasRobber && (
        <Box
          position="absolute"
          top="50%"
          left="50%"
          transform="translate(-50%, -50%)"
          w="20px"
          h="40px"
          borderRadius="full"
          bg="black"
          zIndex={2}
        />
      )}
    </Box>
  );
};

export const GameBoard = () => {
  const { 
    board, 
    phase,
    currentPlayer,
    dispatch,
    canBuildSettlement,
    canBuildRoad,
    canBuildCity
  } = useGameStore();
  
  const handleVertexClick = (vertex: Vertex) => {
    if (canBuildSettlement(vertex.id)) {
      dispatch({ type: 'BUILD_SETTLEMENT', vertexId: vertex.id });
    } else if (canBuildCity(vertex.id)) {
      dispatch({ type: 'BUILD_CITY', vertexId: vertex.id });
    }
  };

  const handleEdgeClick = (edge: Edge) => {
    if (canBuildRoad(edge.id)) {
      dispatch({ type: 'BUILD_ROAD', edgeId: edge.id });
    }
  };

  const handleHexClick = (hex: Hex) => {
    if (phase === 'ROBBER' && !hex.hasRobber) {
      // For simplicity, we'll just steal from the next player
      const targetPlayer = (currentPlayer + 1) % board.players.length;
      dispatch({ 
        type: 'MOVE_ROBBER', 
        hexId: hex.id,
        targetPlayerId: targetPlayer
      });
    }
  };

  return (
    <Box
      position="relative"
      w="800px"
      h="600px"
      mx="auto"
      mt={8}
    >
      {board.hexes.map(hex => (
        <HexTile
          key={hex.id}
          hex={hex}
          canMoveRobber={phase === 'ROBBER' && !hex.hasRobber}
          onClick={() => handleHexClick(hex)}
        />
      ))}

      {board.edges.map(edge => (
        <EdgeLine
          key={edge.id}
          edge={edge}
          canBuild={canBuildRoad(edge.id)}
          onClick={() => handleEdgeClick(edge)}
        />
      ))}

      {board.vertices.map(vertex => (
        <VertexPoint
          key={vertex.id}
          vertex={vertex}
          canBuild={canBuildSettlement(vertex.id) || canBuildCity(vertex.id)}
          onClick={() => handleVertexClick(vertex)}
        />
      ))}
    </Box>
  );
}; 