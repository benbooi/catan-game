import { ChakraProvider, Container, Box, Heading, Grid, GridItem, Text, Button, Flex, useToast } from '@chakra-ui/react';
import { GameBoard } from './components/GameBoard';
import { PlayerPanel } from './components/PlayerPanel';
import { GameControls } from './components/GameControls';
import { useGameStore } from './hooks/useGameStore';
import { useEffect } from 'react';
import { isAIPlayer } from './utils/aiPlayer';
import theme from './utils/theme';

function App() {
  const { 
    phase, 
    currentPlayer, 
    players, 
    winner,
    restartGame 
  } = useGameStore();
  
  const toast = useToast();
  
  // Show toast for player's turn
  useEffect(() => {
    const player = players.find(p => p.id === currentPlayer);
    if (!player) return;
    
    // Don't show toast for AI players
    if (isAIPlayer(player.name)) return;
    
    if (phase === 'ROLL') {
      toast({
        title: `Your Turn!`,
        description: `Roll the dice to collect resources.`,
        status: 'info',
        duration: 3000,
        isClosable: true,
        position: 'top'
      });
    }
  }, [currentPlayer, phase, players, toast]);
  
  // Show toast for game winner
  useEffect(() => {
    if (winner) {
      const winningPlayer = players.find(p => p.id === winner);
      if (winningPlayer) {
        toast({
          title: `Game Over!`,
          description: `${winningPlayer.name} has won the game with 10 victory points!`,
          status: 'success',
          duration: 10000,
          isClosable: true,
          position: 'top'
        });
      }
    }
  }, [winner, players, toast]);
  
  return (
    <ChakraProvider theme={theme}>
      <Container maxW="1400px" py={8}>
        <Heading as="h1" mb={6} textAlign="center">
          Settlers of Catan
        </Heading>
        
        {winner ? (
          <Box textAlign="center" mb={8}>
            <Text fontSize="xl" color="green.600" fontWeight="bold" mb={4}>
              {players.find(p => p.id === winner)?.name} has won the game!
            </Text>
            <Button colorScheme="blue" onClick={restartGame}>
              Start New Game
            </Button>
          </Box>
        ) : (
          <Text mb={8} textAlign="center" color="gray.600">
            {phase === 'SETUP' ? (
              "Setup Phase: Place your initial settlements and roads"
            ) : (
              `${players.find(p => p.id === currentPlayer)?.name}'s Turn - Phase: ${phase}`
            )}
          </Text>
        )}
        
        <Grid 
          templateColumns={{ base: '1fr', lg: '3fr 1fr' }}
          gap={6}
        >
          <GridItem>
            <Box mb={4}>
              <GameBoard />
            </Box>
            <GameControls />
          </GridItem>
          
          <GridItem>
            <PlayerPanel />
          </GridItem>
        </Grid>
        
        <Text fontSize="sm" color="gray.500" mt={12} textAlign="center">
          Play against AI opponents of varying difficulty levels.
          <br />
          Build settlements and roads, trade resources, and be the first to reach 10 victory points!
        </Text>
      </Container>
    </ChakraProvider>
  );
}

export default App;
