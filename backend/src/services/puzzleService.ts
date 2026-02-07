import pool from '../db';
import { PuzzleDifficulty, PuzzleTheme } from '../../../shared/src/types';

export class PuzzleService {
  /**
   * Get the daily puzzle for today
   */
  async getDailyPuzzle(): Promise<any> {
    const today = new Date().toISOString().split('T')[0];
    
    // Use deterministic selection based on date
    const result = await pool.query(
      `SELECT id, fen, moves, rating, theme, difficulty, description, created_at
       FROM puzzles
       WHERE difficulty = $1
       ORDER BY md5($2 || id::text)
       LIMIT 1`,
      [PuzzleDifficulty.INTERMEDIATE, today]
    );

    if (result.rows.length === 0) {
      throw new Error('No puzzles available');
    }

    return this.formatPuzzle(result.rows[0]);
  }

  /**
   * Get a random puzzle filtered by difficulty and/or theme
   */
  async getRandomPuzzle(
    difficulty?: PuzzleDifficulty,
    theme?: PuzzleTheme,
    excludeIds: string[] = []
  ): Promise<any> {
    let query = `
      SELECT id, fen, moves, rating, theme, difficulty, description, created_at
      FROM puzzles
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (difficulty) {
      query += ` AND difficulty = $${paramCount}`;
      params.push(difficulty);
      paramCount++;
    }

    if (theme) {
      query += ` AND theme = $${paramCount}`;
      params.push(theme);
      paramCount++;
    }

    if (excludeIds.length > 0) {
      query += ` AND id != ALL($${paramCount})`;
      params.push(excludeIds);
      paramCount++;
    }

    query += ` ORDER BY RANDOM() LIMIT 1`;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      throw new Error('No puzzles matching criteria');
    }

    return this.formatPuzzle(result.rows[0]);
  }

  /**
   * Get puzzle by ID
   */
  async getPuzzleById(puzzleId: string): Promise<any> {
    const result = await pool.query(
      `SELECT id, fen, moves, rating, theme, difficulty, description, created_at
       FROM puzzles
       WHERE id = $1`,
      [puzzleId]
    );

    if (result.rows.length === 0) {
      throw new Error('Puzzle not found');
    }

    return this.formatPuzzle(result.rows[0]);
  }

  /**
   * Record a puzzle attempt
   */
  async recordAttempt(
    userId: string,
    puzzleId: string,
    solved: boolean,
    timeSpent: number
  ): Promise<void> {
    await pool.query(
      `INSERT INTO user_puzzle_attempts (user_id, puzzle_id, solved, attempts, time_spent)
       VALUES ($1, $2, $3, 1, $4)
       ON CONFLICT (user_id, puzzle_id)
       DO UPDATE SET
         solved = CASE WHEN user_puzzle_attempts.solved = false THEN $3 ELSE user_puzzle_attempts.solved END,
         attempts = user_puzzle_attempts.attempts + 1,
         time_spent = user_puzzle_attempts.time_spent + $4,
         created_at = CURRENT_TIMESTAMP`,
      [userId, puzzleId, solved, timeSpent]
    );
  }

  /**
   * Get user's puzzle statistics
   */
  async getUserStats(userId: string): Promise<any> {
    const result = await pool.query(
      `SELECT
         COUNT(*) as total_attempts,
         COUNT(*) FILTER (WHERE solved = true) as total_solved,
         AVG(time_spent) as avg_time_spent,
         COUNT(DISTINCT puzzle_id) as unique_puzzles
       FROM user_puzzle_attempts
       WHERE user_id = $1`,
      [userId]
    );

    const stats = result.rows[0];
    return {
      totalAttempts: parseInt(stats.total_attempts),
      totalSolved: parseInt(stats.total_solved),
      successRate: stats.total_attempts > 0 
        ? (parseInt(stats.total_solved) / parseInt(stats.total_attempts) * 100).toFixed(1)
        : 0,
      avgTimeSpent: stats.avg_time_spent ? parseFloat(stats.avg_time_spent).toFixed(1) : 0,
      uniquePuzzles: parseInt(stats.unique_puzzles)
    };
  }

  /**
   * Get user's puzzle attempt history
   */
  async getUserAttempts(userId: string, limit = 20): Promise<any[]> {
    const result = await pool.query(
      `SELECT 
         upa.puzzle_id,
         upa.solved,
         upa.attempts,
         upa.time_spent,
         upa.created_at,
         p.theme,
         p.difficulty,
         p.rating
       FROM user_puzzle_attempts upa
       JOIN puzzles p ON p.id = upa.puzzle_id
       WHERE upa.user_id = $1
       ORDER BY upa.created_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows.map(row => ({
      puzzleId: row.puzzle_id,
      solved: row.solved,
      attempts: row.attempts,
      timeSpent: row.time_spent,
      createdAt: row.created_at,
      theme: row.theme,
      difficulty: row.difficulty,
      rating: row.rating
    }));
  }

  /**
   * Check if user has attempted a puzzle
   */
  async hasUserAttempted(userId: string, puzzleId: string): Promise<boolean> {
    const result = await pool.query(
      `SELECT 1 FROM user_puzzle_attempts
       WHERE user_id = $1 AND puzzle_id = $2`,
      [userId, puzzleId]
    );

    return result.rows.length > 0;
  }

  /**
   * Format puzzle object for API response
   */
  private formatPuzzle(row: any): any {
    return {
      id: row.id,
      fen: row.fen,
      moves: JSON.parse(row.moves), // Parse JSON string to array
      rating: row.rating,
      theme: row.theme,
      difficulty: row.difficulty,
      description: row.description,
      createdAt: row.created_at
    };
  }
}

export default new PuzzleService();
