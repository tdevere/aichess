import { Chess } from 'chess.js';
import pool from '../db';
import { Game, GameStatus, GameResult, TimeControl } from '../../../shared/src/types';
import botService from './botService';

export class GameService {
  async createGame(
    whitePlayerId: string,
    blackPlayerId: string,
    timeControl: TimeControl,
    timeLimit: number,
    timeIncrement: number = 0,
    isRated: boolean = true
  ): Promise<string> {
    const result = await pool.query(
      `INSERT INTO games (
        white_player_id, black_player_id, time_control, 
        time_limit, time_increment, is_rated,
        white_time_remaining, black_time_remaining, status, started_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING id`,
      [whitePlayerId, blackPlayerId, timeControl, timeLimit, timeIncrement, isRated, timeLimit, timeLimit, 'in_progress']
    );

    return result.rows[0].id;
  }

  async getGame(gameId: string): Promise<any> {
    const result = await pool.query(
      `SELECT g.*, 
        w.id as white_id, w.username as white_username, w.avatar as white_avatar,
        b.id as black_id, b.username as black_username, b.avatar as black_avatar
       FROM games g
       LEFT JOIN users w ON g.white_player_id = w.id
       LEFT JOIN users b ON g.black_player_id = b.id
       WHERE g.id = $1`,
      [gameId]
    );

    if (result.rows.length === 0) {
      throw new Error('Game not found');
    }

    return result.rows[0];
  }

  async makeMove(gameId: string, move: string, playerId: string): Promise<any> {
    const game = await this.getGame(gameId);

    if (game.status !== 'in_progress') {
      throw new Error('Game is not in progress');
    }

    // Verify it's the player's turn
    const isWhiteTurn = game.current_turn === 'w';
    const isPlayerTurn = isWhiteTurn ? game.white_player_id === playerId : game.black_player_id === playerId;

    if (!isPlayerTurn) {
      throw new Error('Not your turn');
    }

    // Validate move with chess.js
    const chess = new Chess(game.fen);
    let chessMove;
    try {
      chessMove = chess.move(move);
    } catch (error) {
      throw new Error('Invalid move');
    }

    const newFen = chess.fen();
    const newPgn = chess.pgn();
    const isCheck = chess.isCheck();
    const isCheckmate = chess.isCheckmate();
    const isStalemate = chess.isStalemate();
    const isDraw = chess.isDraw();
    const moveNumber = Math.floor(chess.moveNumber());

    // Calculate time remaining
    const timeRemaining = (isWhiteTurn ? game.white_time_remaining : game.black_time_remaining) || 0;

    console.log(`Making move for game ${gameId}:`, {
        move: chessMove.san,
        fen: newFen,
        timeRemaining,
        moveNumber
    });

    // Save move
    try {
      await pool.query(
        `INSERT INTO moves (game_id, move_number, san, fen, time_remaining)
         VALUES ($1::uuid, $2::integer, $3::text, $4::text, $5::integer)`,
        [gameId, moveNumber, chessMove.san, newFen, timeRemaining]
      );
    } catch (err) {
      console.error('Error inserting move:', err);
      throw err;
    }

    // Update game
    let status = 'in_progress';
    let result = null;

    if (isCheckmate) {
      status = 'completed';
      result = isWhiteTurn ? 'white_win' : 'black_win';
    } else if (isStalemate || isDraw) {
      status = 'completed';
      result = 'draw';
    }

    await pool.query(
      `UPDATE games 
       SET fen = $1::text, pgn = $2::text, current_turn = $3::text, status = $4::varchar, result = $5::varchar,
           ended_at = CASE WHEN $4::varchar = 'completed' THEN NOW() ELSE ended_at END
       WHERE id = $6::uuid`,
      [newFen, newPgn, chess.turn(), status, result, gameId]
    );

    return {
      move: chessMove,
      fen: newFen,
      isCheck,
      isCheckmate,
      isStalemate,
      isDraw
    };
  }

  async resign(gameId: string, playerId: string): Promise<void> {
    const game = await this.getGame(gameId);

    if (game.status !== 'in_progress') {
      throw new Error('Game is not in progress');
    }

    const isWhite = game.white_player_id === playerId;
    const result = isWhite ? 'black_win' : 'white_win';

    await pool.query(
      `UPDATE games 
       SET status = 'completed', result = $1, ended_at = NOW()
       WHERE id = $2`,
      [result, gameId]
    );
  }

  async offerDraw(gameId: string, playerId: string): Promise<void> {
    // In a real implementation, this would create a draw offer record
    // For now, we'll just mark it in the game state
  }

  async acceptDraw(gameId: string): Promise<void> {
    await pool.query(
      `UPDATE games 
       SET status = 'completed', result = 'draw', ended_at = NOW()
       WHERE id = $1`,
      [gameId]
    );
  }

  async abortGame(gameId: string): Promise<void> {
    const game = await this.getGame(gameId);
    
    // Can only abort if game just started (less than 2 moves)
    const moveCount = await pool.query(
      'SELECT COUNT(*) FROM moves WHERE game_id = $1',
      [gameId]
    );

    if (parseInt(moveCount.rows[0].count) > 2) {
      throw new Error('Cannot abort game after 2 moves');
    }

    await pool.query(
      `UPDATE games 
       SET status = 'aborted', result = 'aborted', ended_at = NOW()
       WHERE id = $1`,
      [gameId]
    );
  }

  async updateTime(gameId: string, whiteTime: number, blackTime: number): Promise<void> {
    await pool.query(
      `UPDATE games 
       SET white_time_remaining = $1, black_time_remaining = $2
       WHERE id = $3`,
      [whiteTime, blackTime, gameId]
    );

    // Check for timeout
    if (whiteTime <= 0 || blackTime <= 0) {
      const result = whiteTime <= 0 ? 'black_win' : 'white_win';
      await pool.query(
        `UPDATE games 
         SET status = 'completed', result = $1, ended_at = NOW()
         WHERE id = $2`,
        [result, gameId]
      );
    }
  }

  async getActiveGames(userId: string): Promise<any[]> {
    const result = await pool.query(
      `SELECT g.*, 
        w.username as white_username, w.avatar as white_avatar,
        b.username as black_username, b.avatar as black_avatar
       FROM games g
       LEFT JOIN users w ON g.white_player_id = w.id
       LEFT JOIN users b ON g.black_player_id = b.id
       WHERE (g.white_player_id = $1 OR g.black_player_id = $1)
         AND g.status = 'in_progress'
       ORDER BY g.started_at DESC`,
      [userId]
    );

    return result.rows;
  }

  async getGameHistory(userId: string, limit: number = 20): Promise<any[]> {
    const result = await pool.query(
      `SELECT g.*, 
        w.username as white_username, w.avatar as white_avatar,
        b.username as black_username, b.avatar as black_avatar
       FROM games g
       LEFT JOIN users w ON g.white_player_id = w.id
       LEFT JOIN users b ON g.black_player_id = b.id
       WHERE (g.white_player_id = $1 OR g.black_player_id = $1)
         AND g.status = 'completed'
       ORDER BY g.ended_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows;
  }

  /**
   * Create a game against a bot
   */
  async createBotGame(
    userId: string,
    botId: string,
    timeControl: TimeControl,
    timeLimit: number,
    timeIncrement: number = 0,
    botPlaysWhite: boolean = false
  ): Promise<string> {
    // Map bot IDs to UUIDs (must match seeded bot users in database)
    const botUUIDs: Record<string, string> = {
      rookie: '00000000-0000-0000-0000-000000000001',
      amateur: '00000000-0000-0000-0000-000000000002',
      clubplayer: '00000000-0000-0000-0000-000000000003',
      advanced: '00000000-0000-0000-0000-000000000004',
      expert: '00000000-0000-0000-0000-000000000005',
      grandmaster: '00000000-0000-0000-0000-000000000006',
    };

    const botUUID = botUUIDs[botId];
    if (!botUUID) {
      throw new Error(`Invalid bot ID: ${botId}`);
    }

    const whitePlayerId = botPlaysWhite ? botUUID : userId;
    const blackPlayerId = botPlaysWhite ? userId : botUUID;

    const result = await pool.query(
      `INSERT INTO games (
        white_player_id, black_player_id, time_control, 
        time_limit, time_increment, is_rated,
        white_time_remaining, black_time_remaining, status, started_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING id`,
      [whitePlayerId, blackPlayerId, timeControl, timeLimit, timeIncrement, false, timeLimit, timeLimit, 'in_progress']
    );

    const gameId = result.rows[0].id;

    // If bot plays white, make the first move immediately
    if (botPlaysWhite) {
      await this.makeBotMoveInternal(gameId, botId);
    }

    return gameId;
  }

  /**
   * Make bot's move after player moves
   */
  async makeBotMove(gameId: string, userId: string): Promise<any> {
    const game = await this.getGame(gameId);

    // Bot UUIDs (must match seeded bot users)
    const botUUIDs = [
      '00000000-0000-0000-0000-000000000001', // rookie
      '00000000-0000-0000-0000-000000000002', // amateur
      '00000000-0000-0000-0000-000000000003', // clubplayer
      '00000000-0000-0000-0000-000000000004', // advanced
      '00000000-0000-0000-0000-000000000005', // expert
      '00000000-0000-0000-0000-000000000006', // grandmaster
    ];

    // Determine which player is the bot
    const isWhiteBot = botUUIDs.includes(game.white_player_id);
    const isBlackBot = botUUIDs.includes(game.black_player_id);

    if (!isWhiteBot && !isBlackBot) {
      throw new Error('This is not a bot game');
    }

    // Map UUID back to botId
    const botUUIDMap: Record<string, string> = {
      '00000000-0000-0000-0000-000000000001': 'rookie',
      '00000000-0000-0000-0000-000000000002': 'amateur',
      '00000000-0000-0000-0000-000000000003': 'clubplayer',
      '00000000-0000-0000-0000-000000000004': 'advanced',
      '00000000-0000-0000-0000-000000000005': 'expert',
      '00000000-0000-0000-0000-000000000006': 'grandmaster',
    };

    const botPlayerId = isWhiteBot ? game.white_player_id : game.black_player_id;
    const botId = botUUIDMap[botPlayerId];

    // Make sure it's the bot's turn
    const isBotTurn = (game.current_turn === 'w' && isWhiteBot) || (game.current_turn === 'b' && isBlackBot);
    
    if (!isBotTurn) {
      throw new Error('Not bot\'s turn');
    }

    return await this.makeBotMoveInternal(gameId, botId);
  }

  /**
   * Internal method to generate and execute bot move
   */
  private async makeBotMoveInternal(gameId: string, botId: string): Promise<any> {
    const game = await this.getGame(gameId);
    const chess = new Chess(game.fen);

    // Generate bot move
    const movesan = await botService.generateBotMove(chess, botId);

    // Update game state
    const newFen = chess.fen();
    const newPgn = chess.pgn();
    const isCheckmate = chess.isCheckmate();
    const isStalemate = chess.isStalemate();
    const isDraw = chess.isDraw();
    const moveNumber = Math.floor(chess.moveNumber());

    let gameStatus: GameStatus = GameStatus.IN_PROGRESS;
    let gameResult: GameResult | null = null;

    if (isCheckmate) {
      gameStatus = GameStatus.COMPLETED;
      gameResult = game.current_turn === 'w' ? GameResult.BLACK_WIN : GameResult.WHITE_WIN;
    } else if (isStalemate || isDraw) {
      gameStatus = GameStatus.COMPLETED;
      gameResult = GameResult.DRAW;
    }

    // Update game
    await pool.query(
      `UPDATE games 
       SET fen = $1::text, pgn = $2::text, current_turn = $3::text, status = $4::varchar, result = $5::varchar,
           ended_at = CASE WHEN $4::varchar = 'completed' THEN NOW() ELSE NULL END
       WHERE id = $6::uuid`,
      [newFen, newPgn, game.current_turn === 'w' ? 'b' : 'w', gameStatus, gameResult, gameId]
    );

    // Record the move
    await pool.query(
      `INSERT INTO moves (game_id, move_number, san, fen, time_remaining)
       VALUES ($1, $2, $3, $4, $5)`,
      [gameId, moveNumber, movesan, newFen, game.current_turn === 'w' ? game.white_time_remaining : game.black_time_remaining]
    );

    return {
      move: movesan,
      fen: newFen,
      pgn: newPgn,
      status: gameStatus,
      result: gameResult,
      isCheck: chess.isCheck(),
      isCheckmate,
      isStalemate,
      isDraw
    };
  }
}
