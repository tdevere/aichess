import { Router } from 'express';
import { authenticate, optionalAuth } from '../middleware/auth';
import {
  getDailyPuzzle,
  getRandomPuzzle,
  getPuzzle,
  solvePuzzle,
  getUserPuzzleStats,
  getUserPuzzleHistory
} from '../controllers/puzzles';

const router = Router();

// Get daily puzzle (optional auth to check if attempted)
router.get('/daily', optionalAuth, getDailyPuzzle);

// Get random puzzle with optional filters
router.get('/random', optionalAuth, getRandomPuzzle);

// Get specific puzzle by ID
router.get('/:id', optionalAuth, getPuzzle);

// Submit puzzle solution (requires auth)
router.post('/:id/solve', authenticate, solvePuzzle);

// Get user's puzzle statistics (requires auth)
router.get('/stats/me', authenticate, getUserPuzzleStats);

// Get user's puzzle attempt history (requires auth)
router.get('/history/me', authenticate, getUserPuzzleHistory);

export default router;
