import { Box, Grid, HStack, Text, VStack, Badge, Button } from '@chakra-ui/react';
import { useGameStore } from '../store/gameStore';
import { ResourceType } from '../types/game';

const RESOURCE_COLORS = {
  brick: '#E57373',
  lumber: '#81C784',
  ore: '#90A4AE',
  grain: '#FDD835',
  wool: '#A5D6A7',
};

const PLAYER_COLORS = ['red', 'blue', 'white', 'orange'];

const ResourceCard = ({ type, count }: { type: ResourceType; count: number }) => (
  <Box
    bg={RESOURCE_COLORS[type]}
    p={2}
    borderRadius="md"
    boxShadow="md"
    textAlign="center"
    minW="80px"
  >
    <Text fontWeight="bold" textTransform="capitalize">{type}</Text>
    <Text fontSize="xl">{count}</Text>
  </Box>
);

export const PlayerPanel = () => {
  const { 
    players, 
    currentPlayer, 
    phase, 
    dispatch,
    canEndTurn
  } = useGameStore();

  const handleRollDice = () => {
    dispatch({ type: 'ROLL_DICE' });
  };

  const handleEndTurn = () => {
    dispatch({ type: 'END_TURN' });
  };

  return (
    <VStack spacing={4} align="stretch" w="300px" p={4} bg="gray.100" borderRadius="lg">
      {players.map((player, index) => (
        <Box
          key={index}
          p={4}
          bg={index === currentPlayer ? 'white' : 'gray.50'}
          borderRadius="md"
          borderWidth={2}
          borderColor={PLAYER_COLORS[index]}
          boxShadow={index === currentPlayer ? 'lg' : 'sm'}
        >
          <HStack justify="space-between" mb={2}>
            <Text fontWeight="bold" color={PLAYER_COLORS[index]}>
              {player.name}
            </Text>
            <Badge colorScheme={index === currentPlayer ? 'green' : 'gray'}>
              {index === currentPlayer ? 'Current Turn' : 'Waiting'}
            </Badge>
          </HStack>
          
          <Grid templateColumns="repeat(3, 1fr)" gap={2} mb={2}>
            {Object.entries(player.resources).map(([type, count]) => (
              <ResourceCard
                key={type}
                type={type as ResourceType}
                count={count}
              />
            ))}
          </Grid>

          <VStack spacing={2} align="stretch">
            <Text>Victory Points: {player.victoryPoints}</Text>
            {player.knights > 0 && (
              <Text>Knights Played: {player.knights}</Text>
            )}
            {player.buildings.roads.length > 0 && (
              <Text>Roads Built: {player.buildings.roads.length}</Text>
            )}
            {player.buildings.settlements.length > 0 && (
              <Text>Settlements: {player.buildings.settlements.length}</Text>
            )}
            {player.buildings.cities.length > 0 && (
              <Text>Cities: {player.buildings.cities.length}</Text>
            )}
          </VStack>

          {index === currentPlayer && (
            <HStack mt={4} justify="flex-end">
              {phase === 'ROLL' && (
                <Button 
                  size="sm" 
                  colorScheme="blue" 
                  onClick={handleRollDice}
                >
                  Roll Dice
                </Button>
              )}
              {canEndTurn() && (
                <Button 
                  size="sm" 
                  colorScheme="green" 
                  onClick={handleEndTurn}
                >
                  End Turn
                </Button>
              )}
            </HStack>
          )}
        </Box>
      ))}
    </VStack>
  );
}; 