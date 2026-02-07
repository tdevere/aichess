import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { GameService } from './services/gameService';
import { SocketEvent } from '../../shared/src/types';

const gameService = new GameService();

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

const activeGames = new Map<string, Set<string>>(); // gameId -> Set of socketIds
const matchmakingQueue = new Map<string, any[]>(); // timeControl -> players

export const setupSocketHandlers = (io: Server) => {
  // Authentication middleware
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
      socket.userId = decoded.userId;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User connected: ${socket.userId}`);

    // Join game room
    socket.on(SocketEvent.JOIN_GAME, async (gameId: string) => {
      try {
        const game = await gameService.getGame(gameId);
        
        // Verify user is part of this game
        if (game.white_player_id !== socket.userId && game.black_player_id !== socket.userId) {
          socket.emit('error', { message: 'Not authorized to join this game' });
          return;
        }

        socket.join(gameId);
        
        if (!activeGames.has(gameId)) {
          activeGames.set(gameId, new Set());
        }
        activeGames.get(gameId)!.add(socket.id);

        socket.emit('game_joined', { gameId, game });
        console.log(`User ${socket.userId} joined game ${gameId}`);

        // Check if it's a bot's turn and trigger move if necessary (e.g. resumption)
        try {
            const botResult = await gameService.makeBotMove(gameId, socket.userId!);
            
            // Broadcast bot move if one was made
            io.to(gameId).emit(SocketEvent.MOVE_MADE, {
              gameId,
              move: botResult.move,
              fen: botResult.fen,
              isCheck: botResult.isCheck,
              isCheckmate: botResult.isCheckmate,
              isStalemate: botResult.isStalemate,
              isDraw: botResult.isDraw
            });

            if (botResult.isCheckmate || botResult.isStalemate || botResult.isDraw) {
              io.to(gameId).emit(SocketEvent.GAME_OVER, {
                gameId,
                result: botResult.isCheckmate ? 'checkmate' : botResult.isStalemate ? 'stalemate' : 'draw'
              });
            }
        } catch (error: any) {
             // Silence expected errors when it's not bot turn
             if (error.message !== 'This is not a bot game' && error.message !== "Not bot's turn") {
                 console.error('[Socket] Bot resumption error:', error);
             }
        }

      } catch (error) {
        socket.emit('error', { message: 'Failed to join game' });
      }
    });

    // Leave game room
    socket.on(SocketEvent.LEAVE_GAME, (gameId: string) => {
      socket.leave(gameId);
      if (activeGames.has(gameId)) {
        activeGames.get(gameId)!.delete(socket.id);
        if (activeGames.get(gameId)!.size === 0) {
          activeGames.delete(gameId);
        }
      }
    });

    // Make move
    socket.on(SocketEvent.MAKE_MOVE, async ({ gameId, move }) => {
      console.log(`[Socket] Received make_move for game ${gameId} from user ${socket.userId}. Move: ${move}`);
      try {
        const result = await gameService.makeMove(gameId, move, socket.userId!);
        
        console.log('[Socket] Move successful, broadcasting...');
        
        // Broadcast move to both players
        io.to(gameId).emit(SocketEvent.MOVE_MADE, {
          gameId,
          move: result.move,
          fen: result.fen,
          isCheck: result.isCheck,
          isCheckmate: result.isCheckmate,
          isStalemate: result.isStalemate,
          isDraw: result.isDraw
        });

        // If game over, emit game over event
        if (result.isCheckmate || result.isStalemate || result.isDraw) {
          io.to(gameId).emit(SocketEvent.GAME_OVER, {
            gameId,
            result: result.isCheckmate ? 'checkmate' : result.isStalemate ? 'stalemate' : 'draw'
          });
        } else {
          // If game is not over, check if we need to trigger a bot move
          try {
            // Attempt to make a bot move. This will throw if it's not a bot game or not bot's turn
            // The method includes an artificial delay for realism
            const botResult = await gameService.makeBotMove(gameId, socket.userId!);
            
            // Broadcast bot move
            io.to(gameId).emit(SocketEvent.MOVE_MADE, {
              gameId,
              move: botResult.move,
              fen: botResult.fen,
              isCheck: botResult.isCheck,
              isCheckmate: botResult.isCheckmate,
              isStalemate: botResult.isStalemate,
              isDraw: botResult.isDraw
            });

            // Check if bot ended the game
            if (botResult.isCheckmate || botResult.isStalemate || botResult.isDraw) {
              io.to(gameId).emit(SocketEvent.GAME_OVER, {
                gameId,
                result: botResult.isCheckmate ? 'checkmate' : botResult.isStalemate ? 'stalemate' : 'draw'
              });
            }
          } catch (error: any) {
            // Ignore errors related to "not a bot game" or "not bot turn"
            // Log only real errors if needed
            if (error.message !== 'This is not a bot game' && error.message !== "Not bot's turn") {
              console.error('[Socket] Bot move error:', error);
            }
          }
        }
      } catch (error: any) {
        socket.emit('error', { message: error.message });
      }
    });

    // Resign
    socket.on(SocketEvent.RESIGN, async (gameId: string) => {
      try {
        await gameService.resign(gameId, socket.userId!);
        io.to(gameId).emit(SocketEvent.GAME_OVER, {
          gameId,
          result: 'resignation',
          winner: socket.userId
        });
      } catch (error: any) {
        socket.emit('error', { message: error.message });
      }
    });

    // Draw offer
    socket.on(SocketEvent.DRAW_OFFER, async (gameId: string) => {
      try {
        await gameService.offerDraw(gameId, socket.userId!);
        socket.to(gameId).emit(SocketEvent.DRAW_OFFER, { gameId, from: socket.userId });
      } catch (error: any) {
        socket.emit('error', { message: error.message });
      }
    });

    // Draw response
    socket.on(SocketEvent.DRAW_RESPONSE, async ({ gameId, accepted }) => {
      if (accepted) {
        try {
          await gameService.acceptDraw(gameId);
          io.to(gameId).emit(SocketEvent.GAME_OVER, {
            gameId,
            result: 'draw_agreement'
          });
        } catch (error: any) {
          socket.emit('error', { message: error.message });
        }
      } else {
        socket.to(gameId).emit('draw_declined', { gameId });
      }
    });

    // Abort game
    socket.on(SocketEvent.ABORT_GAME, async (gameId: string) => {
      try {
        await gameService.abortGame(gameId);
        io.to(gameId).emit(SocketEvent.GAME_OVER, {
          gameId,
          result: 'aborted'
        });
      } catch (error: any) {
        socket.emit('error', { message: error.message });
      }
    });

    // Time update
    socket.on(SocketEvent.TIME_UPDATE, async ({ gameId, whiteTime, blackTime }) => {
      try {
        await gameService.updateTime(gameId, whiteTime, blackTime);
        socket.to(gameId).emit(SocketEvent.TIME_UPDATE, { whiteTime, blackTime });

        // Check for timeout
        if (whiteTime <= 0 || blackTime <= 0) {
          io.to(gameId).emit(SocketEvent.GAME_OVER, {
            gameId,
            result: 'timeout',
            winner: whiteTime <= 0 ? 'black' : 'white'
          });
        }
      } catch (error: any) {
        socket.emit('error', { message: error.message });
      }
    });

    // Matchmaking - join queue
    socket.on(SocketEvent.JOIN_QUEUE, async (params) => {
      if (!params || !params.timeControl || !params.timeLimit || !params.ratingRange) {
        socket.emit('error', { message: 'Missing required matchmaking parameters' });
        return;
      }
      const { timeControl, timeLimit, timeIncrement, ratingRange, isRated } = params;
      const key = `${timeControl}_${timeLimit}_${timeIncrement}`;

      if (!matchmakingQueue.has(key)) {
        matchmakingQueue.set(key, []);
      }

      const queue = matchmakingQueue.get(key)!;
      
      // Check if there's a suitable opponent
      const opponentIndex = queue.findIndex((player: any) => {
        const ratingDiff = Math.abs(player.rating - params.rating);
        return ratingDiff <= ratingRange[1] - ratingRange[0];
      });

      if (opponentIndex !== -1) {
        // Match found!
        const opponent = queue.splice(opponentIndex, 1)[0];
        
        try {
          // Create game
          const gameId = await gameService.createGame(
            socket.userId!,
            opponent.userId,
            timeControl,
            timeLimit,
            timeIncrement,
            isRated
          );

          // Notify both players
          socket.emit(SocketEvent.MATCH_FOUND, { gameId, color: 'white' });
          io.to(opponent.socketId).emit(SocketEvent.MATCH_FOUND, { gameId, color: 'black' });
        } catch (error) {
          console.error('Error creating matched game:', error);
        }
      } else {
        // Add to queue
        queue.push({
          socketId: socket.id,
          userId: socket.userId,
          rating: params.rating,
          timestamp: Date.now()
        });

        socket.emit('queue_joined', { position: queue.length });
      }
    });

    // Matchmaking - leave queue
    socket.on(SocketEvent.LEAVE_QUEUE, (params) => {
      if (!params || !params.timeControl || params.timeLimit === undefined) {
        socket.emit('error', { message: 'Missing required queue parameters' });
        return;
      }
      const { timeControl, timeLimit, timeIncrement } = params;
      const key = `${timeControl}_${timeLimit}_${timeIncrement}`;

      if (matchmakingQueue.has(key)) {
        const queue = matchmakingQueue.get(key)!;
        const index = queue.findIndex((p: any) => p.socketId === socket.id);
        if (index !== -1) {
          queue.splice(index, 1);
        }
      }

      socket.emit('queue_left');
    });

    // Chat message
    socket.on(SocketEvent.SEND_MESSAGE, ({ gameId, message }) => {
      socket.to(gameId).emit(SocketEvent.RECEIVE_MESSAGE, {
        from: socket.userId,
        message,
        timestamp: new Date()
      });
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);

      // Remove from all game rooms
      activeGames.forEach((sockets, gameId) => {
        if (sockets.has(socket.id)) {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            activeGames.delete(gameId);
          }
        }
      });

      // Remove from matchmaking queues
      matchmakingQueue.forEach((queue, key) => {
        const index = queue.findIndex((p: any) => p.socketId === socket.id);
        if (index !== -1) {
          queue.splice(index, 1);
        }
      });
    });
  });
};
