import { Box, Button, HStack, Text, Badge, VStack, Heading, Divider, Flex, useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, SimpleGrid, Select } from '@chakra-ui/react';
import { useGameStore } from '../hooks/useGameStore';
import { ResourceType } from '../types/game';
import { isAIPlayer } from '../utils/aiPlayer';
import { useState } from 'react';
import { hasEnoughResources } from '../utils/gameLogic';

export const GameControls = () => {
  const { 
    phase, 
    diceRoll, 
    rollDice, 
    endTurn, 
    currentPlayer, 
    players,
    buyDevelopmentCard,
    playDevelopmentCard,
    tradeWithBank
  } = useGameStore();

  const currentPlayerObj = players.find(p => p.id === currentPlayer);
  const isCurrentPlayerAI = currentPlayerObj ? isAIPlayer(currentPlayerObj.name) : false;
  
  // Development card modal state
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  // Trade modal state
  const { 
    isOpen: isTradeOpen, 
    onOpen: onTradeOpen, 
    onClose: onTradeClose 
  } = useDisclosure();
  
  // Selected card for playing
  const [selectedCard, setSelectedCard] = useState<number>(-1);
  
  // Resource selections for year of plenty and monopoly
  const [resourceChoices, setResourceChoices] = useState<ResourceType[]>([]);
  const [monopolyResource, setMonopolyResource] = useState<ResourceType>('wood');
  
  // Trade selections
  const [giveResource, setGiveResource] = useState<ResourceType>('wood');
  const [receiveResource, setReceiveResource] = useState<ResourceType>('brick');
  
  const handlePlayCard = () => {
    if (selectedCard === -1) return;
    
    const card = currentPlayerObj?.developmentCards[selectedCard];
    if (!card) return;
    
    // Handle different card types
    switch (card.type) {
      case 'knight':
        playDevelopmentCard(selectedCard);
        break;
      case 'roadBuilding':
        playDevelopmentCard(selectedCard);
        break;
      case 'yearOfPlenty':
        playDevelopmentCard(selectedCard, resourceChoices);
        break;
      case 'monopoly':
        playDevelopmentCard(selectedCard, undefined, monopolyResource);
        break;
      case 'victoryPoint':
        // Victory points are automatically counted
        break;
    }
    
    onClose();
  };
  
  const handleTrade = () => {
    tradeWithBank(giveResource, receiveResource);
    onTradeClose();
  };
  
  // To keep the UI simple for this demo, we'll focus on just rolling and ending turn
  return (
    <Box p={4} borderWidth="1px" borderRadius="lg" bg="white">
      <Heading size="md" mb={4}>Turn Controls</Heading>
      
      <VStack spacing={3} align="stretch">
        <HStack justifyContent="space-between">
          <Text>Current Phase:</Text>
          <Badge colorScheme={
            phase === 'ROLL' ? 'blue' : 
            phase === 'MAIN' ? 'green' : 
            phase === 'ROBBER' ? 'red' : 
            'purple'
          }>
            {phase}
          </Badge>
        </HStack>
        
        <HStack justifyContent="space-between">
          <Text>Current Player:</Text>
          <Text fontWeight="bold" color={`${currentPlayerObj?.color}.600`}>
            {currentPlayerObj?.name}
          </Text>
        </HStack>
        
        {diceRoll && (
          <HStack justifyContent="space-between">
            <Text>Last Roll:</Text>
            <Badge colorScheme="blue" fontSize="xl" px={3}>
              {diceRoll}
            </Badge>
          </HStack>
        )}
        
        <Divider my={2} />
        
        <VStack spacing={3}>
          {phase === 'ROLL' && (
            <Button 
              colorScheme="blue" 
              isFullWidth
              onClick={rollDice}
              isDisabled={isCurrentPlayerAI}
            >
              Roll Dice
            </Button>
          )}
          
          {phase === 'MAIN' && (
            <>
              <Button
                colorScheme="purple"
                isFullWidth
                onClick={onOpen}
                isDisabled={
                  isCurrentPlayerAI || 
                  !currentPlayerObj?.developmentCards.length || 
                  useGameStore.getState().playedDevelopmentCard
                }
              >
                Play Development Card
              </Button>
              
              <Button
                colorScheme="teal"
                isFullWidth
                onClick={buyDevelopmentCard}
                isDisabled={
                  isCurrentPlayerAI || 
                  !currentPlayerObj || 
                  !hasEnoughResources(currentPlayerObj, 'developmentCard')
                }
              >
                Buy Development Card
              </Button>
              
              <Button
                colorScheme="orange"
                isFullWidth
                onClick={onTradeOpen}
                isDisabled={isCurrentPlayerAI}
              >
                Trade with Bank
              </Button>
            </>
          )}
          
          {(phase === 'MAIN' || phase === 'ROBBER') && (
            <Button 
              colorScheme="green" 
              isFullWidth
              onClick={endTurn}
              isDisabled={phase === 'ROBBER' || isCurrentPlayerAI}
            >
              End Turn
            </Button>
          )}
        </VStack>
      </VStack>
      
      {/* Development card modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Play Development Card</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {currentPlayerObj?.developmentCards.length ? (
              <VStack spacing={4} align="stretch">
                <Text>Select a card to play:</Text>
                
                {currentPlayerObj.developmentCards
                  .filter(card => !card.used && card.turnPurchased < useGameStore.getState().turnNumber)
                  .map((card, index) => (
                    <Box 
                      key={index}
                      p={3}
                      borderWidth="1px"
                      borderRadius="md"
                      cursor="pointer"
                      bg={selectedCard === index ? 'blue.50' : 'white'}
                      borderColor={selectedCard === index ? 'blue.500' : 'gray.200'}
                      onClick={() => setSelectedCard(index)}
                    >
                      <Text fontWeight="bold">{card.type}</Text>
                      <Text fontSize="sm">
                        {card.type === 'knight' && "Move the robber and steal a resource"}
                        {card.type === 'roadBuilding' && "Build two roads for free"}
                        {card.type === 'yearOfPlenty' && "Take any two resources from the bank"}
                        {card.type === 'monopoly' && "Take all of one resource type from all players"}
                        {card.type === 'victoryPoint' && "Worth 1 victory point"}
                      </Text>
                    </Box>
                  ))}
                
                {selectedCard !== -1 && currentPlayerObj.developmentCards[selectedCard]?.type === 'yearOfPlenty' && (
                  <Box mt={3}>
                    <Text mb={2}>Select two resources to receive:</Text>
                    <SimpleGrid columns={2} spacing={2}>
                      {['wood', 'brick', 'grain', 'wool', 'ore'].map((resource) => (
                        <Button
                          key={resource}
                          size="sm"
                          colorScheme={resourceChoices.includes(resource as ResourceType) ? 'green' : 'gray'}
                          onClick={() => {
                            if (resourceChoices.includes(resource as ResourceType)) {
                              setResourceChoices(resourceChoices.filter(r => r !== resource));
                            } else if (resourceChoices.length < 2) {
                              setResourceChoices([...resourceChoices, resource as ResourceType]);
                            }
                          }}
                        >
                          {resource}
                        </Button>
                      ))}
                    </SimpleGrid>
                  </Box>
                )}
                
                {selectedCard !== -1 && currentPlayerObj.developmentCards[selectedCard]?.type === 'monopoly' && (
                  <Box mt={3}>
                    <Text mb={2}>Select a resource to monopolize:</Text>
                    <Select 
                      value={monopolyResource} 
                      onChange={(e) => setMonopolyResource(e.target.value as ResourceType)}
                    >
                      <option value="wood">Wood</option>
                      <option value="brick">Brick</option>
                      <option value="grain">Grain</option>
                      <option value="wool">Wool</option>
                      <option value="ore">Ore</option>
                    </Select>
                  </Box>
                )}
                
                <Button 
                  colorScheme="blue" 
                  onClick={handlePlayCard}
                  isDisabled={
                    selectedCard === -1 || 
                    (currentPlayerObj.developmentCards[selectedCard]?.type === 'yearOfPlenty' && resourceChoices.length !== 2)
                  }
                >
                  Play Card
                </Button>
              </VStack>
            ) : (
              <Text>You don't have any development cards yet.</Text>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
      
      {/* Trade modal */}
      <Modal isOpen={isTradeOpen} onClose={onTradeClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Trade with Bank</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4} align="stretch">
              <Box>
                <Text mb={2}>Give:</Text>
                <Select 
                  value={giveResource} 
                  onChange={(e) => setGiveResource(e.target.value as ResourceType)}
                >
                  <option value="wood">Wood</option>
                  <option value="brick">Brick</option>
                  <option value="grain">Grain</option>
                  <option value="wool">Wool</option>
                  <option value="ore">Ore</option>
                </Select>
              </Box>
              
              <Box>
                <Text mb={2}>Receive:</Text>
                <Select 
                  value={receiveResource} 
                  onChange={(e) => setReceiveResource(e.target.value as ResourceType)}
                >
                  <option value="wood">Wood</option>
                  <option value="brick">Brick</option>
                  <option value="grain">Grain</option>
                  <option value="wool">Wool</option>
                  <option value="ore">Ore</option>
                </Select>
              </Box>
              
              <Button 
                colorScheme="blue" 
                onClick={handleTrade}
                isDisabled={
                  !currentPlayerObj || 
                  currentPlayerObj.resources[giveResource] < 4 // Default trade ratio, doesn't account for ports
                }
              >
                Trade
              </Button>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}; 