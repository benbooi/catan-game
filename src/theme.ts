import { extendTheme } from '@chakra-ui/react';

// Define the theme with Catan-specific colors and styling
export const theme = extendTheme({
  colors: {
    brand: {
      50: '#e0f4ff',
      100: '#b9daff',
      200: '#90c0f8',
      300: '#66a6f0',
      400: '#3c8ce8',
      500: '#2272cf', // primary color
      600: '#1859a8',
      700: '#0d4080',
      800: '#03285a',
      900: '#001334',
    },
    brick: {
      500: '#C41E3A', // brick color
    },
    wood: {
      500: '#8B4513', // wood color
    },
    grain: {
      500: '#FFD700', // grain color
    },
    wool: {
      500: '#90EE90', // wool color
    },
    ore: {
      500: '#71797E', // ore color
    },
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: 'bold',
      },
      variants: {
        solid: {
          bg: 'brand.500',
          color: 'white',
          _hover: {
            bg: 'brand.600',
          },
        },
      },
    },
    Heading: {
      baseStyle: {
        fontFamily: 'heading',
        fontWeight: 'bold',
      },
    },
  },
  fonts: {
    heading: 'system-ui, -apple-system, sans-serif',
    body: 'system-ui, -apple-system, sans-serif',
  },
}); 