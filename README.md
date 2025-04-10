# Catan Game

A web-based implementation of the classic board game Settlers of Catan using React, TypeScript, and Chakra UI.

## Demo

This game is deployed on GitHub Pages at [https://benbooi.github.io/catan-game/](https://benbooi.github.io/catan-game/).

Last updated: May 2023

## Features

- Simplified Catan game board with hexes, settlements, cities, and roads
- Build settlements and roads by clicking on the board
- Roll dice and take turns
- Track resources and victory points
- Mobile-responsive design

## Technologies Used

- React 18
- TypeScript 5
- Vite
- Chakra UI
- Zustand for state management
- React Icons

## Development

### Prerequisites

- Node.js 16+
- npm or yarn

### Installation

1. Clone the repository
   ```
   git clone https://github.com/benbooi/catan-game.git
   cd catan-game
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Start the development server
   ```
   npm run dev
   ```

4. Open [http://localhost:5173/catan-game/](http://localhost:5173/catan-game/) in your browser

### Build for Production

```
npm run build
```

This will create a `dist` folder with the built assets.

## Deployment

The project is set up to be deployed to GitHub Pages using GitHub Actions. Any push to the main branch will automatically trigger a deployment.

## Game Rules (Simplified)

- Players take turns rolling dice and collecting resources
- Build settlements (1 VP) and cities (2 VP) by clicking on intersections
- Build roads by clicking on edges between intersections
- First player to reach 10 victory points wins

## Future Improvements

- Implement full Catan rules including trading
- Add proper validation for building placement
- Improve visual design of the board
- Add multiplayer support

## License

MIT

## Acknowledgements

- Based on the board game [Settlers of Catan](https://www.catan.com/) by Klaus Teuber
- Built with [React](https://reactjs.org/), [TypeScript](https://www.typescriptlang.org/), and [Chakra UI](https://chakra-ui.com/)
