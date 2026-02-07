import { Response } from 'express';
import puzzleService from '../services/puzzleService';
import { AuthRequest } from '../middleware/auth';

/**
 * Get the daily puzzle
 */
export const getDailyPuzzle = async (req: AuthRequest, res: Response) => {
  try {
    const puzzle = await puzzleService.getDailyPuzzle();
    
    // Check if user has already attempted this puzzle
    if (req.userId) {
      const attempted = await puzzleService.hasUserAttempted(req.userId, puzzle.id);
      puzzle.attempted = attempted;
    }

    res.json(puzzle);
  } catch (error) {
    console.error('Get daily puzzle error:', error);
    res.status(500).json({ error: 'Failed to fetch daily puzzle' });
  }
};

/**
 * Get a random puzzle based on filters
 */
export const getRandomPuzzle = async (req: AuthRequest, res: Response) => {
  try {
    const { difficulty, theme, excludeIds } = req.query;
    
    const excludeArray = excludeIds 
      ? (typeof excludeIds === 'string' ? excludeIds.split(',') : [])
      : [];

    const puzzle = await puzzleService.getRandomPuzzle(
      difficulty as any,
      theme as any,
      excludeArray
    );

    // Check if user has already attempted this puzzle
    if (req.userId) {
      const attempted = await puzzleService.hasUserAttempted(req.userId, puzzle.id);
      puzzle.attempted = attempted;
    }

    res.json(puzzle);
  } catch (error) {
    console.error('Get random puzzle error:', error);
    res.status(500).json({ error: 'Failed to fetch puzzle' });
  }
};

/**
 * Get a specific puzzle by ID
 */
export const getPuzzle = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const puzzle = await puzzleService.getPuzzleById(id);

    // Check if user has already attempted this puzzle
    if (req.userId) {
      const attempted = await puzzleService.hasUserAttempted(req.userId, puzzle.id);
      puzzle.attempted = attempted;
    }

    res.json(puzzle);
  } catch (error) {
    console.error('Get puzzle error:', error);
    res.status(404).json({ error: 'Puzzle not found' });
  }
};

/**
 * Submit a puzzle solution attempt
 */
export const solvePuzzle = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;
    const { solved, timeSpent } = req.body;

    if (typeof solved !== 'boolean' || typeof timeSpent !== 'number') {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    await puzzleService.recordAttempt(req.userId, id, solved, timeSpent);

    // Get updated stats
    const stats = await puzzleService.getUserStats(req.userId);

    res.json({
      success: true,
      message: solved ? 'Puzzle solved!' : 'Keep trying!',
      stats
    });
  } catch (error) {
    console.error('Solve puzzle error:', error);
    res.status(500).json({ error: 'Failed to record puzzle attempt' });
  }
};

/**
 * Get user's puzzle statistics
 */
export const getUserPuzzleStats = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const stats = await puzzleService.getUserStats(req.userId);
    res.json(stats);
  } catch (error) {
    console.error('Get puzzle stats error:', error);
    res.status(500).json({ error: 'Failed to fetch puzzle statistics' });
  }
};

/**
 * Get user's puzzle attempt history
 */
export const getUserPuzzleHistory = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const history = await puzzleService.getUserAttempts(req.userId, limit);

    res.json(history);
  } catch (error) {
    console.error('Get puzzle history error:', error);
    res.status(500).json({ error: 'Failed to fetch puzzle history' });
  }
};
