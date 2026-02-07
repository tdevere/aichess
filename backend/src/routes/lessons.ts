import { Router } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', (req, res) => {
  res.json({ message: 'List lessons endpoint' });
});

router.get('/:id', (req, res) => {
  res.json({ message: 'Get lesson endpoint' });
});

router.post('/:id/complete', (req, res) => {
  res.json({ message: 'Complete lesson endpoint' });
});

export default router;
