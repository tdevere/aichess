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
    <div className="min-h-screen eok-page">
      {/* Header */}
      <header className="border-b border-slate-800/70 bg-slate-950/60 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">EndOfKings</p>
            <h1 className="text-3xl md:text-4xl font-bold eok-text-gradient">Command the board.</h1>
            <p className="text-sm text-slate-400 mt-1">Precision chess, cinematic presentation.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="eok-chip px-3 py-1 rounded-full text-xs">Season 01 • Live</span>
            {/* User Profile Dropdown */}
            <div className="relative user-menu-container">
              <button
                onClick={() => {
                  console.log('🖱️ Button clicked, current showUserMenu:', showUserMenu);
                  setShowUserMenu(!showUserMenu);
                }}
                className="flex items-center gap-2 text-slate-200 hover:text-white px-3 py-2 rounded-lg hover:bg-slate-800/60 transition"
              >
                <span className="font-medium">{user?.username}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-52 eok-card rounded-lg py-2 z-10">
                  <div className="px-4 py-2 text-xs text-slate-400 border-b border-slate-800/70">
                    Status: {isAdmin ? 'Admin' : 'Player'}
                  </div>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      className="block px-4 py-2 text-emerald-300 hover:bg-slate-800/60 transition"
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
                    className="block w-full text-left px-4 py-2 text-rose-300 hover:bg-rose-500/10 transition"
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
      <main className="container mx-auto px-4 py-10">
        <section className="eok-card rounded-2xl p-6 md:p-8 mb-8 relative overflow-hidden">
          <div className="absolute inset-0 opacity-40" style={{
            background: 'radial-gradient(circle at 20% 20%, rgba(124,58,237,0.35), transparent 45%), radial-gradient(circle at 80% 30%, rgba(34,211,238,0.3), transparent 45%)'
          }} />
          <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">EndOfKings Arena</p>
              <h2 className="text-3xl md:text-4xl font-bold text-white">Shape the endgame.</h2>
              <p className="text-slate-300 mt-2 max-w-xl">
                Compete in lightning formats, sharpen tactics, and climb the leaderboards with cinematic clarity.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link to="/play?mode=blitz" className="eok-btn px-5 py-2 rounded-full">Start Blitz</Link>
                <Link to="/puzzles" className="eok-btn-outline px-5 py-2 rounded-full">Solve Puzzles</Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="eok-card rounded-xl px-4 py-3">
                <p className="text-xs text-slate-400">ELO Blitz</p>
                <p className="text-2xl font-semibold text-white">{user?.eloBlitz}</p>
              </div>
              <div className="eok-card rounded-xl px-4 py-3">
                <p className="text-xs text-slate-400">ELO Rapid</p>
                <p className="text-2xl font-semibold text-white">{user?.eloRapid}</p>
              </div>
              <div className="eok-card rounded-xl px-4 py-3">
                <p className="text-xs text-slate-400">Active</p>
                <p className="text-2xl font-semibold text-white">{activeGames.length}</p>
              </div>
              <div className="eok-card rounded-xl px-4 py-3">
                <p className="text-xs text-slate-400">Mode</p>
                <p className="text-2xl font-semibold text-white">Arena</p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Quick Play Section */}
          <div className="md:col-span-2">
            <div className="eok-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Quick Play</h2>
                <span className="eok-chip px-3 py-1 rounded-full text-xs">Solo & Ranked</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Link
                  to="/play?mode=bullet"
                  className="eok-card rounded-xl p-5 text-center transition transform hover:-translate-y-1"
                >
                  <div className="text-3xl mb-2">⚡</div>
                  <div className="font-bold text-lg text-white">Bullet</div>
                  <div className="text-sm text-slate-400">1-2 min</div>
                </Link>
                <Link
                  to="/play?mode=blitz"
                  className="eok-card rounded-xl p-5 text-center transition transform hover:-translate-y-1"
                >
                  <div className="text-3xl mb-2">🔥</div>
                  <div className="font-bold text-lg text-white">Blitz</div>
                  <div className="text-sm text-slate-400">3-5 min</div>
                </Link>
                <Link
                  to="/play?mode=rapid"
                  className="eok-card rounded-xl p-5 text-center transition transform hover:-translate-y-1"
                >
                  <div className="text-3xl mb-2">⏱️</div>
                  <div className="font-bold text-lg text-white">Rapid</div>
                  <div className="text-sm text-slate-400">10-30 min</div>
                </Link>
                <Link
                  to="/play?mode=daily"
                  className="eok-card rounded-xl p-5 text-center transition transform hover:-translate-y-1"
                >
                  <div className="text-3xl mb-2">📅</div>
                  <div className="font-bold text-lg text-white">Daily</div>
                  <div className="text-sm text-slate-400">1-3 days</div>
                </Link>
              </div>
              
              {/* Play vs Computer */}
              <div className="mt-5 pt-5 border-t border-slate-800/60">
                <button
                  onClick={() => setShowBotModal(true)}
                  className="w-full eok-btn p-4 rounded-xl flex items-center justify-center gap-3"
                >
                  <span className="text-2xl">🤖</span>
                  <span className="font-bold text-lg">Play vs Computer</span>
                </button>
              </div>
            </div>

            {/* Active Games */}
            <div className="eok-card rounded-2xl p-6 mt-6">
              <h2 className="text-2xl font-bold mb-4 text-white">Active Games</h2>
              {activeGames.length === 0 ? (
                <p className="text-slate-400">No active games. Start a new game!</p>
              ) : (
                <div className="space-y-3">
                  {activeGames.map((game) => (
                    <Link
                      key={game.id}
                      to={`/game/${game.id}`}
                      className="block p-4 rounded-xl bg-slate-900/70 hover:bg-slate-900/90 transition"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-bold text-white">{game.white_username}</span>
                          {' vs '}
                          <span className="font-bold text-white">{game.black_username}</span>
                        </div>
                        <div className="text-sm text-slate-400">{game.time_control}</div>
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
            <div className="eok-card rounded-2xl p-6">
              <h3 className="text-xl font-bold mb-4 text-white">Your Ratings</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-300">Bullet</span>
                  <span className="font-bold text-white">{user?.eloBullet}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Blitz</span>
                  <span className="font-bold text-white">{user?.eloBlitz}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Rapid</span>
                  <span className="font-bold text-white">{user?.eloRapid}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Daily</span>
                  <span className="font-bold text-white">{user?.eloDaily}</span>
                </div>
              </div>
            </div>

            {/* Daily Puzzle */}
            <div className="eok-card rounded-2xl p-6">
              <h3 className="text-xl font-bold mb-4 text-white">Daily Puzzle</h3>
              <div className="rounded-xl p-4 text-center" style={{
                background: 'linear-gradient(135deg, rgba(124,58,237,0.35), rgba(34,211,238,0.35))'
              }}>
                <div className="text-4xl mb-2">🧩</div>
                <Link to="/puzzles" className="font-bold text-white hover:underline">
                  Solve Today's Puzzle
                </Link>
              </div>
            </div>

            {/* Quick Links */}
            <div className="eok-card rounded-2xl p-6">
              <h3 className="text-xl font-bold mb-4 text-white">Quick Links</h3>
              <div className="space-y-2 text-slate-300">
                <Link to="/puzzles" className="block hover:text-white transition">
                  📚 Puzzles
                </Link>
                <Link to="/lessons" className="block hover:text-white transition">
                  🎓 Lessons
                </Link>
                <Link to="/tournaments" className="block hover:text-white transition">
                  🏆 Tournaments
                </Link>
                <Link to="/leaderboard" className="block hover:text-white transition">
                  📊 Leaderboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bot Selection Modal */}
      {showBotModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="eok-card rounded-2xl shadow-xl p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4 text-white">Play vs Computer</h2>
            
            <div className="mb-4">
              <label className="block text-slate-300 font-bold mb-2">Select Bot</label>
              <select 
                className="w-full p-2 rounded eok-input"
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
                 <p className="text-sm text-slate-400 mt-1">
                    {botProfiles.find((b: any) => b.id === selectedBotId).description}
                 </p>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-slate-300 font-bold mb-2">I want to play as</label>
              <div className="flex gap-4">
                <button
                  onClick={() => setSelectedBotColor('white')}
                  className={`flex-1 p-2 rounded border ${selectedBotColor === 'white' ? 'bg-slate-200 text-slate-900 border-slate-300' : 'hover:bg-slate-800/60 text-slate-200 border-slate-700'}`}
                >
                  White
                </button>
                <button
                  onClick={() => setSelectedBotColor('random')}
                  className={`flex-1 p-2 rounded border ${selectedBotColor === 'random' ? 'bg-slate-200 text-slate-900 border-slate-300' : 'hover:bg-slate-800/60 text-slate-200 border-slate-700'}`}
                >
                  Random
                </button>
                <button
                  onClick={() => setSelectedBotColor('black')}
                  className={`flex-1 p-2 rounded border ${selectedBotColor === 'black' ? 'bg-slate-200 text-slate-900 border-slate-300' : 'hover:bg-slate-800/60 text-slate-200 border-slate-700'}`}
                >
                  Black
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowBotModal(false)}
                className="px-4 py-2 text-slate-300 hover:bg-slate-800/60 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleStartBotGame}
                className="px-4 py-2 eok-btn rounded"
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
