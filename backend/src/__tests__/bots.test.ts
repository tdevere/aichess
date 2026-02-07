import request from 'supertest';
import { app } from '../server';
import pool from '../db';

describe('Bot Game API Integration Tests', () => {
  let accessToken: string;
  let userId: string;
  const botUUIDs: Record<string, string> = {
    rookie: '00000000-0000-0000-0000-000000000001',
    amateur: '00000000-0000-0000-0000-000000000002',
    clubplayer: '00000000-0000-0000-0000-000000000003',
    advanced: '00000000-0000-0000-0000-000000000004',
    expert: '00000000-0000-0000-0000-000000000005',
    grandmaster: '00000000-0000-0000-0000-000000000006',
  };

  beforeAll(async () => {
    // Create bot users in database with fixed UUIDs
    for (const [botId, uuid] of Object.entries(botUUIDs)) {
      await pool.query(
        `INSERT INTO users (id, username, email, password_hash) 
         VALUES ($1, $2, $3, $4) 
         ON CONFLICT (id) DO NOTHING`,
        [uuid, `bot_${botId}`, `${botId}@bot.ai`, 'bot']
      );
    }

    // Create test user
    const testUser = {
      username: `bottest${Date.now()}`,
      email: `bottest${Date.now()}@example.com`,
      password: 'TestPassword123!',
    };

    const authResponse = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    accessToken = authResponse.body.accessToken;
    userId = authResponse.body.user.id;
  });

  afterAll(async () => {
    // Cleanup - delete games first (foreign key constraint)
    if (userId) {
      await pool.query('DELETE FROM games WHERE white_player_id = $1 OR black_player_id = $1', [userId]);
      await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    }
  });

  describe('GET /api/games/bots/profiles', () => {
    it('should require authentication', async () => {
      await request(app)
        .get('/api/games/bots/profiles')
        .expect(401);
    });

    it('should return bot profiles', async () => {
      const response = await request(app)
        .get('/api/games/bots/profiles')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const bot = response.body[0];
      expect(bot).toHaveProperty('id');
      expect(bot).toHaveProperty('name');
      expect(bot).toHaveProperty('difficulty');
      expect(bot).toHaveProperty('eloMin');
      expect(bot).toHaveProperty('eloMax');
      expect(bot).toHaveProperty('description');
    });

    it('should return bots with correct difficulty levels', async () => {
      const response = await request(app)
        .get('/api/games/bots/profiles')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const difficulties = response.body.map((bot: any) => bot.difficulty);
      expect(difficulties).toContain('beginner');
      expect(difficulties).toContain('intermediate');
      expect(difficulties).toContain('advanced');
    });
  });

  describe('POST /api/games/bots/create', () => {
    it('should require authentication', async () => {
      await request(app)
        .post('/api/games/bots/create')
        .send({ botId: 'rookie_robot', playerColor: 'white' })
        .expect(401);
    });

    it('should create bot game', async () => {
      const response = await request(app)
        .post('/api/games/bots/create')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ botId: 'rookie', playerColor: 'white' })
        .expect(201);

      expect(response.body).toHaveProperty('gameId');
      expect(response.body).toHaveProperty('bot');
      expect(response.body.bot.id).toBe('rookie');
    });

    it('should validate bot ID', async () => {
      await request(app)
        .post('/api/games/bots/create')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ botId: 'invalid_bot', playerColor: 'white' })
        .expect(400);
    });

    it('should validate player color', async () => {
      await request(app)
        .post('/api/games/bots/create')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ botId: 'rookie_robot', playerColor: 'invalid' })
        .expect(400);
    });
  });

  describe('POST /api/games/bots/:id/move', () => {
    let botGameId: string;

    beforeEach(async () => {
      // Create a bot game
      const response = await request(app)
        .post('/api/games/bots/create')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ botId: 'rookie', playerColor: 'white' });

      botGameId = response.body.gameId;
    });

    it('should require authentication', async () => {
      await request(app)
        .post(`/api/games/bots/${botGameId}/move`)
        .expect(401);
    });

    it('should reject when not bot turn', async () => {
      // Bot game created with player as white, so it's player's turn first
      const response = await request(app)
        .post(`/api/games/bots/${botGameId}/move`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);

      expect(response.body.error).toContain('turn');
    });

    it('should return 400 for non-existent game', async () => {
      await request(app)
        .post('/api/games/bots/00000000-0000-0000-0000-000000000000/move')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });
  });
});
