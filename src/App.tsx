import { ChakraProvider, Box, Heading, VStack, Flex } from '@chakra-ui/react';
import { GameBoard } from './components/GameBoard';
import { PlayerPanel } from './components/PlayerPanel';
import { GameControls } from './components/GameControls';
import { useGameStore } from './store/gameStore'; // Assuming useGameStore provides the game state and dispatch
import { theme } from './theme';

function App() {
  // Get state and potentially dispatch from the store
  // const { dispatch } = useGameStore();
  // TODO: Implement a start game button or logic if needed
  // const handleStartGame = () => {
  //   dispatch({ type: 'START_GAME' }); // Example: START_GAME action needs to be defined
  // };

  return (
    <ChakraProvider theme={theme}>
      <Box p={5}>
        <Heading mb={4}>Catan Game</Heading>
        {/* Add start button if needed: <Button onClick={handleStartGame}>Start Game</Button> */}
        <Flex direction={{ base: 'column', lg: 'row' }} gap={6}>
          <VStack flex={1} spacing={4} align="stretch">
            <GameBoard />
            <GameControls />
          </VStack>
          <Box width={{ base: '100%', lg: '300px' }}>
            <PlayerPanel />
          </Box>
        </Flex>
      </Box>
    </ChakraProvider>
  );
}

export default App;
