const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const bots = [
  { id: '00000000-0000-0000-0000-000000000001', username: 'rookie_robot', email: 'rookie@aichess.ai' },
  { id: '00000000-0000-0000-0000-000000000002', username: 'amateur_andy', email: 'amateur@aichess.ai' },
  { id: '00000000-0000-0000-0000-000000000003', username: 'club_player', email: 'club@aichess.ai' },
  { id: '00000000-0000-0000-0000-000000000004', username: 'advanced_bot', email: 'advanced@aichess.ai' },
  { id: '00000000-0000-0000-0000-000000000005', username: 'expert_bot', email: 'expert@aichess.ai' },
  { id: '00000000-0000-0000-0000-000000000006', username: 'grandmaster_bot', email: 'grandmaster@aichess.ai' }
];

async function seedBots() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required.');
    process.exit(1);
  }

  try {
    const passwordHash = await bcrypt.hash('BotPassword123!', 10);

    for (const bot of bots) {
      await pool.query(
        `INSERT INTO users (id, username, email, password_hash, role, email_verified)
         VALUES ($1, $2, $3, $4, 'bot', true)
         ON CONFLICT (id) DO NOTHING`,
        [bot.id, bot.username, bot.email, passwordHash]
      );
    }

    console.log('✅ Bot users seeded.');
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to seed bots:', error);
    process.exit(1);
  }
}

seedBots();
