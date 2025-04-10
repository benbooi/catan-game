import { Box, Button, Grid, HStack, Text, VStack } from '@chakra-ui/react';
import { GameBoard } from './components/GameBoard';
import { PlayerPanel } from './components/PlayerPanel';
import { DevelopmentCards } from './components/DevelopmentCards';
import { Trading } from './components/Trading';
import { useGameStore } from './store/gameStore';

function App() {
  const { startGame } = useGameStore();

  return (
    <Box p={8}>
      <VStack spacing={8} align="stretch">
        <HStack justify="space-between" align="center">
          <Text fontSize="3xl" fontWeight="bold">Catan</Text>
          <Button
            colorScheme="green"
            onClick={() => startGame(4)}
          >
            New Game
          </Button>
        </HStack>

        <Grid templateColumns="1fr auto" gap={8}>
          <Box>
            <GameBoard />
          </Box>
          
          <VStack spacing={8} minW="300px">
            <PlayerPanel />
            <DevelopmentCards />
            <Trading />
          </VStack>
        </Grid>
      </VStack>
    </Box>
  );
}

export default App;
