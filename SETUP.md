# Chess.com Clone - Setup Guide

## Quick Start Guide

This guide will help you get the Chess.com clone up and running in minutes.

## Prerequisites Checklist

Before starting, ensure you have:
- [ ] Node.js 18+ installed (`node --version`)
- [ ] PostgreSQL 15+ installed and running
- [ ] npm or yarn package manager
- [ ] Git (optional, for version control)

## Step-by-Step Setup

### 1. Database Setup

First, create and initialize the PostgreSQL database:

```bash
# Create the database
createdb chess_db

# Initialize the schema
psql -d chess_db -f backend/schema.sql
```

If you don't have PostgreSQL installed:
- **Windows**: Download from https://www.postgresql.org/download/windows/
- **Mac**: `brew install postgresql`
- **Linux**: `sudo apt-get install postgresql`

### 2. Environment Configuration

Copy the example environment file and configure it:

```bash
cd backend
cp .env.example .env
```

Edit `.env` and update these critical settings:

```env
PORT=5000
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/chess_db
JWT_SECRET=generate-a-secure-random-string-here
REFRESH_TOKEN_SECRET=another-secure-random-string-here
FRONTEND_URL=http://localhost:5173
```

**Important**: Replace `YOUR_PASSWORD` with your PostgreSQL password and generate secure random strings for JWT secrets.

To generate secure secrets, run in terminal:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Install Dependencies

All dependencies are already installed! But if needed:

```bash
# From project root
npm run install:all

# Or manually:
cd shared && npm install && npm run build
cd ../backend && npm install
cd ../frontend && npm install
```

### 4. Start the Application

Open **TWO** terminal windows:

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

You should see:
```
🚀 Server running on port 5000
📡 WebSocket server ready
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

You should see:
```
VITE v7.x.x ready in xxx ms
➜ Local: http://localhost:5173/
```

### 5. Access the Application

Open your browser and navigate to:
```
http://localhost:5173
```

You should see the Chess.com clone login page!

## Testing the Application

### 1. Create an Account
- Click "Sign up"
- Enter username, email, and password
- Password must be at least 8 characters with special characters

### 2. Start a Game
- After login, you'll see the home dashboard
- Click on any time control (Bullet, Blitz, Rapid, or Daily)
- Click "Find Opponent" to join matchmaking queue
- Open another browser window (incognito mode) and create a second account
- Join the same queue from the second account
- Both players will be matched and redirected to the game!

### 3. Play Chess
- Drag and drop pieces to make moves
- Time is tracked for each player
- Use game controls (Resign, Offer Draw)
- Game automatically detects checkmate, stalemate, and draws

## Common Issues & Solutions

### Issue: Cannot connect to database
**Solution**: 
- Ensure PostgreSQL is running: `pg_isready`
- Check DATABASE_URL in .env file
- Verify database exists: `psql -l | grep chess_db`

### Issue: "Module not found" errors
**Solution**:
```bash
# Rebuild shared types
cd shared
npm run build

# Reinstall dependencies
cd ../backend
rm -rf node_modules
npm install
```

### Issue: WebSocket connection fails
**Solution**:
- Ensure backend is running on port 5000
- Check browser console for errors
- Verify CORS settings in backend/src/server.ts

### Issue: Port already in use
**Solution**:
```bash
# Find process using port 5000 (backend)
# Windows:
netstat -ano | findstr :5000

# Kill process by PID
taskkill /PID <PID> /F

# Or change port in backend/.env
PORT=5001
```

## Development Tips

### Hot Reload
Both frontend and backend support hot reload:
- Backend: Changes to .ts files automatically restart server
- Frontend: Changes instantly reflect in browser

### Database Migrations
After schema changes:
```bash
psql -d chess_db -f backend/schema.sql
```

### View Logs
Backend logs appear in the terminal where you ran `npm run dev`

### Debug Mode
Add `console.log()` statements in your code. They'll appear in:
- Backend: Terminal output
- Frontend: Browser console (F12)

## Production Deployment

### Using Docker (Recommended)

1. Ensure Docker and Docker Compose are installed
2. Update docker-compose.yml with production secrets
3. Run:

```bash
docker-compose up -d
```

This will start:
- PostgreSQL database
- Redis cache
- Backend API server
- Frontend web server

### Manual Deployment

1. **Build the applications**:
```bash
cd shared && npm run build
cd ../backend && npm run build
cd ../frontend && npm run build
```

2. **Set up production database**:
```bash
createdb chess_db_prod
psql -d chess_db_prod -f backend/schema.sql
```

3. **Configure environment**:
- Update .env with production values
- Use strong secrets
- Set NODE_ENV=production

4. **Start with PM2** (process manager):
```bash
npm install -g pm2
cd backend
pm2 start dist/server.js --name chess-backend
```

5. **Serve frontend with Nginx**:
Copy frontend/dist to /var/www/chess and configure Nginx to serve it.

## Architecture Overview

```
┌─────────────┐         ┌──────────────┐         ┌──────────────┐
│   Browser   │◄───────►│   Frontend   │◄───────►│   Backend    │
│  (React)    │ WebSocket│  React+Vite  │  HTTP   │ Express+WS   │
└─────────────┘         └──────────────┘         └──────┬───────┘
                                                         │
                                                         ▼
                                                  ┌──────────────┐
                                                  │  PostgreSQL  │
                                                  │   Database   │
                                                  └──────────────┘
```

## Next Steps

Now that you have the basic application running, you can:

1. **Explore the codebase**:
   - Backend API routes in `backend/src/routes/`
   - Frontend pages in `frontend/src/pages/`
   - Shared types in `shared/src/types.ts`

2. **Add features**:
   - Implement chess puzzles
   - Add bot opponents with Stockfish
   - Build tournament system
   - Create social features

3. **Customize**:
   - Change color scheme in `frontend/tailwind.config.js`
   - Modify chess board themes
   - Add custom game modes

## Getting Help

- Check the main README.md for detailed documentation
- Review the SPECIFICATION.md for feature requirements
- Open GitHub issues for bugs or questions

## Success! 🎉

If you can play a game of chess between two accounts, congratulations! You've successfully set up a real-time multiplayer chess platform.

Happy coding! ♔♕♖♗♘♙
