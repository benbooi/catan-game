import { useState } from 'react';
import { 
    Box, Button, Heading, VStack, HStack, Select, NumberInput, 
    NumberInputField, NumberInputStepper, NumberIncrementStepper, 
    NumberDecrementStepper, Text, Wrap, WrapItem, Divider 
} from '@chakra-ui/react';
import { useGameStore } from '../store/gameStore';
import { ResourceType } from '../types/game';

// Define resource information for UI
const resourceInfo: Record<ResourceType, { color: string }> = {
    wood: { color: 'green.500' },
    brick: { color: 'red.500' },
    ore: { color: 'gray.500' },
    grain: { color: 'yellow.400' },
    wool: { color: 'gray.200' },
};

export function Trading() {
  const { players, currentPlayer, dispatch, phase, tradeOffer, board } = useGameStore(state => ({ 
      players: state.players, 
      currentPlayer: state.currentPlayer,
      dispatch: state.dispatch,
      phase: state.phase,
      tradeOffer: state.tradeOffer,
      board: state.board // Needed for port calculations
  }));

  const [offerResources, setOfferResources] = useState<Partial<Record<ResourceType, number>>>({});
  const [requestResources, setRequestResources] = useState<Partial<Record<ResourceType, number>>>({});
  const [bankGiveResource, setBankGiveResource] = useState<ResourceType>('wood');
  const [bankReceiveResource, setBankReceiveResource] = useState<ResourceType>('brick');

  const player = players.find(p => p.id === currentPlayer);
  const canTrade = phase === 'MAIN';

  // Calculate bank trade ratio for the selected resource
  const calculateBankRatio = (resource: ResourceType): number => {
    let minRatio = 4;
    if (!player) return minRatio;
    const playerVertices = board.vertices
        .filter(v => v.building?.playerId === player.id)
        .map(v => v.id);
    board.ports?.forEach(port => {
        if (port.vertices.some(pv => playerVertices.includes(pv))) {
            if (port.type === 'any' || port.type === resource) {
                minRatio = Math.min(minRatio, port.ratio);
            }
        }
    });
    return minRatio;
  };
  const currentBankRatio = calculateBankRatio(bankGiveResource);

  const handleResourceChange = (
    type: 'offer' | 'request',
    resource: ResourceType,
    value: number
  ) => {
    const setter = type === 'offer' ? setOfferResources : setRequestResources;
    setter(prev => ({
      ...prev,
      [resource]: value,
    }));
  };

  const handleOfferTrade = () => {
      // TODO: Need UI to select target player(s) for the offer
      console.warn('Player-to-player trade offer UI needed');
      // Validation (basic client-side) - Store/validator handles full check
      const offerCount = Object.values(offerResources).reduce((s, c) => s + (c || 0), 0);
      const requestCount = Object.values(requestResources).reduce((s, c) => s + (c || 0), 0);
      if (!canTrade || tradeOffer || (offerCount === 0 && requestCount === 0)) return; 
      
      // Dispatch TRADE_OFFER action
      dispatch({ 
          type: 'TRADE_OFFER', 
          offer: offerResources, 
          request: requestResources 
      });
  };

  const handleAcceptTrade = () => {
      if (!canTrade || !tradeOffer) return;
      dispatch({ type: 'TRADE_ACCEPT' });
  };

  const handleRejectTrade = () => {
      if (!canTrade || !tradeOffer) return;
      dispatch({ type: 'TRADE_REJECT' });
  };

  const handleBankTrade = () => {
      if (!canTrade || bankGiveResource === bankReceiveResource) return;
      // Basic client-side check for resources
      if (!player || (player.resources[bankGiveResource] ?? 0) < currentBankRatio) return;
      
      dispatch({ 
          type: 'TRADE_BANK', 
          give: bankGiveResource, 
          receive: bankReceiveResource 
      });
  };

  if (!player) { 
      return <Box>Loading player data...</Box>;
  }

  const resourceTypes = Object.keys(resourceInfo) as ResourceType[];

  return (
    <Box p={4} borderWidth="1px" borderRadius="lg">
      <Heading size="md" mb={4}>Trading</Heading>
      <VStack spacing={6} align="stretch">
        {/* Bank Trading Section */}
        <Box>
          <Heading size="sm" mb={2}>Trade with Bank</Heading>
          <HStack spacing={2} mb={2}>
            <Text>Give:</Text>
            <Select value={bankGiveResource} onChange={(e) => setBankGiveResource(e.target.value as ResourceType)} size="sm">
              {resourceTypes.map(res => <option key={res} value={res}>{res} ({calculateBankRatio(res)}:1)</option>)}
            </Select>
            <Text>Receive:</Text>
            <Select value={bankReceiveResource} onChange={(e) => setBankReceiveResource(e.target.value as ResourceType)} size="sm">
              {resourceTypes.map(res => <option key={res} value={res}>{res}</option>)}
            </Select>
          </HStack>
          <Button 
             onClick={handleBankTrade} 
             isDisabled={!canTrade || bankGiveResource === bankReceiveResource || (player.resources[bankGiveResource] ?? 0) < currentBankRatio} 
             size="sm" 
             colorScheme="cyan"
          >
            Trade {currentBankRatio} {bankGiveResource} for 1 {bankReceiveResource}
          </Button>
        </Box>

        <Divider />

        {/* Player Trading Section */}
        <Box>
            <Heading size="sm" mb={2}>Offer Trade to Players</Heading>
            <VStack align="stretch" spacing={1} mb={2}>
                <Text fontSize="xs">You Offer:</Text>
                <Wrap spacing={2}>
                    {resourceTypes.map(resource => (
                        <WrapItem key={`offer-${resource}`}>
                            <HStack>
                                <Text minW="40px" fontSize="sm">{resource}:</Text>
                                <NumberInput size="xs" maxW="60px" min={0} max={player.resources[resource] ?? 0} 
                                    value={offerResources[resource] || 0} 
                                    onChange={(_, valNum) => handleResourceChange("offer", resource, valNum)}>
                                    <NumberInputField />
                                    <NumberInputStepper>
                                        <NumberIncrementStepper />
                                        <NumberDecrementStepper />
                                    </NumberInputStepper>
                                </NumberInput>
                            </HStack>
                        </WrapItem>
                    ))}
                </Wrap>
            </VStack>
            <VStack align="stretch" spacing={1} mb={2}>
                <Text fontSize="xs">You Request:</Text>
                <Wrap spacing={2}>
                    {resourceTypes.map(resource => (
                        <WrapItem key={`request-${resource}`}>
                            <HStack>
                                <Text minW="40px" fontSize="sm">{resource}:</Text>
                                <NumberInput size="xs" maxW="60px" min={0} 
                                    value={requestResources[resource] || 0}
                                    onChange={(_, valNum) => handleResourceChange("request", resource, valNum)}>
                                    <NumberInputField />
                                    <NumberInputStepper>
                                        <NumberIncrementStepper />
                                        <NumberDecrementStepper />
                                    </NumberInputStepper>
                                </NumberInput>
                            </HStack>
                        </WrapItem>
                    ))}
                </Wrap>
            </VStack>
            <Button onClick={handleOfferTrade} isDisabled={!canTrade || !!tradeOffer} size="sm" colorScheme="orange">
                Offer Trade
            </Button>
        </Box>

        {/* Active Trade Offer Section */}
        {tradeOffer && (
          <Box p={3} borderWidth="1px" borderRadius="md" bg="yellow.50">
            <Heading size="xs" mb={2}>Active Offer from {players.find(p => p.id === tradeOffer.playerId)?.name || "Unknown Player"}</Heading>
            <VStack align="stretch" fontSize="sm">
                <Text>Offering: {JSON.stringify(tradeOffer.offer)}</Text>
                <Text>Requesting: {JSON.stringify(tradeOffer.request)}</Text>
                {currentPlayer !== tradeOffer.playerId && (
                    <HStack mt={2}>
                        <Button onClick={handleAcceptTrade} isDisabled={!canTrade} size="xs" colorScheme="green">Accept</Button>
                        <Button onClick={handleRejectTrade} isDisabled={!canTrade} size="xs" colorScheme="red">Reject</Button>
                    </HStack>
                )}
                {currentPlayer === tradeOffer.playerId && (
                    <Text fontSize="xs" color="gray.600">(Waiting for others)</Text>
                )}
            </VStack>
          </Box>
        )}

      </VStack>
    </Box>
  );
} 