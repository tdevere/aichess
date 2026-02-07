const bcrypt = require('./backend/node_modules/bcrypt');
const { Pool } = require('./backend/node_modules/pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:5432/chess_db'
});

async function resetPassword() {
  const password = 'admin123';
  const hash = await bcrypt.hash(password, 10);
  
  await pool.query(
    "UPDATE users SET password_hash = $1 WHERE email = 'testuser@test.com'",
    [hash]
  );
  
  console.log('✅ Password reset successfully!');
  console.log('Email: testuser@test.com');
  console.log('Password: admin123');
  
  await pool.end();
}

resetPassword().catch(console.error);
