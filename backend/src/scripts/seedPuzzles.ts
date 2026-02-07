import pool from '../db';
import { PuzzleDifficulty, PuzzleTheme } from '../../../shared/src/types';

/**
 * Sample puzzle dataset for seeding the database
 * In production, import from Lichess puzzle database (https://database.lichess.org/#puzzles)
 */
const samplePuzzles = [
  // Beginner - Checkmate in 1
  {
    fen: '5rk1/pp4pp/2p5/2b5/4PQ2/6P1/PPP4P/5RK1 w - - 0 1',
    moves: ['f4f8'],
    rating: 800,
    theme: PuzzleTheme.CHECKMATE,
    difficulty: PuzzleDifficulty.BEGINNER,
    description: 'Deliver checkmate in one move'
  },
  {
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 0 1',
    moves: ['h5f7'],
    rating: 850,
    theme: PuzzleTheme.CHECKMATE,
    difficulty: PuzzleDifficulty.BEGINNER,
    description: 'Classic scholar\'s mate pattern'
  },
  {
    fen: 'rnb1kbnr/pppp1ppp/8/4p3/5PPq/8/PPPPP2P/RNBQKBNR w KQkq - 0 1',
    moves: ['g2g3', 'h4g3'],
    rating: 900,
    theme: PuzzleTheme.DEFENSIVE,
    difficulty: PuzzleDifficulty.BEGINNER,
    description: 'Defend against checkmate threat'
  },

  // Beginner - Basic Tactics
  {
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1',
    moves: ['f3e5', 'c6e5', 'c4f7'],
    rating: 950,
    theme: PuzzleTheme.TACTICAL,
    difficulty: PuzzleDifficulty.BEGINNER,
    description: 'Win material with a fork'
  },
  {
    fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 1',
    moves: ['c4f7', 'e8f7', 'd1d5'],
    rating: 1000,
    theme: PuzzleTheme.TACTICAL,
    difficulty: PuzzleDifficulty.BEGINNER,
    description: 'Discovered attack wins the queen'
  },

  // Intermediate - Tactical Combinations
  {
    fen: 'r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 1',
    moves: ['c4f7', 'f8f7', 'c3d5', 'f7f8', 'd5e7'],
    rating: 1400,
    theme: PuzzleTheme.TACTICAL,
    difficulty: PuzzleDifficulty.INTERMEDIATE,
    description: 'Calculate a forcing sequence'
  },
  {
    fen: 'r2q1rk1/ppp2ppp/2n1bn2/2bpp3/4P3/2PP1N2/PP1NBPPP/R1BQ1RK1 w - - 0 1',
    moves: ['d2h6', 'g7h6', 'd1d2', 'h6g7', 'f1d1'],
    rating: 1450,
    theme: PuzzleTheme.TACTICAL,
    difficulty: PuzzleDifficulty.INTERMEDIATE,
    description: 'Exchange sacrifice for attack'
  },
  {
    fen: '2kr3r/ppp2ppp/2n1bq2/3p4/3P4/2PB1N2/PP3PPP/R1BQR1K1 w - - 0 1',
    moves: ['d3h7', 'f6h4', 'e1e6', 'c8b8', 'h7g8'],
    rating: 1500,
    theme: PuzzleTheme.TACTICAL,
    difficulty: PuzzleDifficulty.INTERMEDIATE,
    description: 'Deflection and mate'
  },

  // Intermediate - Endgames
  {
    fen: '8/8/8/4k3/8/3K4/5R2/8 w - - 0 1',
    moves: ['f2f5', 'e5e6', 'f5f6', 'e6e7', 'f6f7'],
    rating: 1300,
    theme: PuzzleTheme.ENDGAME,
    difficulty: PuzzleDifficulty.INTERMEDIATE,
    description: 'King and rook vs king technique'
  },
  {
    fen: '8/8/1k6/8/2K5/8/1P6/8 w - - 0 1',
    moves: ['c4d5', 'b6b5', 'b2b4', 'b5b6', 'd5c4'],
    rating: 1350,
    theme: PuzzleTheme.ENDGAME,
    difficulty: PuzzleDifficulty.INTERMEDIATE,
    description: 'Pawn endgame breakthrough'
  },

  // Advanced - Complex Tactics
  {
    fen: 'r2qkb1r/ppp2ppp/2n2n2/3pp1B1/1b1PP3/2N2N2/PPP2PPP/R2QKB1R w KQkq - 0 1',
    moves: ['c3d5', 'f6d5', 'e4d5', 'c6e7', 'd1e2'],
    rating: 1800,
    theme: PuzzleTheme.TACTICAL,
    difficulty: PuzzleDifficulty.ADVANCED,
    description: 'Complex piece sacrifice'
  },
  {
    fen: '3r2k1/pp3ppp/2p5/8/3P4/2P3P1/P4PKP/3R4 w - - 0 1',
    moves: ['d1d8', 'd8d8', 'a2a4', 'g8f7', 'a4a5'],
    rating: 1850,
    theme: PuzzleTheme.ENDGAME,
    difficulty: PuzzleDifficulty.ADVANCED,
    description: 'Rook endgame technique'
  },

  // Advanced - Opening Traps
  {
    fen: 'rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 1',
    moves: ['f3e5', 'd7d6', 'e5f3', 'f6e4', 'd1e2'],
    rating: 1700,
    theme: PuzzleTheme.OPENING,
    difficulty: PuzzleDifficulty.ADVANCED,
    description: 'Punish a premature attack'
  },

  // Expert - Master Level
  {
    fen: '2r3k1/5ppp/p1n1p3/1p6/3qN3/P4Q2/1P3PPP/3R2K1 w - - 0 1',
    moves: ['f3f7', 'g8h8', 'd1d4', 'c6d4', 'e4g5'],
    rating: 2100,
    theme: PuzzleTheme.TACTICAL,
    difficulty: PuzzleDifficulty.EXPERT,
    description: 'Find the winning combination'
  },
  {
    fen: 'r4rk1/1bqnbppp/p2ppn2/1p6/3NPP2/2NBB3/PPPQ2PP/2KR3R w - - 0 1',
    moves: ['d4f5', 'e6f5', 'e4f5', 'd7f6', 'e3h6'],
    rating: 2200,
    theme: PuzzleTheme.TACTICAL,
    difficulty: PuzzleDifficulty.EXPERT,
    description: 'Complex attacking sequence'
  },
];

async function seedPuzzles() {
  console.log('🧩 Starting puzzle seeding...');

  try {
    // Check if puzzles already exist
    const existingCount = await pool.query('SELECT COUNT(*) FROM puzzles');
    const count = parseInt(existingCount.rows[0].count);

    if (count > 0) {
      console.log(`⚠️  Database already contains ${count} puzzles. Skipping seed.`);
      console.log('   To re-seed, run: DELETE FROM puzzles;');
      return;
    }

    // Insert sample puzzles
    let inserted = 0;
    for (const puzzle of samplePuzzles) {
      await pool.query(
        `INSERT INTO puzzles (fen, moves, rating, theme, difficulty, description)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          puzzle.fen,
          JSON.stringify(puzzle.moves),
          puzzle.rating,
          puzzle.theme,
          puzzle.difficulty,
          puzzle.description
        ]
      );
      inserted++;
    }

    console.log(`✅ Successfully seeded ${inserted} puzzles!`);
    console.log('\n📊 Puzzle breakdown:');
    
    const stats = await pool.query(`
      SELECT difficulty, COUNT(*) as count
      FROM puzzles
      GROUP BY difficulty
      ORDER BY 
        CASE difficulty
          WHEN 'beginner' THEN 1
          WHEN 'intermediate' THEN 2
          WHEN 'advanced' THEN 3
          WHEN 'expert' THEN 4
        END
    `);

    stats.rows.forEach(row => {
      console.log(`   ${row.difficulty}: ${row.count} puzzles`);
    });

    console.log('\n💡 To add more puzzles, import from:');
    console.log('   https://database.lichess.org/#puzzles');

  } catch (error) {
    console.error('❌ Error seeding puzzles:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run seeding if executed directly
if (require.main === module) {
  seedPuzzles()
    .then(() => {
      console.log('\n🎉 Puzzle seeding complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to seed puzzles:', error);
      process.exit(1);
    });
}

export { seedPuzzles };
