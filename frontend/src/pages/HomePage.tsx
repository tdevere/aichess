import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { gameService } from '../services/gameService';

const HomePage: React.FC = () => {
  const { user, logout, isAdmin } = useAuthStore();
  const [activeGames, setActiveGames] = useState<any[]>([]);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showBotModal, setShowBotModal] = useState(false);
  const [botProfiles, setBotProfiles] = useState<any[]>([]);
  const [selectedBotId, setSelectedBotId] = useState<string>('');
  const [selectedBotColor, setSelectedBotColor] = useState<'white' | 'black' | 'random'>('random');
  const navigate = useNavigate();
  
  console.log('🏠 HomePage - user:', user);
  console.log('🏠 HomePage - isAdmin:', isAdmin);
  console.log('🏠 HomePage - user.role:', user?.role);

  useEffect(() => {
    loadActiveGames();
    
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.user-menu-container')) {
        setShowUserMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (showBotModal && botProfiles.length === 0) {
      loadBotProfiles();
    }
  }, [showBotModal]);

  const loadBotProfiles = async () => {
    try {
      const profiles = await gameService.getBotProfiles();
      setBotProfiles(profiles);
      if (profiles.length > 0 && !selectedBotId) {
        setSelectedBotId(profiles[0].id);
      }
    } catch (error) {
      console.error('Failed to load bot profiles:', error);
    }
  };

  const handleStartBotGame = async () => {
    if (!selectedBotId) return;

    try {
      const playerColor = selectedBotColor === 'random' 
        ? (Math.random() < 0.5 ? 'white' : 'black') 
        : selectedBotColor;

      const result = await gameService.createBotGame({
        botId: selectedBotId,
        timeControl: 'blitz', // Default for now
        timeLimit: 600, // 10 minutes
        timeIncrement: 0,
        playerColor
      });

      setShowBotModal(false);
      navigate(`/game/${result.gameId}`);
    } catch (error) {
      console.error('Failed to start bot game:', error);
      alert('Failed to start game against computer');
    }
  };

  const loadActiveGames = async () => {
    try {
      const games = await gameService.getActiveGames();
      setActiveGames(games);
    } catch (error) {
      console.error('Failed to load games:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-primary">♔ Chess.com Clone</h1>
          <div className="flex items-center gap-4">
            {/* User Profile Dropdown */}
            <div className="relative user-menu-container">
              <button
                onClick={() => {
                  console.log('🖱️ Button clicked, current showUserMenu:', showUserMenu);
                  setShowUserMenu(!showUserMenu);
                }}
                className="flex items-center gap-2 text-gray-700 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition"
              >
                <span className="font-medium">Welcome, {user?.username}!</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-10 border border-gray-200">
                  <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-200">
                    Debug: isAdmin = {isAdmin ? 'true' : 'false'}
                  </div>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      className="block px-4 py-2 text-purple-600 hover:bg-purple-50 transition"
                      onClick={() => setShowUserMenu(false)}
                    >
                      🛡️ Admin Panel
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      handleLogout();
                    }}
                    className="block w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 transition"
                  >
                    🚪 Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Quick Play Section */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-6 text-gray-800">Quick Play</h2>
              <div className="grid grid-cols-2 gap-4">
                <Link
                  to="/play?mode=bullet"
                  className="bg-yellow-500 hover:bg-yellow-600 text-white p-6 rounded-lg text-center transition"
                >
                  <div className="text-3xl mb-2">⚡</div>
                  <div className="font-bold text-lg">Bullet</div>
                  <div className="text-sm">1-2 min</div>
                </Link>
                <Link
                  to="/play?mode=blitz"
                  className="bg-orange-500 hover:bg-orange-600 text-white p-6 rounded-lg text-center transition"
                >
                  <div className="text-3xl mb-2">🔥</div>
                  <div className="font-bold text-lg">Blitz</div>
                  <div className="text-sm">3-5 min</div>
                </Link>
                <Link
                  to="/play?mode=rapid"
                  className="bg-green-500 hover:bg-green-600 text-white p-6 rounded-lg text-center transition"
                >
                  <div className="text-3xl mb-2">⏱️</div>
                  <div className="font-bold text-lg">Rapid</div>
                  <div className="text-sm">10-30 min</div>
                </Link>
                <Link
                  to="/play?mode=daily"
                  className="bg-blue-500 hover:bg-blue-600 text-white p-6 rounded-lg text-center transition"
                >
                  <div className="text-3xl mb-2">📅</div>
                  <div className="font-bold text-lg">Daily</div>
                  <div className="text-sm">1-3 days</div>
                </Link>
              </div>
              
              {/* Play vs Computer */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setShowBotModal(true)}
                  className="w-full bg-gray-800 hover:bg-gray-900 text-white p-4 rounded-lg flex items-center justify-center gap-3 transition"
                >
                  <span className="text-2xl">🤖</span>
                  <span className="font-bold text-lg">Play vs Computer</span>
                </button>
              </div>
            </div>

            {/* Active Games */}
            <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
              <h2 className="text-2xl font-bold mb-4 text-gray-800">Active Games</h2>
              {activeGames.length === 0 ? (
                <p className="text-gray-600">No active games. Start a new game!</p>
              ) : (
                <div className="space-y-3">
                  {activeGames.map((game) => (
                    <Link
                      key={game.id}
                      to={`/game/${game.id}`}
                      className="block p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-bold">{game.white_username}</span>
                          {' vs '}
                          <span className="font-bold">{game.black_username}</span>
                        </div>
                        <div className="text-sm text-gray-600">{game.time_control}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* User Stats */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4 text-gray-800">Your Ratings</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-700">Bullet</span>
                  <span className="font-bold">{user?.eloBullet}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Blitz</span>
                  <span className="font-bold">{user?.eloBlitz}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Rapid</span>
                  <span className="font-bold">{user?.eloRapid}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Daily</span>
                  <span className="font-bold">{user?.eloDaily}</span>
                </div>
              </div>
            </div>

            {/* Daily Puzzle */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4 text-gray-800">Daily Puzzle</h3>
              <div className="bg-primary text-white p-4 rounded-lg text-center">
                <div className="text-4xl mb-2">🧩</div>
                <Link to="/puzzles" className="font-bold hover:underline">
                  Solve Today's Puzzle
                </Link>
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4 text-gray-800">Quick Links</h3>
              <div className="space-y-2">
                <Link to="/puzzles" className="block text-primary hover:underline">
                  📚 Puzzles
                </Link>
                <Link to="/lessons" className="block text-primary hover:underline">
                  🎓 Lessons
                </Link>
                <Link to="/tournaments" className="block text-primary hover:underline">
                  🏆 Tournaments
                </Link>
                <Link to="/leaderboard" className="block text-primary hover:underline">
                  📊 Leaderboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bot Selection Modal */}
      {showBotModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Play vs Computer</h2>
            
            <div className="mb-4">
              <label className="block text-gray-700 font-bold mb-2">Select Bot</label>
              <select 
                className="w-full p-2 border rounded"
                value={selectedBotId}
                onChange={(e) => setSelectedBotId(e.target.value)}
              >
                {botProfiles.map(bot => (
                  <option key={bot.id} value={bot.id}>
                    {bot.name} ({bot.difficulty})
                  </option>
                ))}
              </select>
              {selectedBotId && botProfiles.find(b => b.id === selectedBotId) && (
                 <p className="text-sm text-gray-500 mt-1">
                    {botProfiles.find((b: any) => b.id === selectedBotId).description}
                 </p>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 font-bold mb-2">I want to play as</label>
              <div className="flex gap-4">
                <button
                  onClick={() => setSelectedBotColor('white')}
                  className={`flex-1 p-2 rounded border ${selectedBotColor === 'white' ? 'bg-gray-200 border-gray-400' : 'hover:bg-gray-50'}`}
                >
                  White
                </button>
                <button
                  onClick={() => setSelectedBotColor('random')}
                  className={`flex-1 p-2 rounded border ${selectedBotColor === 'random' ? 'bg-gray-200 border-gray-400' : 'hover:bg-gray-50'}`}
                >
                  Random
                </button>
                <button
                  onClick={() => setSelectedBotColor('black')}
                  className={`flex-1 p-2 rounded border ${selectedBotColor === 'black' ? 'bg-gray-200 border-gray-400' : 'hover:bg-gray-50'}`}
                >
                  Black
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowBotModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleStartBotGame}
                className="px-4 py-2 bg-primary text-white rounded hover:opacity-90"
                style={{ backgroundColor: '#0066cc' }} // Fallback if primary class undefined
                disabled={!selectedBotId}
              >
                Start Game
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
