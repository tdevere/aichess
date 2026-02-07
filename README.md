# Chess.com Clone

A full-featured chess platform built with React, TypeScript, Node.js, and PostgreSQL.

## Features

### Phase 1: MVP (Implemented)
- ✅ User authentication (JWT-based)
- ✅ Real-time chess gameplay
- ✅ Matchmaking system
- ✅ WebSocket-based game synchronization
- ✅ Interactive chessboard with drag-and-drop
- ✅ Game time controls (Bullet, Blitz, Rapid, Daily)
- ✅ Move validation with chess.js
- ✅ Game history tracking
- ✅ Bot opponents (Stockfish integration)

### Coming Soon
- Chess puzzles
- Lessons system
- Tournaments
- Social features (friends, chat)
- Leaderboards

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite for build tooling
- TailwindCSS for styling
- Zustand for state management
- Socket.io client for real-time communication
- react-chessboard for chess UI
- chess.js for game logic

### Backend
- Node.js with Express
- TypeScript
- PostgreSQL for database
- Socket.io for WebSocket connections
- JWT authentication
- bcrypt for password hashing

## Prerequisites

- Node.js 18+ 
- PostgreSQL 15+
- npm or yarn

## Installation

### 1. Clone the repository
```bash
git clone <repository-url>
cd aichess
```

### 2. Set up the database
```bash
# Create PostgreSQL database
createdb chess_db

# Run the schema
psql -d chess_db -f backend/schema.sql
```

### 3. Configure environment variables
```bash
cd backend
cp .env.example .env
# Edit .env with your database credentials and secrets
```

### 4. Install dependencies

#### Backend
```bash
cd backend
npm install
```

#### Frontend
```bash
cd frontend
npm install
```

#### Shared types
```bash
cd shared
npm install
npm run build
```

## Running the Application

### Development Mode

1. **Start the backend server**
```bash
cd backend
npm run dev
```
Server runs on http://localhost:5000

2. **Start the frontend**
```bash
cd frontend
npm run dev
```
Frontend runs on http://localhost:5173

### Production Build

#### Backend
```bash
cd backend
npm run build
npm start
```

#### Frontend
```bash
cd frontend
npm run build
npm run preview
```

## CI/CD (Azure App Service)

The GitHub Actions workflow in [.github/workflows/deploy.yml](.github/workflows/deploy.yml) builds the monorepo, packages the deploy artifact, deploys to the staging slot, and swaps to production.

Required GitHub Secrets:
- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`

Runtime configuration is managed in App Service settings (e.g., `DATABASE_URL`, `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`).

## Testing

**Test Coverage: 98% (50/51 tests passing)**

### Run All Tests
```bash
cd backend
npm test
```

### Individual Test Suites
```bash
# Authentication (12 tests)
npm run test:auth

# Puzzle API (16 tests)
npm run test:puzzles

# Bot Games (10 tests)
npm run test:bots

# Socket.IO Real-time (12 tests + 1 skipped)
npm run test:socket
```

### Test Features
- ✅ REST API integration tests with Supertest
- ✅ Socket.IO real-time event testing
- ✅ JWT authentication flows
- ✅ Matchmaking & game room functionality
- ✅ WebSocket connection handling
- ✅ Bot game creation and moves
- ✅ Puzzle retrieval and solving

## Project Structure

```
aichess/
├── backend/
│   ├── src/
│   │   ├── controllers/    # Request handlers
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # Express middleware
│   │   ├── db.ts           # Database connection
│   │   ├── server.ts       # Express app setup
│   │   └── socket.ts       # WebSocket handlers
│   ├── schema.sql          # Database schema
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   ├── store/          # Zustand stores
│   │   ├── hooks/          # Custom React hooks
│   │   ├── App.tsx         # Main app component
│   │   └── main.tsx        # Entry point
│   ├── package.json
│   └── vite.config.ts
└── shared/
    └── src/
        └── types.ts        # Shared TypeScript types

```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout user

### Games
- `GET /api/games/active` - Get user's active games
- `GET /api/games/history` - Get game history
- `GET /api/games/:id` - Get game details
- `POST /api/games` - Create new game
- `POST /api/games/:id/move` - Make a move
- `POST /api/games/:id/resign` - Resign game
- `POST /api/games/:id/draw/offer` - Offer draw
- `POST /api/games/:id/draw/accept` - Accept draw
- `POST /api/games/:id/abort` - Abort game

## WebSocket Events

### Game Events
- `join_game` - Join a game room
- `leave_game` - Leave a game room
- `make_move` - Make a chess move
- `move_made` - Broadcast move to players
- `game_over` - Game ended
- `resign` - Player resigned
- `draw_offer` - Draw offered
- `draw_response` - Draw accepted/declined

### Matchmaking Events
- `join_queue` - Join matchmaking queue
- `leave_queue` - Leave matchmaking queue
- `match_found` - Match found, game created

## Database Schema

Key tables:
- `users` - User accounts and ratings
- `games` - Chess games
- `moves` - Game moves history
- `puzzles` - Chess puzzles
- `lessons` - Learning content
- `tournaments` - Tournament data
- `friendships` - Social connections
- `notifications` - User notifications

See `backend/schema.sql` for complete schema.

## Development Guidelines

### Code Style
- Use TypeScript for type safety
- Follow ESLint and Prettier configurations
- Use functional components with hooks in React
- Keep components small and focused
- Use meaningful variable names

### Testing
```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## Deployment

### Docker (Recommended)
```bash
docker-compose up -d
```

### Manual Deployment
1. Build both frontend and backend
2. Set up PostgreSQL database
3. Configure environment variables
4. Use PM2 or similar for process management
5. Set up nginx as reverse proxy
6. Enable HTTPS with Let's Encrypt

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write tests
5. Submit a pull request

## License

MIT License

## Support

For issues and questions, please open a GitHub issue.
