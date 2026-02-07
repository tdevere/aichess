import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';

const PlayPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') || 'blitz';
  const [timeLimit, setTimeLimit] = useState(300);
  const [timeIncrement, setTimeIncrement] = useState(0);
  const [isRated, setIsRated] = useState(true);
  const [searching, setSearching] = useState(false);
  const navigate = useNavigate();
  const { socket, isConnected } = useSocket();

  const timePresets: any = {
    bullet: { limit: 60, increment: 0 },
    blitz: { limit: 300, increment: 0 },
    rapid: { limit: 600, increment: 0 },
    daily: { limit: 86400, increment: 0 }
  };

  const handleQuickPlay = () => {
    if (!socket || !isConnected) {
      console.warn('Cannot join queue: Socket not connected');
      alert('Not connected to server. Please wait for connection or refresh.');
      return;
    }

    console.log(`Joining queue: ${mode} rated=${isRated}`);
    setSearching(true);

    socket.emit('join_queue', {
      timeControl: mode,
      timeLimit,
      timeIncrement,
      ratingRange: [1000, 2000],
      isRated,
      rating: 1200
    });
    
    // Add temporary listener to confirm queue join
    socket.once('queue_joined', (data) => {
        console.log('Successfully joined queue at position', data.position);
    });

    socket.once('match_found', ({ gameId, color }) => {
      console.log('Match found!', gameId, color);
      setSearching(false);
      navigate(`/game/${gameId}`);
    });
  };

  const handleCancelSearch = () => {
    if (socket) {
      socket.emit('leave_queue', {
        timeControl: mode,
        timeLimit,
        timeIncrement
      });
      setSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-md">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-3xl font-bold text-primary">♔ Play Chess</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold mb-6 text-gray-800 capitalize">
            {mode} Game
          </h2>

          {!searching ? (
            <>
              <div className="mb-6">
                <label className="block text-gray-700 font-bold mb-2">
                  Time Limit (seconds)
                </label>
                <input
                  type="number"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                />
              </div>

              <div className="mb-6">
                <label className="block text-gray-700 font-bold mb-2">
                  Time Increment (seconds)
                </label>
                <input
                  type="number"
                  value={timeIncrement}
                  onChange={(e) => setTimeIncrement(parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                />
              </div>

              <div className="mb-8">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={isRated}
                    onChange={(e) => setIsRated(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-gray-700 font-bold">Rated Game</span>
                </label>
              </div>

              <button
                onClick={handleQuickPlay}
                disabled={!isConnected}
                className="w-full bg-primary hover:bg-green-700 text-white font-bold py-4 px-6 rounded-lg text-xl transition disabled:opacity-50"
              >
                {isConnected ? 'Find Opponent' : 'Connecting...'}
              </button>
            </>
          ) : (
            <div className="text-center">
              <div className="text-6xl mb-6 animate-pulse">♟️</div>
              <h3 className="text-2xl font-bold mb-4 text-gray-800">
                Searching for opponent...
              </h3>
              <p className="text-gray-600 mb-8">
                Finding a player with similar rating
              </p>
              <button
                onClick={handleCancelSearch}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-8 rounded-lg transition"
              >
                Cancel Search
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default PlayPage;
