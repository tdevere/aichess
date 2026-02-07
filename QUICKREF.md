# Chess.com Clone - Quick Reference

## 🚀 Quick Commands

### Development
```bash
# Start backend (terminal 1)
cd backend && npm run dev

# Start frontend (terminal 2)  
cd frontend && npm run dev

# Build shared types
cd shared && npm run build
```

### Database
```bash
# Create database
createdb chess_db

# Initialize schema
psql -d chess_db -f backend/schema.sql

# Connect to database
psql -d chess_db

# Drop and recreate
dropdb chess_db && createdb chess_db && psql -d chess_db -f backend/schema.sql
```

### Docker
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild and start
docker-compose up -d --build
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout

### Games
- `GET /api/games/active` - Get active games
- `GET /api/games/history` - Get game history
- `GET /api/games/:id` - Get game details
- `POST /api/games/:id/move` - Make a move
- `POST /api/games/:id/resign` - Resign
- `POST /api/games/:id/draw/offer` - Offer draw
- `POST /api/games/:id/draw/accept` - Accept draw

## 🔌 WebSocket Events

### Client → Server
- `join_game` - Join game room
- `leave_game` - Leave game room
- `make_move` - Make a move
- `resign` - Resign game
- `draw_offer` - Offer draw
- `join_queue` - Join matchmaking
- `leave_queue` - Leave matchmaking

### Server → Client
- `game_joined` - Joined game successfully
- `move_made` - Move was made
- `game_over` - Game ended
- `match_found` - Opponent found
- `time_update` - Time updated
- `error` - Error occurred

## 🗂️ Important Files

### Backend
- `backend/src/server.ts` - Main server
- `backend/src/socket.ts` - WebSocket handlers
- `backend/src/services/gameService.ts` - Game logic
- `backend/src/controllers/auth.ts` - Auth logic
- `backend/schema.sql` - Database schema
- `backend/.env` - Configuration

### Frontend
- `frontend/src/App.tsx` - Main app
- `frontend/src/pages/GamePage.tsx` - Game UI
- `frontend/src/hooks/useSocket.ts` - Socket hook
- `frontend/src/store/authStore.ts` - Auth state
- `frontend/src/services/api.ts` - API client

### Shared
- `shared/src/types.ts` - TypeScript types

## 🎨 Default Ports

- Frontend: http://localhost:5173
- Backend: http://localhost:5000
- PostgreSQL: localhost:5432
- Redis: localhost:6379 (when used)

## 🔑 Environment Variables

### Required
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/chess_db
JWT_SECRET=your-secret-here
REFRESH_TOKEN_SECRET=your-refresh-secret-here
```

### Optional
```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
REDIS_URL=redis://localhost:6379
```

## 🐛 Common Issues

### Port in use
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Unix
lsof -ti:5000 | xargs kill
```

### Database connection failed
```bash
# Check PostgreSQL is running
pg_isready

# Restart PostgreSQL
# Windows: Services → PostgreSQL
# Mac: brew services restart postgresql
# Linux: sudo systemctl restart postgresql
```

### Module not found
```bash
cd shared && npm run build
cd ../backend && npm install
cd ../frontend && npm install
```

## 📊 Database Quick Queries

```sql
-- List all users
SELECT id, username, email, elo_blitz FROM users;

-- List active games
SELECT * FROM games WHERE status = 'in_progress';

-- Count total games
SELECT COUNT(*) FROM games;

-- Get user's games
SELECT * FROM games 
WHERE white_player_id = 'user-id' OR black_player_id = 'user-id';

-- Delete all games (reset)
TRUNCATE games, moves CASCADE;
```

## 🧪 Testing Checklist

- [ ] User registration works
- [ ] User login works
- [ ] Matchmaking pairs users
- [ ] Board displays correctly
- [ ] Pieces can be moved
- [ ] Invalid moves rejected
- [ ] Time counts down
- [ ] Checkmate detected
- [ ] Resign works
- [ ] Game history saved

## 📦 Dependencies

### Backend Key Packages
- express - Web framework
- socket.io - WebSocket server
- chess.js - Chess logic
- jsonwebtoken - JWT auth
- bcrypt - Password hashing
- pg - PostgreSQL client

### Frontend Key Packages
- react - UI framework
- react-chessboard - Chess UI
- socket.io-client - WebSocket client
- zustand - State management
- axios - HTTP client

## 🎯 Development Workflow

1. Start PostgreSQL
2. Start backend (`cd backend && npm run dev`)
3. Start frontend (`cd frontend && npm run dev`)
4. Make changes
5. Test in browser
6. Commit changes

## 🔐 Security Notes

- Never commit .env files
- Use strong JWT secrets in production
- Enable HTTPS in production
- Validate all user inputs
- Use parameterized SQL queries
- Rate limit API endpoints

## 📈 Performance Tips

- Add database indexes for queries
- Use Redis for session storage
- Enable gzip compression
- Optimize bundle size
- Use connection pooling
- Cache static assets

## 🎓 Next Steps

1. Test the basic flow
2. Add chess puzzles
3. Integrate Stockfish for bots
4. Build tournament system
5. Add social features
6. Optimize performance
7. Deploy to production

---

**Need Help?** See README.md, SETUP.md, or BUILD_SUMMARY.md for more details.
