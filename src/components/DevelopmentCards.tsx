import { Box, Button, Grid, Text, VStack, useDisclosure } from '@chakra-ui/react';
import { useGameStore } from '../store/gameStore';
import { DevelopmentCardType } from '../types/game';

const CARD_COLORS = {
  knight: 'red.100',
  victoryPoint: 'yellow.100',
  roadBuilding: 'blue.100',
  yearOfPlenty: 'green.100',
  monopoly: 'purple.100'
};

const CARD_DESCRIPTIONS = {
  knight: 'Move the robber and steal 1 resource from an opponent',
  victoryPoint: 'Worth 1 victory point',
  roadBuilding: 'Build 2 roads for free',
  yearOfPlenty: 'Take any 2 resources from the bank',
  monopoly: 'Name 1 resource type and take all of that type from other players'
};

interface DevelopmentCardProps {
  type: DevelopmentCardType;
  canPlay: boolean;
  onClick: () => void;
}

const DevelopmentCard = ({ type, canPlay, onClick }: DevelopmentCardProps) => (
  <Box
    p={4}
    bg={CARD_COLORS[type]}
    borderRadius="md"
    boxShadow="md"
    cursor={canPlay ? 'pointer' : 'not-allowed'}
    onClick={canPlay ? onClick : undefined}
    _hover={canPlay ? { transform: 'scale(1.05)' } : undefined}
    transition="all 0.2s"
  >
    <VStack spacing={2}>
      <Text fontWeight="bold" textTransform="capitalize">
        {type.replace(/([A-Z])/g, ' $1').trim()}
      </Text>
      <Text fontSize="sm" textAlign="center">
        {CARD_DESCRIPTIONS[type]}
      </Text>
    </VStack>
  </Box>
);

export const DevelopmentCards = () => {
  const { 
    players, 
    currentPlayer, 
    dispatch,
    canPlayDevelopmentCard,
    canBuyDevelopmentCard
  } = useGameStore();

  const player = players[currentPlayer];

  const handleBuyCard = () => {
    dispatch({ type: 'BUY_DEVELOPMENT_CARD' });
  };

  const handlePlayCard = (cardType: DevelopmentCardType) => {
    dispatch({ type: 'PLAY_DEVELOPMENT_CARD', cardType });
  };

  return (
    <Box p={4} bg="white" borderRadius="lg" boxShadow="md">
      <VStack spacing={4} align="stretch">
        <Text fontSize="xl" fontWeight="bold">Development Cards</Text>
        
        {canBuyDevelopmentCard() && (
          <Button
            colorScheme="blue"
            onClick={handleBuyCard}
          >
            Buy Development Card
          </Button>
        )}

        <Grid templateColumns="repeat(2, 1fr)" gap={4}>
          {player.developmentCards.map((card, index) => (
            <DevelopmentCard
              key={index}
              type={card}
              canPlay={canPlayDevelopmentCard(card)}
              onClick={() => handlePlayCard(card)}
            />
          ))}
        </Grid>
      </VStack>
    </Box>
  );
}; 