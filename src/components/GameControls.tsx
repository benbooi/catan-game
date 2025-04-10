import React from 'react';
import { Box, Button, HStack, Text, Heading, Divider } from '@chakra-ui/react';
import { useGameStore } from '../store/gameStore';

export function GameControls() {
  const { phase, currentPlayer, diceRoll, diceRolled, players, setupPhase } = useGameStore(state => ({
    phase: state.phase,
    currentPlayer: state.currentPlayer,
    diceRoll: state.diceRoll,
    diceRolled: state.diceRolled,
    players: state.players,
    setupPhase: state.setupPhase
  }));

  const dispatch = useGameStore(state => state.dispatch);

  const handleRollDice = () => {
    dispatch({ type: 'ROLL_DICE' });
  };

  const handleEndTurn = () => {
    dispatch({ type: 'END_TURN' });
  };

  // Find the current player's name
  const currentPlayerData = players.find(p => p.id === currentPlayer);
  const currentPlayerName = currentPlayerData?.name || 'Unknown Player';
  const currentPlayerColor = currentPlayerData?.color || 'gray';

  return (
    <Box borderWidth="1px" borderRadius="lg" p={4}>
      <Heading size="md" mb={3}>Game Controls</Heading>
      
      <Text fontWeight="bold" mb={2}>
        Current Player: <Text as="span" color={`${currentPlayerColor}.500`}>{currentPlayerName}</Text>
      </Text>
      
      <Text mb={3}>
        Phase: {phase} {setupPhase && `(Setup Round ${setupPhase.round})`}
      </Text>
      
      {diceRoll && <Text mb={3}>Dice Roll: {diceRoll}</Text>}
      
      <Divider my={3} />
      
      <HStack spacing={4}>
        <Button 
          onClick={handleRollDice} 
          colorScheme="blue" 
          isDisabled={phase !== 'ROLL' || diceRolled}>
          Roll Dice
        </Button>
        
        <Button 
          onClick={handleEndTurn} 
          colorScheme="green"
          isDisabled={phase === 'ROLL' && !diceRolled}>
          End Turn
        </Button>
      </HStack>
    </Box>
  );
} 