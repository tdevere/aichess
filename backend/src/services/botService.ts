import { Chess } from 'chess.js';
import { fork, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';

export enum BotDifficulty {
  BEGINNER = 'beginner',         // ELO 400-800
  EASY = 'easy',                 // ELO 800-1200
  INTERMEDIATE = 'intermediate', // ELO 1200-1600
  ADVANCED = 'advanced',         // ELO 1600-2000
  EXPERT = 'expert',             // ELO 2000-2400
  MASTER = 'master'              // ELO 2400+
}

interface BotProfile {
  id: string;
  name: string;
  difficulty: BotDifficulty;
  eloMin: number;
  eloMax: number;
  description: string;
  personality: string;
  skillLevel: number;      // Stockfish skill level (0-20)
  thinkingTime: number;    // Milliseconds to "think"
}

export class BotService {
  private stockfishProcess: ChildProcess | null = null;
  private readonly botProfiles: BotProfile[] = [
    {
      id: 'rookie',
      name: 'Rookie Robot',
      difficulty: BotDifficulty.BEGINNER,
      eloMin: 400,
      eloMax: 800,
      description: 'Just learning the game',
      personality: 'Makes frequent mistakes',
      skillLevel: 2,
      thinkingTime: 500
    },
    {
      id: 'amateur',
      name: 'Amateur Andy',
      difficulty: BotDifficulty.EASY,
      eloMin: 800,
      eloMax: 1200,
      description: 'Knows the basics',
      personality: 'Plays simple moves',
      skillLevel: 5,
      thinkingTime: 800
    },
    {
      id: 'clubplayer',
      name: 'Club Player',
      difficulty: BotDifficulty.INTERMEDIATE,
      eloMin: 1200,
      eloMax: 1600,
      description: 'Solid chess knowledge',
      personality: 'Tactical and strategic',
      skillLevel: 10,
      thinkingTime: 1200
    },
    {
      id: 'advanced',
      name: 'Advanced Annie',
      difficulty: BotDifficulty.ADVANCED,
      eloMin: 1600,
      eloMax: 2000,
      description: 'Strong player',
      personality: 'Calculates deeply',
      skillLevel: 15,
      thinkingTime: 1500
    },
    {
      id: 'expert',
      name: 'Expert Edwin',
      difficulty: BotDifficulty.EXPERT,
      eloMin: 2000,
      eloMax: 2400,
      description: 'Near master strength',
      personality: 'Rarely makes mistakes',
      skillLevel: 18,
      thinkingTime: 2000
    },
    {
      id: 'grandmaster',
      name: 'Grandmaster Gary',
      difficulty: BotDifficulty.MASTER,
      eloMin: 2400,
      eloMax: 3000,
      description: 'World-class strength',
      personality: 'Nearly perfect play',
      skillLevel: 20,
      thinkingTime: 2500
    }
  ];

  /**
   * Get all available bot profiles
   */
  getBotProfiles(): BotProfile[] {
    return this.botProfiles;
  }

  /**
   * Get a bot profile by ID
   */
  getBotProfile(botId: string): BotProfile | undefined {
    return this.botProfiles.find(bot => bot.id === botId);
  }

  /**
   * Get a bot profile by difficulty
   */
  getBotByDifficulty(difficulty: BotDifficulty): BotProfile {
    const bot = this.botProfiles.find(b => b.difficulty === difficulty);
    if (!bot) {
      return this.botProfiles[2]; // Default to intermediate
    }
    return bot;
  }

  /**
   * Initialize Stockfish engine
   */
  private initStockfish(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        let initialized = false;
        const initTimeoutMs = 5000;

        // Use separate worker process for Stockfish to avoid WASM/browser global issues
        let workerPath = path.join(__dirname, '../stockfish-worker.js');
        
        // In production (dist), the worker is still in src/ if not copied
        if (!fs.existsSync(workerPath)) {
             workerPath = path.join(__dirname, '../../src/stockfish-worker.js');
        }

        if (!fs.existsSync(workerPath)) {
            // Fallback for container structure if CWD is /app/backend
            workerPath = path.resolve('src/stockfish-worker.js');
        }

        this.stockfishProcess = fork(workerPath);

        const onInitMessage = (msg: any) => {
          const line = typeof msg === 'string' ? msg : msg.toString();
          if (line === 'uciok') {
            initialized = true;
            // Cleanup init listener
            this.stockfishProcess?.removeListener('message', onInitMessage);
            resolve();
          }
        };

        this.stockfishProcess.on('message', onInitMessage);

        this.stockfishProcess.on('error', (err) => {
          if (!initialized) {
            this.stockfishProcess?.removeListener('message', onInitMessage);
            this.stockfishProcess = null;
            reject(err);
          }
        });

        this.stockfishProcess.on('exit', (code) => {
          if (!initialized) {
            this.stockfishProcess?.removeListener('message', onInitMessage);
            this.stockfishProcess = null;
            reject(new Error(`Stockfish worker exited before init (code ${code})`));
          }
        });

        // Send UCI command
        this.stockfishProcess.send('uci');

        // Timeout after 5 seconds
        setTimeout(() => {
          if (!initialized) {
            this.stockfishProcess?.removeListener('message', onInitMessage);
            try {
              this.stockfishProcess?.kill();
            } catch {
              // ignore
            }
            this.stockfishProcess = null;
            reject(new Error('Stockfish init timeout'));
          }
        }, initTimeoutMs);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get best move from Stockfish
   */
  async getBestMove(fen: string, skillLevel: number, thinkTime = 1000): Promise<string> {
    try {
      if (!this.stockfishProcess) {
        await this.initStockfish();
      }

      return new Promise((resolve, reject) => {
        let bestMove = '';

        const messageHandler = (msg: any) => {
          const line = typeof msg === 'string' ? msg : msg.toString();
          if (line.startsWith('bestmove')) {
            const match = line.match(/bestmove (\w+)/);
            if (match) {
              bestMove = match[1];
              // Cleanup listener
              this.stockfishProcess?.removeListener('message', messageHandler);
              resolve(bestMove);
            }
          }
        };

        // Remove any previous listeners to avoid duplicates if reused
        this.stockfishProcess!.removeAllListeners('message');
        this.stockfishProcess!.on('message', messageHandler);

        // Configure skill level
        this.stockfishProcess!.send(`setoption name Skill Level value ${skillLevel}`);
        this.stockfishProcess!.send(`position fen ${fen}`);
        this.stockfishProcess!.send(`go movetime ${thinkTime}`);

        // Timeout
        setTimeout(() => {
          if (!bestMove) {
            this.stockfishProcess?.removeListener('message', messageHandler);
            reject(new Error('Stockfish timeout'));
          }
        }, thinkTime + 5000);
      });
    } catch (error) {
      console.error('Error getting best move:', error);
      throw error;
    }
  }

  /**
   * Generate bot move for a given position
   */
  async generateBotMove(game: Chess, botId: string): Promise<string> {
    const bot = this.getBotProfile(botId);
    if (!bot) {
      throw new Error('Bot not found');
    }

    try {
      const fen = game.fen();
      
      // Add artificial thinking delay for realism
      await new Promise(resolve => setTimeout(resolve, bot.thinkingTime));

      // Get move from Stockfish
      const moveUCI = await this.getBestMove(fen, bot.skillLevel, 1000);
      
      // Convert UCI format (e.g., "e2e4") to SAN
      const from = moveUCI.substring(0, 2);
      const to = moveUCI.substring(2, 4);
      const promotion = moveUCI.length > 4 ? moveUCI[4] : undefined;

      const move = game.move({
        from,
        to,
        promotion
      });

      if (!move) {
        throw new Error('Invalid move generated');
      }

      return move.san;
    } catch (error) {
      console.error('Error generating bot move:', error);
      
      // Fallback: return a random legal move
      const moves = game.moves();
      if (moves.length === 0) {
        throw new Error('No legal moves available');
      }
      const randomMove = moves[Math.floor(Math.random() * moves.length)];
      game.move(randomMove);
      return randomMove;
    }
  }

  /**
   * Cleanup Stockfish process
   */
  cleanup(): void {
    if (this.stockfishProcess) {
      this.stockfishProcess.send('quit');
      this.stockfishProcess.kill();
      this.stockfishProcess = null;
    }
  }
}

export default new BotService();
