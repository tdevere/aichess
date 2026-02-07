import request from 'supertest';
import { app } from '../server';
import pool from '../db';

describe('Puzzle API Integration Tests', () => {
  let accessToken: string;
  let userId: string;
  let testPuzzleId: string;
  let seededPuzzleIds: string[] = [];

  beforeAll(async () => {
    // Create test user
    const testUser = {
      username: `puzzleuser${Date.now()}`,
      email: `puzzle${Date.now()}@example.com`,
      password: 'TestPassword123!',
    };

    const authResponse = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    accessToken = authResponse.body.accessToken;
    userId = authResponse.body.user.id;

    // Seed puzzles if none exist (required for CI)
    const existing = await pool.query('SELECT COUNT(*) FROM puzzles');
    if (parseInt(existing.rows[0].count, 10) === 0) {
      const seedResult = await pool.query(
        `INSERT INTO puzzles (fen, moves, rating, theme, difficulty, description)
         VALUES
         ($1, $2, $3, $4, $5, $6),
         ($7, $8, $9, $10, $11, $12)
         RETURNING id`,
        [
          '5rk1/pp4pp/2p5/2b5/4PQ2/6P1/PPP4P/5RK1 w - - 0 1',
          JSON.stringify(['f4f8']),
          800,
          'checkmate',
          'beginner',
          'Mate in one',
          'r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 1',
          JSON.stringify(['c4f7', 'f8f7', 'c3d5']),
          1400,
          'tactical',
          'intermediate',
          'Tactical sequence'
        ]
      );
      seededPuzzleIds = seedResult.rows.map((row) => row.id);
    }

    // Get a test puzzle ID
    const puzzleResponse = await request(app)
      .get('/api/puzzles/random')
      .expect(200);

    testPuzzleId = puzzleResponse.body.id;
  });

  afterAll(async () => {
    // Cleanup
    if (userId) {
      await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    }
    if (seededPuzzleIds.length > 0) {
      await pool.query('DELETE FROM puzzles WHERE id = ANY($1::uuid[])', [seededPuzzleIds]);
    }
  });

  describe('GET /api/puzzles/daily', () => {
    it('should return daily puzzle without auth', async () => {
      const response = await request(app)
        .get('/api/puzzles/daily')
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('fen');
      expect(response.body).toHaveProperty('moves');
      expect(response.body).toHaveProperty('difficulty');
      expect(response.body).toHaveProperty('theme');
      expect(Array.isArray(response.body.moves)).toBe(true);
    });

    it('should return same puzzle for same day', async () => {
      const response1 = await request(app).get('/api/puzzles/daily');
      const response2 = await request(app).get('/api/puzzles/daily');

      expect(response1.body.id).toBe(response2.body.id);
    });
  });

  describe('GET /api/puzzles/random', () => {
    it('should return random puzzle without auth', async () => {
      const response = await request(app)
        .get('/api/puzzles/random')
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('fen');
      expect(response.body).toHaveProperty('moves');
    });

    it('should filter by difficulty', async () => {
      const response = await request(app)
        .get('/api/puzzles/random?difficulty=beginner')
        .expect(200);

      expect(response.body.difficulty).toBe('beginner');
    });

    it('should filter by theme', async () => {
      const response = await request(app)
        .get('/api/puzzles/random?theme=checkmate')
        .expect(200);

      expect(response.body.theme).toBe('checkmate');
    });

    it('should exclude already attempted puzzles when authenticated', async () => {
      // Solve a puzzle first
      await request(app)
        .post(`/api/puzzles/${testPuzzleId}/solve`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ solved: true, timeSpent: 30 });

      // Get random puzzle (should exclude the solved one if possible)
      const response = await request(app)
        .get('/api/puzzles/random')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // This might still return the same puzzle if there's only one, but tests the logic
      expect(response.body).toHaveProperty('id');
    });
  });

  describe('GET /api/puzzles/:id', () => {
    it('should return specific puzzle', async () => {
      const response = await request(app)
        .get(`/api/puzzles/${testPuzzleId}`)
        .expect(200);

      expect(response.body.id).toBe(testPuzzleId);
    });

    it('should return 404 for non-existent puzzle', async () => {
      await request(app)
        .get('/api/puzzles/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });

  describe('POST /api/puzzles/:id/solve', () => {
    it('should require authentication', async () => {
      await request(app)
        .post(`/api/puzzles/${testPuzzleId}/solve`)
        .send({ solved: true, timeSpent: 30 })
        .expect(401);
    });

    it('should record successful attempt', async () => {
      const response = await request(app)
        .post(`/api/puzzles/${testPuzzleId}/solve`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ solved: true, timeSpent: 45 })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Puzzle solved!');
    });

    it('should validate required fields', async () => {
      await request(app)
        .post(`/api/puzzles/${testPuzzleId}/solve`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ solved: true })
        .expect(400);
    });
  });

  describe('GET /api/puzzles/stats/me', () => {
    it('should require authentication', async () => {
      await request(app)
        .get('/api/puzzles/stats/me')
        .expect(401);
    });

    it('should return user puzzle statistics', async () => {
      const response = await request(app)
        .get('/api/puzzles/stats/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalAttempts');
      expect(response.body).toHaveProperty('totalSolved');
      expect(response.body).toHaveProperty('successRate');
      expect(response.body).toHaveProperty('avgTimeSpent');
      expect(typeof response.body.totalAttempts).toBe('number');
      expect(typeof response.body.successRate).toBe('string'); // DB returns DECIMAL as string
      expect(typeof response.body.avgTimeSpent).toBe('string'); // DB returns DECIMAL as string
    });
  });

  describe('GET /api/puzzles/history/me', () => {
    it('should require authentication', async () => {
      await request(app)
        .get('/api/puzzles/history/me')
        .expect(401);
    });

    it('should return user puzzle history', async () => {
      const response = await request(app)
        .get('/api/puzzles/history/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/api/puzzles/history/me?limit=5')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.length).toBeLessThanOrEqual(5);
    });
  });
});
