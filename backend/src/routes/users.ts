import { Router } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/:id', (req, res) => {
  res.json({ message: 'User profile endpoint' });
});

router.put('/:id', (req, res) => {
  res.json({ message: 'Update user profile endpoint' });
});

export default router;
