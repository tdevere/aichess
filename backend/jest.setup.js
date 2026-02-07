// Set test environment variables before any tests run
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/chess_db';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-change-in-production';
process.env.REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'test-refresh-secret-key-change-in-production';
process.env.PORT = '5000';
