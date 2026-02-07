const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function resetPassword() {
  try {
    const email = 'anthony_devere@hotmail.com';
    const password = 'Player123!';
    
    console.log(`Resetting password for ${email}...`);
    
    // 1. Hash the password
    const hash = await bcrypt.hash(password, 10);
    console.log('Generated hash:', hash);
    
    // 2. Update DB
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2',
      [hash, email]
    );
    console.log('DB updated.');
    
    // 3. Fetch verification
    const result = await pool.query(
      'SELECT password_hash FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      throw new Error('User not found after update!');
    }
    
    const storedHash = result.rows[0].password_hash;
    console.log('Stored hash:', storedHash);
    
    // 4. Verification Check
    const match = await bcrypt.compare(password, storedHash);
    console.log('Self-verification check:', match ? '✅ PASSED' : '❌ FAILED');
    
    if (match) {
        console.log('Password reset successfully to: ' + password);
    } else {
        console.log('Something is wrong with bcrypt hashing/comparison.');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

resetPassword();
