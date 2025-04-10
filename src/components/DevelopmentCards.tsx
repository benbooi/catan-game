import { Box, Button, Heading, VStack, Text, Wrap, WrapItem, Tooltip } from '@chakra-ui/react';
import { useGameStore } from '../store/gameStore';
import { DevelopmentCard, DevelopmentCardType } from '../types/game';
import { Player } from '../types/game';

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

const cardDisplayNames: Record<DevelopmentCardType, string> = {
  knight: 'Knight',
  victoryPoint: 'Victory Point',
  roadBuilding: 'Road Building',
  yearOfPlenty: 'Year of Plenty',
  monopoly: 'Monopoly',
};

export function DevelopmentCards() {
  const { 
    players, 
    currentPlayer, 
    dispatch,
    phase,
    turnNumber,
    playedDevelopmentCard
  } = useGameStore(state => ({ 
    players: state.players,
    currentPlayer: state.currentPlayer,
    dispatch: state.dispatch,
    phase: state.phase,
    turnNumber: state.turnNumber,
    playedDevelopmentCard: state.playedDevelopmentCard
  }));

  const player: Player | undefined = players[currentPlayer];

  const canInteract = phase === 'MAIN';

  const handleBuyCard = () => {
    if (!canInteract) return;
    dispatch({ type: 'BUY_DEVELOPMENT_CARD' });
  };

  const handlePlayCard = (cardIndex: number, card: DevelopmentCard) => {
    if (!canInteract || card.used || card.turnPurchased === turnNumber || playedDevelopmentCard || card.type === 'victoryPoint') {
      console.log("Cannot play card now");
      return;
    }
    let actionPayload: any = { cardIndex };

    if (card.type === 'yearOfPlenty') {
      console.warn("Year of Plenty resource selection UI needed!");
    }
    if (card.type === 'monopoly') {
      console.warn("Monopoly resource selection UI needed!");
    }

    dispatch({ type: 'PLAY_DEVELOPMENT_CARD', ...actionPayload });
  };

  if (!player) {
    return <Box>Loading player...</Box>;
  }

  return (
    <Box p={4} borderWidth="1px" borderRadius="lg">
      <Heading size="md" mb={4}>Development Cards</Heading>
      <VStack spacing={4} align="stretch">
        <Button 
          onClick={handleBuyCard} 
          isDisabled={!canInteract} 
          colorScheme="teal"
        >
          Buy Development Card (Ore, Wool, Grain)
        </Button>
        <Text>Your Cards:</Text>
        {player.developmentCards.length === 0 ? (
          <Text fontSize="sm" color="gray.500">No cards yet.</Text>
        ) : (
          <Wrap spacing={2}>
            {player.developmentCards.map((card, index) => (
              <WrapItem key={index}>
                <Tooltip 
                  label={card.used ? 'Used' : (card.turnPurchased === turnNumber ? `Bought turn ${card.turnPurchased}`: 'Ready')}
                  aria-label="Card status tooltip"
                >
                  <Button 
                    size="sm" 
                    variant={card.used ? 'outline' : 'solid'}
                    isDisabled={!canInteract || card.used || card.turnPurchased === turnNumber || playedDevelopmentCard || card.type === 'victoryPoint'}
                    onClick={() => handlePlayCard(index, card)}
                    colorScheme={card.used ? 'gray' : 'purple'}
                  >
                    {cardDisplayNames[card.type] || card.type} 
                  </Button>
                </Tooltip>
              </WrapItem>
            ))}
          </Wrap>
        )}
      </VStack>
    </Box>
  );
} 