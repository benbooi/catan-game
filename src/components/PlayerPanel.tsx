import { Box, Flex, Text, HStack, VStack, Grid, Badge, Button, Heading, Divider } from '@chakra-ui/react';
import { FaWood, FaBrick, FaGrain, FaWool, FaMountain } from 'react-icons/fa';
import { GiWoodPile, GiBrickWall, GiWheat, GiWool, GiMining, GiSwordman, GiRoad, GiShield } from 'react-icons/gi';
import { useGameStore } from '../hooks/useGameStore';
import { ResourceType, Player } from '../types/game';
import { PLAYER_COLORS } from '../utils/theme';
import { isAIPlayer } from '../utils/aiPlayer';

// Resource icons mapping
const RESOURCE_ICONS = {
  wood: GiWoodPile,
  brick: GiBrickWall,
  grain: GiWheat,
  wool: GiWool,
  ore: GiMining,
};

// Resource colors
const RESOURCE_COLORS = {
  wood: 'green.600',
  brick: 'red.600',
  grain: 'yellow.500',
  wool: 'green.300',
  ore: 'gray.600',
};

const ResourceCounter = ({ type, count, showZero = false }: { type: ResourceType; count: number; showZero?: boolean }) => {
  if (count === 0 && !showZero) return null;
  
  const Icon = RESOURCE_ICONS[type];
  
  return (
    <HStack spacing={1} bg="white" px={2} py={1} borderRadius="md" shadow="sm">
      <Icon color={RESOURCE_COLORS[type]} />
      <Text fontSize="sm" fontWeight="medium">
        {count}
      </Text>
    </HStack>
  );
};

const PlayerCard = ({ player, isActive, isHuman }: { player: Player; isActive: boolean; isHuman: boolean }) => {
  return (
    <Box 
      p={3} 
      borderWidth="2px" 
      borderColor={isActive ? PLAYER_COLORS[player.color] : 'gray.200'} 
      borderRadius="md"
      bg={isActive ? `${PLAYER_COLORS[player.color]}10` : 'white'}
      transition="all 0.2s"
    >
      <Flex justify="space-between" align="center" mb={2}>
        <Heading size="sm" color={PLAYER_COLORS[player.color]}>
          {player.name} {isActive && <Badge colorScheme="green">Active</Badge>}
        </Heading>
        <HStack>
          <Text fontWeight="bold">{player.score} VP</Text>
          {isAIPlayer(player.name) && (
            <Badge colorScheme={
              player.name.includes('Beginner') || player.name.includes('Newbie') ? 'green' :
              player.name.includes('Master') || player.name.includes('Expert') ? 'red' :
              'blue'
            }>
              AI
            </Badge>
          )}
        </HStack>
      </Flex>
      
      <Divider mb={2} />
      
      <Text fontSize="xs" mb={1}>Resources:</Text>
      <Flex wrap="wrap" gap={1} mb={2}>
        {isHuman ? (
          // Show all resources for human player
          Object.entries(player.resources).map(([resource, count]) => (
            <ResourceCounter 
              key={resource} 
              type={resource as ResourceType} 
              count={count}
              showZero={true}
            />
          ))
        ) : (
          // Show resource count for AI players
          <Badge colorScheme="gray">
            {Object.values(player.resources).reduce((sum, count) => sum + count, 0)} cards
          </Badge>
        )}
      </Flex>
      
      <Grid templateColumns="1fr 1fr" gap={1} fontSize="xs">
        <HStack>
          <GiSwordman />
          <Text>Knights: {player.knightsPlayed}</Text>
        </HStack>
        <HStack>
          <GiRoad />
          <Text>Longest Road: {player.hasLongestRoad ? '✓' : '✗'}</Text>
        </HStack>
        <HStack>
          <GiShield />
          <Text>Dev Cards: {player.developmentCards.length}</Text>
        </HStack>
        <HStack>
          <Text>Largest Army: {player.hasLargestArmy ? '✓' : '✗'}</Text>
        </HStack>
      </Grid>
    </Box>
  );
};

export const PlayerPanel = () => {
  const { players, currentPlayer, phase, rollDice, endTurn, restartGame, diceRoll, longestRoad, largestArmy } = useGameStore();
  
  const currentPlayerObj = players.find(p => p.id === currentPlayer)!;
  
  return (
    <VStack spacing={4} align="stretch">
      <Box p={4} borderWidth="1px" borderRadius="lg" bg="white">
        <Heading size="md" mb={4}>Game Info</Heading>
        <Flex justify="space-between" align="center" mb={3}>
          <Text>Phase:</Text>
          <Badge colorScheme={phase === 'ROLL' ? 'blue' : phase === 'MAIN' ? 'green' : 'purple'}>
            {phase}
          </Badge>
        </Flex>
        
        {diceRoll && (
          <Flex justify="space-between" align="center" mb={3}>
            <Text>Last Roll:</Text>
            <Badge colorScheme="blue" fontSize="lg" px={3}>
              {diceRoll}
            </Badge>
          </Flex>
        )}
        
        <Grid templateColumns="1fr 1fr" gap={2} mb={3}>
          <Box>
            <Text fontWeight="bold" fontSize="sm">Longest Road</Text>
            <Text>
              {longestRoad.playerId ? 
                players.find(p => p.id === longestRoad.playerId)?.name :
                'None'
              } ({longestRoad.length})
            </Text>
          </Box>
          
          <Box>
            <Text fontWeight="bold" fontSize="sm">Largest Army</Text>
            <Text>
              {largestArmy.playerId ? 
                players.find(p => p.id === largestArmy.playerId)?.name :
                'None'
              } ({largestArmy.size})
            </Text>
          </Box>
        </Grid>
        
        <Divider my={2} />
        
        <Text fontSize="sm" fontStyle="italic" textAlign="center">
          First player to reach 10 victory points wins!
        </Text>
        
        <Divider my={3} />
        
        <VStack spacing={2}>
          <Button 
            colorScheme="blue" 
            isFullWidth 
            onClick={rollDice}
            isDisabled={phase !== 'ROLL'}
          >
            Roll Dice
          </Button>
          
          <Button 
            colorScheme="green" 
            isFullWidth 
            onClick={endTurn}
            isDisabled={phase === 'ROLL'}
          >
            End Turn
          </Button>
          
          <Button 
            colorScheme="red" 
            variant="outline"
            size="sm"
            isFullWidth 
            onClick={restartGame}
          >
            Restart Game
          </Button>
        </VStack>
      </Box>
      
      <Box p={4} borderWidth="1px" borderRadius="lg" bg="white">
        <Heading size="md" mb={4}>Players</Heading>
        <VStack spacing={3} align="stretch">
          {players.map(player => (
            <PlayerCard 
              key={player.id} 
              player={player} 
              isActive={player.id === currentPlayer}
              isHuman={!isAIPlayer(player.name)}
            />
          ))}
        </VStack>
      </Box>
    </VStack>
  );
}; 