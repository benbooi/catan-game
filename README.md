# Catan

A web-based implementation of the classic board game Settlers of Catan using React, TypeScript, and Chakra UI.

## Features

- Full implementation of Catan game rules
- Beautiful and responsive UI
- Real-time game state management
- Support for 2-4 players
- Trading system with other players and bank
- Development cards
- Resource management
- Victory point tracking

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/catan.git
cd catan
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Start the development server:
```bash
npm run dev
# or
yarn dev
```

4. Open [http://localhost:5173](http://localhost:5173) in your browser.

## Game Rules

### Setup Phase
1. Players take turns placing their initial settlements and roads
2. First round goes clockwise, second round goes counter-clockwise
3. Players receive resources for their second settlement placement

### Main Game
1. Roll dice for resource production
2. Players can:
   - Build roads (1 brick, 1 lumber)
   - Build settlements (1 brick, 1 lumber, 1 wool, 1 grain)
   - Build cities (2 grain, 3 ore)
   - Buy development cards (1 ore, 1 wool, 1 grain)
   - Trade with other players or the bank
3. First player to reach 10 victory points wins

### Development Cards
- Knight: Move the robber and steal a resource
- Victory Point: Worth 1 victory point
- Road Building: Build 2 roads for free
- Year of Plenty: Take any 2 resources from the bank
- Monopoly: Name a resource and take all of that type from other players

### Trading
- Player trading: Negotiate resources with other players
- Bank trading: Trade 4 of one resource for 1 of another
- Port trading: If you have a settlement/city on a port, trade at 3:1 or 2:1 ratio

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Based on the board game Settlers of Catan by Klaus Teuber
- Built with React, TypeScript, and Chakra UI
- Special thanks to the open-source community
