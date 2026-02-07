import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { puzzleService } from '../services/puzzleService';
import type { Puzzle } from '../services/puzzleService';

const PuzzlePage: React.FC = () => {
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [game, setGame] = useState<Chess | null>(null);
  const [position, setPosition] = useState<string>('');
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [userMoves, setUserMoves] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [solved, setSolved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [startTime, setStartTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const [moveHistory, setMoveHistory] = useState<Array<{move: string, correct: boolean}>>([]);
  const [difficulty, setDifficulty] = useState<string>('');
  const [theme, setTheme] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    loadPuzzle();
  }, [difficulty, theme]);

  useEffect(() => {
    if (solved || !puzzle) return;
    const timer = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [startTime, solved, puzzle]);

  const loadPuzzle = async () => {
    try {
      setLoading(true);
      setFeedback(null);
      setSolved(false);
      setCurrentMoveIndex(0);
      setUserMoves([]);
      setShowHint(false);
      setHintsUsed(0);
      setShowSolution(false);
      setMoveHistory([]);
      setStartTime(Date.now());
      setElapsedTime(0);

      const newPuzzle = await puzzleService.getRandomPuzzle(
        difficulty || undefined,
        theme || undefined,
        []
      );
      
      setPuzzle(newPuzzle);
      
      const newGame = new Chess(newPuzzle.fen);
      setGame(newGame);
      setPosition(newGame.fen());
    } catch (error) {
      console.error('Failed to load puzzle:', error);
    } finally {
      setLoading(false);
    }
  };

  const onDrop = (sourceSquare: string, targetSquare: string) => {
    if (!game || !puzzle || solved) return false;

    try {
      // Try the move
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q' // Always promote to queen for simplicity
      });

      if (move === null) return false;

      const moveStr = move.from + move.to;
      const expectedMove = puzzle.moves[currentMoveIndex];

      setUserMoves([...userMoves, moveStr]);
      setShowHint(false);

      if (moveStr === expectedMove) {
        setMoveHistory([...moveHistory, { move: move.san, correct: true }]);
        // Correct move!
        setFeedback('correct');
        setPosition(game.fen());

        if (currentMoveIndex === puzzle.moves.length - 1) {
          // Puzzle solved!
          handlePuzzleSolved(true);
        } else {
          // Make opponent's response (if exists)
          setCurrentMoveIndex(currentMoveIndex + 1);
          
          if (currentMoveIndex + 1 < puzzle.moves.length) {
            setTimeout(() => {
              const opponentMove = puzzle.moves[currentMoveIndex + 1];
              game.move({
                from: opponentMove.substring(0, 2),
                to: opponentMove.substring(2, 4)
              });
              setPosition(game.fen());
              setCurrentMoveIndex(currentMoveIndex + 2);
              setFeedback(null);
            }, 500);
          }
        }
      } else {
        // Incorrect move
        setMoveHistory([...moveHistory, { move: move.san, correct: false }]);
        setFeedback('incorrect');
        handlePuzzleSolved(false);
        
        // Undo the move
        setTimeout(() => {
          game.undo();
          setPosition(game.fen());
        }, 1000);
      }

      return true;
    } catch (error) {
      return false;
    }
  };

  const handlePuzzleSolved = async (success: boolean) => {
    if (!puzzle) return;
    
    setSolved(true);
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);

    try {
      await puzzleService.solvePuzzle(puzzle.id, success, timeSpent);
    } catch (error) {
      console.error('Failed to record puzzle attempt:', error);
    }
  };

  const handleSkip = () => {
    loadPuzzle();
  };

  const handleNewPuzzle = () => {
    loadPuzzle();
  };

  const handleRetry = () => {
    if (!puzzle) return;
    
    // Reset all state to initial puzzle state
    setFeedback(null);
    setSolved(false);
    setCurrentMoveIndex(0);
    setUserMoves([]);
    setShowHint(false);
    setShowSolution(false);
    setMoveHistory([]);
    setStartTime(Date.now());
    setElapsedTime(0);
    
    // Reset board to initial position
    const newGame = new Chess(puzzle.fen);
    setGame(newGame);
    setPosition(newGame.fen());
  };

  const handleShowHint = () => {
    if (!solved && puzzle) {
      setShowHint(true);
      setHintsUsed(hintsUsed + 1);
    }
  };

  const handleShowSolution = () => {
    if (!solved && puzzle) {
      setShowSolution(true);
      setHintsUsed(hintsUsed + 3); // Heavy penalty for showing full solution
    }
  };

  const getObjectiveMessage = (): string => {
    if (!puzzle) return 'Find the best move';
    const movesLeft = Math.ceil((puzzle.moves.length - currentMoveIndex) / 2);
    
    switch (puzzle.theme) {
      case 'checkmate':
        return movesLeft === 1 ? 'Find checkmate!' : `Find checkmate in ${movesLeft} moves`;
      case 'tactical':
        return 'Find the tactical blow';
      case 'endgame':
        return 'Find the winning endgame move';
      case 'opening':
        return 'Find the best opening move';
      case 'defensive':
        return 'Find the defensive move';
      default:
        return 'Find the best move';
    }
  };

  const getHintSquare = (): string => {
    if (!puzzle || !showHint) return '';
    const nextMove = puzzle.moves[currentMoveIndex];
    return nextMove ? nextMove.substring(0, 2) : '';
  };

  const getHintDestSquare = (): string => {
    if (!puzzle || !showSolution) return '';
    const nextMove = puzzle.moves[currentMoveIndex];
    return nextMove ? nextMove.substring(2, 4) : '';
  };

  const getSolutionMoves = (): string[] => {
    if (!puzzle) return [];
    return puzzle.moves.map((moveStr, idx) => {
      // Convert algebraic notation (e.g., e2e4) to readable format
      const from = moveStr.substring(0, 2);
      const to = moveStr.substring(2, 4);
      const prefix = idx % 2 === 0 ? `${Math.floor(idx / 2) + 1}. ` : '... ';
      return `${prefix}${from}→${to}`;
    });
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading puzzle...</p>
        </div>
      </div>
    );
  }

  if (!puzzle || !game) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load puzzle</p>
          <button
            onClick={loadPuzzle}
            className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => navigate('/')}
            className="text-primary hover:text-primary-dark"
          >
            ← Back to Home
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chessboard */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h1 className="text-2xl font-bold mb-4">Chess Puzzle</h1>
              
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">
                    Difficulty: <span className="capitalize text-gray-900">{puzzle.difficulty}</span>
                  </span>
                  <span className="text-sm font-medium text-gray-600">
                    Theme: <span className="capitalize text-gray-900">{puzzle.theme}</span>
                  </span>
                  <span className="text-sm font-medium text-gray-600">
                    Rating: <span className="text-gray-900">{puzzle.rating}</span>
                  </span>
                </div>
                
                {/* Objective */}
                <div className="bg-blue-50 border-l-4 border-blue-500 p-3 mb-3">
                  <p className="font-semibold text-blue-900 text-lg">{getObjectiveMessage()}</p>
                  {puzzle.description && (
                    <p className="text-blue-700 text-sm mt-1">{puzzle.description}</p>
                  )}
                </div>

                {/* Progress and Timer */}
                {!solved && (
                  <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3 mb-3">
                    <div className="flex items-center space-x-4">
                      <span className="text-sm font-medium text-gray-700">
                        Move: <span className="text-gray-900">{Math.floor(currentMoveIndex / 2) + 1} of {Math.ceil(puzzle.moves.length / 2)}</span>
                      </span>
                      <span className="text-sm font-medium text-gray-700">
                        Time: <span className="text-gray-900">{formatTime(elapsedTime)}</span>
                      </span>
                      {hintsUsed > 0 && (
                        <span className="text-sm font-medium text-yellow-700">
                          Hints: <span className="text-yellow-900">{hintsUsed}</span>
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Turn Indicator */}
                {!solved && (
                  <div className="bg-indigo-50 border-2 border-indigo-400 rounded-lg p-4 mb-3">
                    <div className="flex items-center">
                      <span className="text-3xl mr-3">
                        {position.includes(' w ') ? '⚪' : '⚫'}
                      </span>
                      <div>
                        <p className="font-bold text-indigo-900 text-lg">
                          {position.includes(' w ') ? 'White to move' : 'Black to move'}
                        </p>
                        <p className="text-sm text-indigo-700">
                          Drag a piece to make your move
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="max-w-2xl mx-auto">
                <Chessboard
                  position={position}
                  onPieceDrop={onDrop}
                  boardOrientation={position.includes(' w ') ? 'white' : 'black'}
                  customBoardStyle={{
                    borderRadius: '4px',
                    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)'
                  }}
                  customSquareStyles={{
                    ...(showHint ? {
                      [getHintSquare()]: {
                        backgroundColor: 'rgba(255, 255, 0, 0.6)',
                        boxShadow: '0 0 10px rgba(255, 255, 0, 0.8)'
                      }
                    } : {}),
                    ...(showSolution ? {
                      [getHintSquare()]: {
                        backgroundColor: 'rgba(0, 255, 0, 0.6)',
                        boxShadow: '0 0 10px rgba(0, 255, 0, 0.8)'
                      },
                      [getHintDestSquare()]: {
                        backgroundColor: 'rgba(0, 255, 255, 0.6)',
                        boxShadow: '0 0 10px rgba(0, 255, 255, 0.8)'
                      }
                    } : {})
                  }}
                />
              </div>

              {/* Solution Display */}
              {showSolution && !solved && puzzle && (
                <div className="mt-4 p-4 bg-green-50 border-2 border-green-500 rounded-lg">
                  <p className="font-bold text-green-900 mb-2">📖 Complete Solution:</p>
                  <div className="flex flex-wrap gap-2 text-sm text-green-800">
                    {getSolutionMoves().map((move, idx) => (
                      <span
                        key={idx}
                        className={`px-2 py-1 rounded ${
                          idx < currentMoveIndex
                            ? 'bg-green-200 font-semibold'
                            : idx === currentMoveIndex
                            ? 'bg-yellow-200 font-bold'
                            : 'bg-white'
                        }`}
                      >
                        {move}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-green-700 mt-2">
                    🟢 Green source square → 🔵 Cyan destination square highlighted on board
                  </p>
                </div>
              )}

              {/* Feedback */}
              {feedback && (
                <div className={`mt-4 p-4 rounded-lg text-center border-2 ${
                  feedback === 'correct' 
                    ? 'bg-green-50 text-green-800 border-green-400' 
                    : 'bg-red-50 text-red-800 border-red-400'
                }`}>
                  <p className="font-bold text-lg">
                    {feedback === 'correct' ? '✓ Correct Move!' : '✗ Incorrect Move'}
                  </p>
                  {feedback === 'correct' && !solved && puzzle && (
                    <p className="text-sm mt-1">
                      {Math.ceil((puzzle.moves.length - currentMoveIndex) / 2)} more move{Math.ceil((puzzle.moves.length - currentMoveIndex) / 2) > 1 ? 's' : ''} to go!
                    </p>
                  )}
                  {feedback === 'incorrect' && (
                    <p className="text-sm mt-1">That's not the best move. Try a new puzzle!</p>
                  )}
                </div>
              )}

              {/* Solved */}
              {solved && feedback === 'correct' && (
                <div className="mt-4 p-6 bg-gradient-to-r from-green-400 to-green-600 rounded-lg text-center text-white shadow-lg">
                  <p className="font-bold text-2xl mb-2">🎉 Puzzle Solved! 🎉</p>
                  <div className="flex justify-center space-x-6 mb-4 text-sm">
                    <span>⏱️ Time: {formatTime(elapsedTime)}</span>
                    {hintsUsed > 0 && <span>💡 Hints: {hintsUsed}</span>}
                    <span>🎯 Rating: {puzzle.rating}</span>
                  </div>
                  <button
                    onClick={handleNewPuzzle}
                    className="bg-white text-green-600 font-bold px-6 py-3 rounded-lg hover:bg-gray-100 transition"
                  >
                    Next Puzzle →
                  </button>
                </div>
              )}

              {/* Hint Section */}
              {!solved && !feedback && !showSolution && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                  <p className="text-sm text-yellow-800 mb-2">
                    💡 <strong>Strategy Tip:</strong> Look for forcing moves like checks, captures, or threats
                  </p>
                </div>
              )}

              {!solved && (
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <button
                    onClick={handleShowHint}
                    disabled={showHint || showSolution}
                    className={`px-5 py-2 rounded-lg font-medium transition ${
                      showHint || showSolution
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-yellow-500 text-white hover:bg-yellow-600'
                    }`}
                    title="Highlights the piece to move (-1 hint)"
                  >
                    {showHint ? '💡 Hint Active' : '💡 Show Hint'}
                  </button>
                  <button
                    onClick={handleShowSolution}
                    disabled={showSolution}
                    className={`px-5 py-2 rounded-lg font-medium transition ${
                      showSolution
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-green-500 text-white hover:bg-green-600'
                    }`}
                    title="Shows complete solution with move sequence (-3 hints penalty)"
                  >
                    {showSolution ? '📖 Solution Shown' : '📖 Show Solution'}
                  </button>
                  <button
                    onClick={handleRetry}
                    className="px-5 py-2 rounded-lg font-medium border-2 border-blue-500 text-blue-600 hover:bg-blue-50 transition"
                    title="Reset and try this puzzle again from the start"
                  >
                    🔄 Retry Puzzle
                  </button>
                  <button
                    onClick={handleSkip}
                    className="text-gray-600 hover:text-gray-900 px-5 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    ⏭️ Skip Puzzle
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4">Filters</h2>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Difficulty
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">All Levels</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="expert">Expert</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Theme
                </label>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">All Themes</option>
                  <option value="checkmate">Checkmate</option>
                  <option value="tactical">Tactical</option>
                  <option value="endgame">Endgame</option>
                  <option value="opening">Opening</option>
                  <option value="defensive">Defensive</option>
                </select>
              </div>
            </div>

            {/* Move History */}
            {moveHistory.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold mb-4">Your Moves</h2>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {moveHistory.map((entry, idx) => (
                    <div
                      key={idx}
                      className={`text-sm px-3 py-2 rounded ${
                        entry.correct
                          ? 'bg-green-50 text-green-800'
                          : 'bg-red-50 text-red-800 line-through'
                      }`}
                    >
                      {idx + 1}. {entry.move} {entry.correct ? '✓' : '✗'}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4">How to Play</h2>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>• Find the best move for your side</li>
                <li>• Drag and drop pieces to make your move</li>
                <li>• The opponent's response is automatic</li>
                <li>• Use hints if you get stuck (tracked)</li>
                <li>• Solve faster for better performance</li>
                <li>• Use filters to practice specific themes</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PuzzlePage;
