import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  createGame,
  getGame,
  makeMove,
  resign,
  offerDraw,
  acceptDraw,
  abortGame,
  getActiveGames,
  getGameHistory,
  createBotGame,
  makeBotMove,
  getBotProfiles
} from '../controllers/games';

const router = Router();

router.use(authenticate);

// Bot-specific routes
router.get('/bots/profiles', getBotProfiles);
router.post('/bots/create', createBotGame);
router.post('/bots/:id/move', makeBotMove);

// Regular game routes
router.post('/', createGame);
router.get('/active', getActiveGames);
router.get('/history', getGameHistory);
router.get('/:id', getGame);
router.post('/:id/move', makeMove);
router.post('/:id/resign', resign);
router.post('/:id/draw/offer', offerDraw);
router.post('/:id/draw/accept', acceptDraw);
router.post('/:id/abort', abortGame);

export default router;
