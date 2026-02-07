const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  const hash = await bcrypt.hash('admin123', 10);
  await pool.query("UPDATE users SET password_hash = $1 WHERE email = 'testuser@test.com'", [hash]);
  console.log('✅ Password reset successfully!');
  console.log('Email: testuser@test.com');
  console.log('Password: admin123');
  process.exit(0);
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
