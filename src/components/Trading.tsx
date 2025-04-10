import { Box, Button, Grid, HStack, NumberInput, NumberInputField, Select, Text, VStack, useDisclosure } from '@chakra-ui/react';
import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { ResourceType } from '../types/game';

const RESOURCE_COLORS = {
  brick: '#E57373',
  lumber: '#81C784',
  ore: '#90A4AE',
  grain: '#FDD835',
  wool: '#A5D6A7',
};

interface ResourceTradeProps {
  type: ResourceType;
  count: number;
  onChange: (count: number) => void;
}

const ResourceTrade = ({ type, count, onChange }: ResourceTradeProps) => (
  <Box
    p={2}
    bg={RESOURCE_COLORS[type]}
    borderRadius="md"
    boxShadow="sm"
  >
    <VStack spacing={1}>
      <Text fontWeight="bold" textTransform="capitalize">{type}</Text>
      <NumberInput
        value={count}
        onChange={(_, value) => onChange(value)}
        min={0}
        max={99}
        size="sm"
      >
        <NumberInputField textAlign="center" />
      </NumberInput>
    </VStack>
  </Box>
);

export const Trading = () => {
  const { 
    players, 
    currentPlayer, 
    dispatch,
    canOfferTrade,
    canAcceptTrade,
    canBankTrade,
    tradeOffer
  } = useGameStore();

  const [give, setGive] = useState<Partial<Record<ResourceType, number>>>({});
  const [want, setWant] = useState<Partial<Record<ResourceType, number>>>({});
  const [targetPlayer, setTargetPlayer] = useState<number | null>(null);

  const handleOfferTrade = () => {
    dispatch({ 
      type: 'OFFER_TRADE',
      give,
      want,
      toPlayer: targetPlayer
    });
  };

  const handleAcceptTrade = () => {
    dispatch({ type: 'ACCEPT_TRADE' });
  };

  const handleDeclineTrade = () => {
    dispatch({ type: 'DECLINE_TRADE' });
  };

  const handleBankTrade = (giveType: ResourceType, wantType: ResourceType) => {
    dispatch({
      type: 'BANK_TRADE',
      give: Array(4).fill(giveType),
      want: wantType
    });
  };

  // If there's an active trade offer for the current player
  if (tradeOffer && tradeOffer.to === currentPlayer) {
    const offeringPlayer = players[tradeOffer.from];
    return (
      <Box p={4} bg="white" borderRadius="lg" boxShadow="md">
        <VStack spacing={4} align="stretch">
          <Text fontSize="xl" fontWeight="bold">
            Trade Offer from {offeringPlayer.name}
          </Text>

          <Box>
            <Text fontWeight="bold">They Give:</Text>
            <Grid templateColumns="repeat(5, 1fr)" gap={2}>
              {Object.entries(tradeOffer.give).map(([type, count]) => (
                <Box
                  key={type}
                  p={2}
                  bg={RESOURCE_COLORS[type as ResourceType]}
                  borderRadius="md"
                  textAlign="center"
                >
                  <Text>{count}x {type}</Text>
                </Box>
              ))}
            </Grid>
          </Box>

          <Box>
            <Text fontWeight="bold">They Want:</Text>
            <Grid templateColumns="repeat(5, 1fr)" gap={2}>
              {Object.entries(tradeOffer.want).map(([type, count]) => (
                <Box
                  key={type}
                  p={2}
                  bg={RESOURCE_COLORS[type as ResourceType]}
                  borderRadius="md"
                  textAlign="center"
                >
                  <Text>{count}x {type}</Text>
                </Box>
              ))}
            </Grid>
          </Box>

          <HStack justify="flex-end" spacing={4}>
            <Button
              colorScheme="red"
              onClick={handleDeclineTrade}
            >
              Decline
            </Button>
            <Button
              colorScheme="green"
              onClick={handleAcceptTrade}
              isDisabled={!canAcceptTrade()}
            >
              Accept
            </Button>
          </HStack>
        </VStack>
      </Box>
    );
  }

  // For making trade offers
  return (
    <Box p={4} bg="white" borderRadius="lg" boxShadow="md">
      <VStack spacing={4} align="stretch">
        <Text fontSize="xl" fontWeight="bold">Trading</Text>

        <Box>
          <Text fontWeight="bold" mb={2}>Give:</Text>
          <Grid templateColumns="repeat(5, 1fr)" gap={2}>
            {(['brick', 'lumber', 'ore', 'grain', 'wool'] as ResourceType[]).map(type => (
              <ResourceTrade
                key={type}
                type={type}
                count={give[type] || 0}
                onChange={(count) => setGive({ ...give, [type]: count })}
              />
            ))}
          </Grid>
        </Box>

        <Box>
          <Text fontWeight="bold" mb={2}>Want:</Text>
          <Grid templateColumns="repeat(5, 1fr)" gap={2}>
            {(['brick', 'lumber', 'ore', 'grain', 'wool'] as ResourceType[]).map(type => (
              <ResourceTrade
                key={type}
                type={type}
                count={want[type] || 0}
                onChange={(count) => setWant({ ...want, [type]: count })}
              />
            ))}
          </Grid>
        </Box>

        <Box>
          <Text fontWeight="bold" mb={2}>Trade with:</Text>
          <Select
            placeholder="Select player"
            value={targetPlayer?.toString() || ''}
            onChange={(e) => setTargetPlayer(e.target.value ? parseInt(e.target.value) : null)}
          >
            <option value="">All Players</option>
            {players.map((player, index) => (
              index !== currentPlayer && (
                <option key={index} value={index}>
                  {player.name}
                </option>
              )
            ))}
          </Select>
        </Box>

        <Button
          colorScheme="blue"
          onClick={handleOfferTrade}
          isDisabled={!canOfferTrade()}
        >
          Offer Trade
        </Button>

        <Box>
          <Text fontWeight="bold" mb={2}>Bank Trade (4:1):</Text>
          <Grid templateColumns="repeat(5, 1fr)" gap={2}>
            {(['brick', 'lumber', 'ore', 'grain', 'wool'] as ResourceType[]).map(giveType => (
              <Box key={giveType}>
                <Text textAlign="center" mb={1}>Give 4 {giveType}</Text>
                <VStack spacing={1}>
                  {(['brick', 'lumber', 'ore', 'grain', 'wool'] as ResourceType[])
                    .filter(wantType => wantType !== giveType)
                    .map(wantType => (
                      <Button
                        key={wantType}
                        size="sm"
                        colorScheme="green"
                        onClick={() => handleBankTrade(giveType, wantType)}
                        isDisabled={!canBankTrade()}
                      >
                        Get 1 {wantType}
                      </Button>
                    ))}
                </VStack>
              </Box>
            ))}
          </Grid>
        </Box>
      </VStack>
    </Box>
  );
}; 