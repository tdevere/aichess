import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { GameService } from '../services/gameService';
import botService from '../services/botService';

const gameService = new GameService();

export const createGame = async (req: AuthRequest, res: Response) => {
  try {
    const { opponentId, timeControl = 'blitz', timeLimit = 300, timeIncrement = 0, isRated = true } = req.body;
    const userId = req.userId!;

    const gameId = await gameService.createGame(
      userId,
      opponentId,
      timeControl,
      timeLimit,
      timeIncrement,
      isRated
    );

    res.status(201).json({ gameId });
  } catch (error) {
    console.error('Create game error:', error);
    res.status(500).json({ error: 'Failed to create game' });
  }
};

export const getGame = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const game = await gameService.getGame(id);

    res.json(game);
  } catch (error) {
    console.error('Get game error:', error);
    res.status(404).json({ error: 'Game not found' });
  }
};

export const makeMove = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { move } = req.body;
    const userId = req.userId!;

    const result = await gameService.makeMove(id, move, userId);

    res.json(result);
  } catch (error: any) {
    console.error('Make move error:', error);
    res.status(400).json({ error: error.message });
  }
};

export const resign = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    await gameService.resign(id, userId);

    res.json({ message: 'Game resigned' });
  } catch (error: any) {
    console.error('Resign error:', error);
    res.status(400).json({ error: error.message });
  }
};

export const offerDraw = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    await gameService.offerDraw(id, userId);

    res.json({ message: 'Draw offered' });
  } catch (error) {
    console.error('Offer draw error:', error);
    res.status(400).json({ error: 'Failed to offer draw' });
  }
};

export const acceptDraw = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await gameService.acceptDraw(id);

    res.json({ message: 'Draw accepted' });
  } catch (error) {
    console.error('Accept draw error:', error);
    res.status(400).json({ error: 'Failed to accept draw' });
  }
};

export const abortGame = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await gameService.abortGame(id);

    res.json({ message: 'Game aborted' });
  } catch (error: any) {
    console.error('Abort game error:', error);
    res.status(400).json({ error: error.message });
  }
};

export const getActiveGames = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const games = await gameService.getActiveGames(userId);

    res.json(games);
  } catch (error) {
    console.error('Get active games error:', error);
    res.status(500).json({ error: 'Failed to fetch games' });
  }
};

export const getGameHistory = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const limit = parseInt(req.query.limit as string) || 20;
    const games = await gameService.getGameHistory(userId, limit);

    res.json(games);
  } catch (error) {
    console.error('Get game history error:', error);
    res.status(500).json({ error: 'Failed to fetch game history' });
  }
};

/**
 * Get available bot profiles
 */
export const getBotProfiles = async (req: AuthRequest, res: Response) => {
  try {
    const profiles = botService.getBotProfiles();
    res.json(profiles);
  } catch (error) {
    console.error('Get bot profiles error:', error);
    res.status(500).json({ error: 'Failed to fetch bot profiles' });
  }
};

/**
 * Create a game against a bot
 */
export const createBotGame = async (req: AuthRequest, res: Response) => {
  try {
    const { botId, timeControl = 'blitz', timeLimit = 300, timeIncrement = 0, playerColor } = req.body;
    const userId = req.userId!;

    const bot = botService.getBotProfile(botId);
    if (!bot) {
      return res.status(400).json({ error: 'Bot not found' });
    }

    // Create game with bot as opponent (use userId as placeholder for bot)
    const gameId = await gameService.createBotGame(
      userId,
      botId,
      timeControl,
      timeLimit,
      timeIncrement,
      playerColor === 'black' // If player is black, bot moves first
    );

    res.status(201).json({ gameId, bot });
  } catch (error) {
    console.error('Create bot game error:', error);
    res.status(500).json({ error: 'Failed to create bot game' });
  }
};

/**
 * Make bot's move in response to player move
 */
export const makeBotMove = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const result = await gameService.makeBotMove(id, userId);

    res.json(result);
  } catch (error: any) {
    console.error('Make bot move error:', error);
    res.status(400).json({ error: error.message });
  }
};
