import { extendTheme } from '@chakra-ui/react';
import { ResourceType } from '../types/game';

export const RESOURCE_COLORS: Record<ResourceType | 'desert', string> = {
  wood: '#1B5E20', // Dark green
  brick: '#B71C1C', // Dark red
  grain: '#F9A825', // Gold
  wool: '#81C784', // Light green
  ore: '#455A64', // Blue-grey
  desert: '#D7CCC8', // Light brown
};

export const PLAYER_COLORS = {
  red: 'red.600',
  blue: 'blue.600',
  green: 'green.600',
  orange: 'orange.600',
};

export const DICE_COLORS = [
  'gray.400',
  'red.600',
  'green.600',
  'blue.600',
  'purple.600',
  'yellow.600',
  'pink.600',
];

const theme = extendTheme({
  colors: {
    brand: {
      900: '#1a365d',
      800: '#153e75',
      700: '#2a69ac',
    },
  },
  fonts: {
    heading: '"Trebuchet MS", sans-serif',
    body: '"Trebuchet MS", sans-serif',
  },
  styles: {
    global: {
      body: {
        bg: 'gray.50',
        color: 'gray.800',
      },
    },
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: 'bold',
        borderRadius: 'md',
      },
      variants: {
        solid: {
          bg: 'brand.700',
          color: 'white',
          _hover: {
            bg: 'brand.800',
          },
        },
      },
    },
  },
});

export default theme; 