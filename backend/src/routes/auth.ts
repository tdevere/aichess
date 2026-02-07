import { Router } from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import { register, login, refreshToken, logout, registerValidation, loginValidation } from '../controllers/auth';

const router = Router();

router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/refresh', refreshToken);
router.post('/logout', logout);

// Microsoft Authentication Routes
router.get('/microsoft', passport.authenticate('microsoft', {
  session: false,
  prompt: 'select_account',
}));

router.get(
  '/microsoft/callback',
  passport.authenticate('microsoft', { session: false, failureRedirect: '/login?error=auth_failed' }),
  (req, res) => {
    // Generate JWT tokens for the authenticated user
    const user: any = req.user;
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: '15m' }
    );
    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.REFRESH_TOKEN_SECRET!,
      { expiresIn: '7d' }
    );

    // Redirect to frontend with tokens
    // Using a different path for handling the callback on frontend
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/auth/callback?token=${token}&refreshToken=${refreshToken}`);
  }
);

export default router;

