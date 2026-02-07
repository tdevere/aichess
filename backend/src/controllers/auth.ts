import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db';
import { body, validationResult } from 'express-validator';

export const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 }).withMessage('Username must be between 3 and 50 characters')
    .isAlphanumeric().withMessage('Username can only contain letters and numbers'),
  body('email')
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/).withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)'),
];

export const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

export const register = async (req: Request, res: Response) => {
  console.log('Registration attempt:', { username: req.body.username, email: req.body.email });
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Validation errors:', errors.array());
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: errors.array().map(e => ({ field: e.type === 'field' ? e.path : 'unknown', message: e.msg }))
    });
  }

  const { username, email, password } = req.body;

  try {
    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash) 
       VALUES ($1, $2, $3) 
       RETURNING id, username, email, elo_bullet, elo_blitz, elo_rapid, elo_daily, role, created_at`,
      [username, email, passwordHash]
    );

    const user = result.rows[0];

    // Generate tokens
    const accessToken = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET!, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ userId: user.id, role: user.role }, process.env.REFRESH_TOKEN_SECRET!, { expiresIn: '7d' });

    res.status(201).json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        eloBullet: user.elo_bullet,
        eloBlitz: user.elo_blitz,
        eloRapid: user.elo_rapid,
        eloDaily: user.elo_daily,
        isOnline: false,
        isPremium: false,
        role: user.role,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password, rememberMe } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate tokens
    const accessToken = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET!, { expiresIn: '15m' });
    const refreshToken = jwt.sign(
      { userId: user.id, role: user.role }, 
      process.env.REFRESH_TOKEN_SECRET!, 
      { expiresIn: rememberMe ? '30d' : '7d' }
    );

    // Update online status
    await pool.query('UPDATE users SET is_online = true WHERE id = $1', [user.id]);

    const responseData = {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        country: user.country,
        bio: user.bio,
        eloBullet: user.elo_bullet,
        eloBlitz: user.elo_blitz,
        eloRapid: user.elo_rapid,
        eloDaily: user.elo_daily,
        isOnline: true,
        isPremium: user.is_premium,
        role: user.role,
        createdAt: user.created_at
      }
    };
    
    console.log('🔐 Login response for', user.email, '- role:', user.role);
    
    res.json(responseData);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token required' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET!) as { userId: string; role?: string };
    
    // Get latest role from database
    const userResult = await pool.query('SELECT role FROM users WHERE id = $1 AND deleted_at IS NULL', [decoded.userId]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    const role = userResult.rows[0].role;
    const accessToken = jwt.sign({ userId: decoded.userId, role }, process.env.JWT_SECRET!, { expiresIn: '15m' });

    res.json({ accessToken });
  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
};

export const logout = async (req: Request, res: Response) => {
  // In a real application, you might want to blacklist the token
  res.json({ message: 'Logged out successfully' });
};
