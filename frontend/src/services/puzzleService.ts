import api from './api';

export interface Puzzle {
  id: string;
  fen: string;
  moves: string[];
  rating: number;
  theme: string;
  difficulty: string;
  description?: string;
  attempted?: boolean;
}

export interface PuzzleStats {
  totalAttempts: number;
  totalSolved: number;
  successRate: number;
  avgTimeSpent: number;
  uniquePuzzles: number;
}

export const puzzleService = {
  async getDailyPuzzle(): Promise<Puzzle> {
    const response = await api.get('/puzzles/daily');
    return response.data;
  },

  async getRandomPuzzle(difficulty?: string, theme?: string, excludeIds?: string[]): Promise<Puzzle> {
    const params = new URLSearchParams();
    if (difficulty) params.append('difficulty', difficulty);
    if (theme) params.append('theme', theme);
    if (excludeIds && excludeIds.length > 0) params.append('excludeIds', excludeIds.join(','));

    const response = await api.get(`/puzzles/random?${params.toString()}`);
    return response.data;
  },

  async getPuzzle(id: string): Promise<Puzzle> {
    const response = await api.get(`/puzzles/${id}`);
    return response.data;
  },

  async solvePuzzle(id: string, solved: boolean, timeSpent: number): Promise<any> {
    const response = await api.post(`/puzzles/${id}/solve`, { solved, timeSpent });
    return response.data;
  },

  async getUserStats(): Promise<PuzzleStats> {
    const response = await api.get('/puzzles/stats/me');
    return response.data;
  },

  async getUserHistory(limit = 20): Promise<any[]> {
    const response = await api.get(`/puzzles/history/me?limit=${limit}`);
    return response.data;
  }
};
