const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function bootstrapAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const username = process.env.ADMIN_USERNAME || (email ? email.split('@')[0] : null);

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required.');
    process.exit(1);
  }
  if (!email || !password) {
    console.error('ADMIN_EMAIL and ADMIN_PASSWORD are required.');
    process.exit(1);
  }

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);

    const passwordHash = await bcrypt.hash(password, 10);

    if (existing.rows.length > 0) {
      await pool.query(
        `UPDATE users
         SET password_hash = $1, role = 'admin', email_verified = true, updated_at = CURRENT_TIMESTAMP
         WHERE email = $2`,
        [passwordHash, email]
      );

      console.log('✅ Admin user updated:', email);
    } else {
      if (!username) {
        console.error('ADMIN_USERNAME is required when the user does not exist.');
        process.exit(1);
      }

      await pool.query(
        `INSERT INTO users (username, email, password_hash, role, email_verified)
         VALUES ($1, $2, $3, 'admin', true)`,
        [username, email, passwordHash]
      );

      console.log('✅ Admin user created:', email);
    }

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to bootstrap admin:', error);
    process.exit(1);
  }
}

bootstrapAdmin();
