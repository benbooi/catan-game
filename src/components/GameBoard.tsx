import { Box, Grid, useColorModeValue } from '@chakra-ui/react';
import { useGameStore } from '../store/gameStore';
import { Hex } from '../types/game';

const HexTile = ({ hex }: { hex: Hex }) => {
  const bgColor = useColorModeValue(
    hex.type === 'desert' ? 'yellow.200' :
    hex.type === 'brick' ? 'red.200' :
    hex.type === 'lumber' ? 'green.200' :
    hex.type === 'ore' ? 'gray.200' :
    hex.type === 'grain' ? 'yellow.100' :
    'blue.200',
    'gray.700'
  );

  return (
    <Box
      w="100px"
      h="115px"
      bg={bgColor}
      clipPath="polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)"
      display="flex"
      alignItems="center"
      justifyContent="center"
      position="relative"
      border="1px solid"
      borderColor="gray.300"
    >
      {hex.number && (
        <Box
          position="absolute"
          top="50%"
          left="50%"
          transform="translate(-50%, -50%)"
          fontSize="xl"
          fontWeight="bold"
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
          h="20px"
          borderRadius="full"
          bg="black"
        />
      )}
    </Box>
  );
};

export const GameBoard = () => {
  const { board } = useGameStore();

  return (
    <Box p={4}>
      <Grid
        templateColumns="repeat(3, 1fr)"
        gap={2}
        maxW="400px"
        mx="auto"
      >
        {board.hexes.map((hex) => (
          <Box key={hex.id} display="flex" justifyContent="center">
            <HexTile hex={hex} />
          </Box>
        ))}
      </Grid>
    </Box>
  );
}; 