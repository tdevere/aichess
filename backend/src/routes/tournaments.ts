import { Router } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', (req, res) => {
  res.json({ message: 'List tournaments endpoint' });
});

router.post('/:id/register', (req, res) => {
  res.json({ message: 'Register for tournament endpoint' });
});

export default router;
