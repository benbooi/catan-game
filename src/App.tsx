import { ChakraProvider, Box, VStack, Button, Text, HStack } from '@chakra-ui/react';
import { GameBoard } from './components/GameBoard';
import { useGameStore } from './store/gameStore';

function App() {
  const { currentPlayer, players, dice, rollDice, endTurn } = useGameStore();

  return (
    <ChakraProvider>
      <Box minH="100vh" bg="gray.50" py={8}>
        <VStack gap={8}>
          <Text fontSize="2xl" fontWeight="bold">
            Catan
          </Text>
          
          <HStack gap={4}>
            <Text>Current Player: {players[currentPlayer].name}</Text>
            <Button onClick={rollDice} colorScheme="blue">
              Roll Dice
            </Button>
            <Text>
              Last Roll: {dice.lastRoll ? `${dice.lastRoll[0]} + ${dice.lastRoll[1]}` : 'Not rolled'}
            </Text>
            <Button onClick={endTurn} colorScheme="green">
              End Turn
            </Button>
          </HStack>

          <GameBoard />
        </VStack>
      </Box>
    </ChakraProvider>
  );
}

export default App;
