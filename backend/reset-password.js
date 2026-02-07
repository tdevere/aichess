const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/chess_db'
});

async function resetPassword() {
  const hash = await bcrypt.hash('password123', 10);
  console.log('Generated hash:', hash);
  
  const result = await pool.query(
    'UPDATE users SET password_hash = $1 WHERE username = $2 RETURNING username, email',
    [hash, 'dante']
  );
  
  console.log('Updated user:', result.rows[0]);
  await pool.end();
}

resetPassword().catch(console.error);
