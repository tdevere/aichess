import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth';
import gameRoutes from './routes/games';
import userRoutes from './routes/users';
import puzzleRoutes from './routes/puzzles';
import lessonRoutes from './routes/lessons';
import tournamentRoutes from './routes/tournaments';
import socialRoutes from './routes/social';
import adminRoutes from './routes/admin';
import { setupSocketHandlers } from './socket';
import passport from 'passport';
import './config/passport';

dotenv.config();

const app: Express = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/users', userRoutes);
app.use('/api/puzzles', puzzleRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/admin', adminRoutes);

// Setup WebSocket handlers
setupSocketHandlers(io);

// Serve static frontend files in production
if (process.env.NODE_ENV === 'production') {
  const publicPath = path.join(__dirname, '../public');
  app.use(express.static(publicPath));
  
  // Handle SPA routing - validation for API calls is handled above, so this catches everything else
  app.get('*', (req, res) => {
    // skip API requests to avoid returning HTML for 404 API endpoints
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }
    res.sendFile(path.join(publicPath, 'index.html'));
  });
}

const PORT = process.env.PORT || 5000;

// Only start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 WebSocket server ready`);
  });
}

export { app, httpServer, io };
