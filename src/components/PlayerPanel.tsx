import { Box, Grid, HStack, Text, VStack, Badge, Button, Heading, Divider, Flex, Icon } from '@chakra-ui/react';
import { FaLeaf, FaMountain, FaTree, FaWarehouse, FaSheep, FaStar, FaRoad, FaCity, FaUserFriends, FaChessKnight } from 'react-icons/fa';
import { useGameStore } from '../store/gameStore';
import { ResourceType, Player } from '../types/game';
import { GameState } from '../types/gameState';

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

// Map ResourceType to an icon and color
const resourceInfo: Record<ResourceType, { icon: React.ElementType; color: string }> = {
  wood: { icon: FaTree, color: 'green.500' },
  brick: { icon: FaWarehouse, color: 'red.500' },
  ore: { icon: FaMountain, color: 'gray.500' },
  grain: { icon: FaLeaf, color: 'yellow.400' },
  wool: { icon: FaSheep, color: 'gray.200' },
};

// Function to get player stats (example - adapt based on actual state structure)
const getPlayerStats = (player: Player | undefined, board: GameState['board']) => {
   if (!player) return { settlements: 0, cities: 0, roads: 0, armySize: 0, vp: 0 };
   
   const settlements = Object.values(board.vertices).filter(v => v.building?.playerId === player.id && v.building.type === 'settlement').length;
   const cities = Object.values(board.vertices).filter(v => v.building?.playerId === player.id && v.building.type === 'city').length;
   const roads = Object.values(board.edges).filter(e => e.road?.playerId === player.id).length;
   const armySize = player.knightsPlayed || 0;
   const vp = player.score;
   
   return { settlements, cities, roads, armySize, vp };
}

export function PlayerPanel() {
  const { players, currentPlayer, longestRoad, largestArmy, phase, turnNumber, setupPhase, winner, board } = useGameStore(state => ({ 
      players: state.players, 
      currentPlayer: state.currentPlayer,
      longestRoad: state.longestRoad,
      largestArmy: state.largestArmy,
      phase: state.phase,
      turnNumber: state.turnNumber,
      setupPhase: state.setupPhase,
      winner: state.winner,
      board: state.board
  }));
  
  const dispatch = useGameStore(state => state.dispatch);
  const playerIds = players.map(p => p.id);

  const handleRollDice = () => {
    dispatch({ type: 'ROLL_DICE' });
  };

  const handleEndTurn = () => {
    dispatch({ type: 'END_TURN' });
  };

  return (
    <Box p={4} borderWidth="1px" borderRadius="lg" height="100%">
      <Heading size="md" mb={4}>Players</Heading>
      <VStack spacing={4} align="stretch">
         <Text fontSize="sm">Turn: {turnNumber} - Phase: {phase} {setupPhase ? `(Setup Round ${setupPhase.round})`: ''}</Text>
         {winner && <Text color="green.500" fontWeight="bold">Winner: {players.find(p => p.id === winner)?.name}</Text>}
        {players.map(player => {
          const isCurrent = player.id === currentPlayer;
          const stats = getPlayerStats(player, board);
          
          return (
            <Box key={player.id} p={3} borderWidth="2px" borderColor={isCurrent ? player.color || 'blue.500' : 'gray.200'} borderRadius="md">
              <Flex justify="space-between" align="center" mb={2}>
                 <Heading size="sm" color={player.color || 'black'}>{player.name} {isCurrent ? '(Current)' : ''}</Heading>
                 <Flex align="center">
                    <Icon as={FaStar} mr={1} color="yellow.400" />
                    <Text fontWeight="bold">{stats.vp}</Text>
                 </Flex>
              </Flex>
              <Divider my={2} />
              <Text fontSize="sm" mb={1}>Resources:</Text>
              <Flex wrap="wrap" gap={2} mb={2}>
                {(Object.keys(resourceInfo) as ResourceType[]).map(resource => (
                  <Flex key={resource} align="center" p={1} bg="gray.50" borderRadius="sm">
                     <Icon as={resourceInfo[resource].icon} color={resourceInfo[resource].color} mr={1}/> 
                     <Text fontSize="xs">{player.resources[resource]}</Text>
                  </Flex>
                ))}
              </Flex>
              <Text fontSize="sm" mb={1}>Stats:</Text>
               <Flex wrap="wrap" gap={2} fontSize="xs">
                   <Flex align="center"><Icon as={FaRoad} mr={1} /> Roads: {stats.roads}</Flex>
                   <Flex align="center"><Icon as={FaUserFriends} mr={1} /> Settl.: {stats.settlements}</Flex>
                   <Flex align="center"><Icon as={FaCity} mr={1} /> Cities: {stats.cities}</Flex>
                   <Flex align="center"><Icon as={FaChessKnight} mr={1} /> Army: {stats.armySize} {player.id === largestArmy.playerId ? '(Largest)' : ''}</Flex>
                   {player.id === longestRoad.playerId && <Flex align="center"><Icon as={FaRoad} mr={1} color="orange.400"/> Longest Road</Flex>}
               </Flex>
               <Text fontSize="sm" mt={2}>Dev Cards: {player.developmentCards.length}</Text>
            </Box>
          );
        })}
      </VStack>
    </Box>
  );
} 