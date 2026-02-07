const https = require('http');

async function testLogin() {
  const postData = JSON.stringify({
    email: 'testuser@test.com',
    password: 'admin123'
  });

  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        console.log('✅ Login response status:', res.statusCode);
        console.log('Full response:', JSON.stringify(response, null, 2));
      } catch (e) {
        console.log('Response:', data);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Error:', error.message);
  });

  req.write(postData);
  req.end();
}

testLogin();
