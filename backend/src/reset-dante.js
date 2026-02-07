const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function resetPassword() {
  try {
    const password = 'Player123!';
    const hash = await bcrypt.hash(password, 10);
    
    console.log('Generated hash:', hash);
    
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2',
      [hash, 'anthony_devere@hotmail.com']
    );
    
    const result = await pool.query(
      'SELECT email, password_hash FROM users WHERE email = $1',
      ['anthony_devere@hotmail.com']
    );
    
    console.log('✅ Password updated successfully!');
    console.log('Email:', result.rows[0].email);
    console.log('\nUse these credentials:');
    console.log('Email: anthony_devere@hotmail.com');
    console.log('Password: Player123!');
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

resetPassword();
