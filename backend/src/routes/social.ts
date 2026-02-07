import { Router } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/friends/request', (req, res) => {
  res.json({ message: 'Send friend request endpoint' });
});

router.get('/friends', (req, res) => {
  res.json({ message: 'Get friends list endpoint' });
});

router.get('/notifications', (req, res) => {
  res.json({ message: 'Get notifications endpoint' });
});

export default router;
