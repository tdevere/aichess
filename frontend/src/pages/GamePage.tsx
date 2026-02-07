import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { useSocket } from '../hooks/useSocket';
import { gameService } from '../services/gameService';
import { useAuthStore } from '../store/authStore';

const GamePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { socket, isConnected } = useSocket();
  const { user } = useAuthStore();
  const [game, setGame] = useState<Chess>(new Chess());
  const [gameData, setGameData] = useState<any>(null);
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
  const [whiteTime, setWhiteTime] = useState(0);
  const [blackTime, setBlackTime] = useState(0);
  const [moveFrom, setMoveFrom] = useState('');

  useEffect(() => {
    if (id) {
      loadGame();
    }
  }, [id]);

  useEffect(() => {
    if (socket && id) {
      socket.emit('join_game', id);

      socket.on('game_joined', ({ game: serverGame }) => {
        console.log('Joined game:', serverGame);
        setGameData(serverGame);
        const chess = new Chess(serverGame.fen);
        setGame(chess);
        setWhiteTime(serverGame.white_time_remaining);
        setBlackTime(serverGame.black_time_remaining);

        // Determine player color
        // Use loose equality comparison in case ID is number vs string
        if (serverGame.white_player_id == user?.id) {
            setPlayerColor('white');
        } else if (serverGame.black_player_id == user?.id) {
            setPlayerColor('black');
        } else {
            console.warn('User is neither white nor black player!', {
                userId: user?.id,
                whiteId: serverGame.white_player_id,
                blackId: serverGame.black_player_id
            });
            // Assume spectator
        }
      });

      socket.on('move_made', ({ move, fen, isCheckmate, isDraw, isStalemate }) => {
        const chess = new Chess(fen);
        setGame(chess);

        if (isCheckmate || isDraw || isStalemate) {
          let message = '';
          if (isCheckmate) message = 'Checkmate!';
          else if (isStalemate) message = 'Stalemate!';
          else if (isDraw) message = 'Draw!';
          
          setTimeout(() => {
            alert(message);
            navigate('/');
          }, 1000);
        }
      });

      socket.on('game_over', ({ result }) => {
        setTimeout(() => {
          alert(`Game Over: ${result}`);
          navigate('/');
        }, 1000);
      });

      socket.on('time_update', ({ whiteTime: wt, blackTime: bt }) => {
        setWhiteTime(wt);
        setBlackTime(bt);
      });

      return () => {
        socket.emit('leave_game', id);
        socket.off('game_joined');
        socket.off('move_made');
        socket.off('game_over');
        socket.off('time_update');
      };
    }
  }, [socket, id, user]);

  const loadGame = async () => {
    try {
      const data = await gameService.getGame(id!);
      setGameData(data);
      const chess = new Chess(data.fen);
      setGame(chess);
      setWhiteTime(data.white_time_remaining);
      setBlackTime(data.black_time_remaining);
    } catch (error) {
      console.error('Failed to load game:', error);
      navigate('/');
    }
  };

  const onDrop = (sourceSquare: string, targetSquare: string) => {
    console.log('onDrop called:', { sourceSquare, targetSquare, turn: game.turn(), playerColor });
    
    // Check if it's player's turn
    const isPlayerTurn = 
      (game.turn() === 'w' && playerColor === 'white') ||
      (game.turn() === 'b' && playerColor === 'black');

    console.log('Is player turn:', isPlayerTurn);

    if (!isPlayerTurn) {
      console.log('Not player turn, rejecting move');
      return false;
    }

    try {
      // Make a copy to test the move
      const testGame = new Chess(game.fen());
      const move = testGame.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q'
      });

      if (move) {
        console.log('Valid move, emitting to server:', move.san);
        socket?.emit('make_move', {
          gameId: id,
          move: move.san
        });
        return true;
      }
      console.log('Invalid move');
      return false;
    } catch (error) {
      console.error('Move error:', error);
      return false;
    }
  };

  const handleResign = () => {
    if (confirm('Are you sure you want to resign?')) {
      socket?.emit('resign', id);
    }
  };

  const handleOfferDraw = () => {
    if (confirm('Offer a draw to your opponent?')) {
      socket?.emit('draw_offer', id);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!gameData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl">Loading game...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chessboard */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-lg p-4">
                {/* Opponent Info */}
                <div className="flex justify-between items-center mb-4 p-3 bg-gray-100 rounded">
                  <div className="font-bold">
                    {playerColor === 'white' ? gameData.black_username : gameData.white_username}
                  </div>
                  <div className="font-bold text-lg">
                    {playerColor === 'white' ? formatTime(blackTime) : formatTime(whiteTime)}
                  </div>
                </div>

                {/* Board */}
                <Chessboard
                  position={game.fen()}
                  onPieceDrop={onDrop}
                  boardOrientation={playerColor}
                  isDraggablePiece={({ piece }) => {
                    const isPlayerTurn = 
                      (game.turn() === 'w' && playerColor === 'white') ||
                      (game.turn() === 'b' && playerColor === 'black');
                    
                    if (!isPlayerTurn) return false;
                    
                    // White pieces start with 'w', black with 'b'
                    const pieceColor = piece[0];
                    return (pieceColor === 'w' && playerColor === 'white') || 
                           (pieceColor === 'b' && playerColor === 'black');
                  }}
                  customBoardStyle={{
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                  }}
                />

                {/* Player Info */}
                <div className="flex justify-between items-center mt-4 p-3 bg-gray-100 rounded">
                  <div className="font-bold">
                    {playerColor === 'white' ? gameData.white_username : gameData.black_username} (You)
                  </div>
                  <div className="font-bold text-lg">
                    {playerColor === 'white' ? formatTime(whiteTime) : formatTime(blackTime)}
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Game Controls */}
              <div className="bg-white rounded-lg shadow-lg p-4">
                <h3 className="text-xl font-bold mb-4">Game Controls</h3>
                <div className="space-y-2">
                  <button
                    onClick={handleResign}
                    className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded transition"
                  >
                    Resign
                  </button>
                  <button
                    onClick={handleOfferDraw}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition"
                  >
                    Offer Draw
                  </button>
                  <button
                    onClick={() => navigate('/')}
                    className="w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded transition"
                  >
                    Back to Home
                  </button>
                </div>
              </div>

              {/* Move List */}
              <div className="bg-white rounded-lg shadow-lg p-4">
                <h3 className="text-xl font-bold mb-4">Moves</h3>
                <div className="max-h-96 overflow-y-auto">
                  <div className="text-sm font-mono">
                    {game.history().map((move, index) => (
                      <div key={index} className={index % 2 === 0 ? 'bg-gray-50 p-1' : 'p-1'}>
                        {Math.floor(index / 2) + 1}. {move}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Game Info */}
              <div className="bg-white rounded-lg shadow-lg p-4">
                <h3 className="text-xl font-bold mb-4">Game Info</h3>
                <div className="text-sm space-y-2">
                  <div><strong>Time Control:</strong> {gameData.time_control}</div>
                  <div><strong>Rated:</strong> {gameData.is_rated ? 'Yes' : 'No'}</div>
                  <div><strong>Status:</strong> {gameData.status}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GamePage;
