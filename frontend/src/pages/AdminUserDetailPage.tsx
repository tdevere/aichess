import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminService } from '../services/adminService';

interface UserDetail {
  id: string;
  username: string;
  email: string;
  bio: string;
  country: string;
  avatar: string;
  elo_bullet: number;
  elo_blitz: number;
  elo_rapid: number;
  elo_daily: number;
  is_premium: boolean;
  email_verified: boolean;
  role: string;
  deleted_at: string | null;
  created_at: string;
  total_games: number;
  wins: number;
  draws: number;
}

const AdminUserDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [games, setGames] = useState<any[]>([]);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<UserDetail>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, [id]);

  const loadUser = async () => {
    try {
      const data = await adminService.getUser(id!);
      setUser(data.user);
      setGames(data.recentGames || []);
      setFormData(data.user);
    } catch (error) {
      console.error('Failed to load user:', error);
      alert('Failed to load user');
      navigate('/admin');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await adminService.updateUser(id!, formData);
      setEditing(false);
      loadUser();
    } catch (error) {
      console.error('Failed to update user:', error);
      alert('Failed to update user');
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl">Loading...</div>
      </div>
    );
  }

  const losses = user.total_games - user.wins - user.draws;
  const winRate = user.total_games > 0 ? ((user.wins / user.total_games) * 100).toFixed(1) : 0;

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={() => navigate('/admin')}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            ← Back to Admin
          </button>
          <h1 className="text-3xl font-bold text-gray-800">User Details</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User Info Card */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold text-gray-800">{user.username}</h2>
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-green-700"
                >
                  Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-green-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => { setEditing(false); setFormData(user); }}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {!editing ? (
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-600">Email</label>
                  <p className="text-lg">{user.email}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Bio</label>
                  <p className="text-lg">{user.bio || 'No bio'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-600">Country</label>
                    <p className="text-lg">{user.country || 'Not set'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Role</label>
                    <p className="text-lg">
                      <span className={`px-3 py-1 rounded-full ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                        {user.role}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-600">Premium</label>
                    <p className="text-lg">{user.is_premium ? '✅ Yes' : '❌ No'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Email Verified</label>
                    <p className="text-lg">{user.email_verified ? '✅ Yes' : '❌ No'}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Username</label>
                  <input
                    type="text"
                    value={formData.username || ''}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Bio</label>
                  <textarea
                    value={formData.bio || ''}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Country</label>
                    <input
                      type="text"
                      value={formData.country || ''}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      maxLength={2}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isPremium || false}
                      onChange={(e) => setFormData({ ...formData, isPremium: e.target.checked })}
                    />
                    <span className="text-sm">Premium</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.emailVerified || false}
                      onChange={(e) => setFormData({ ...formData, emailVerified: e.target.checked })}
                    />
                    <span className="text-sm">Email Verified</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Stats Card */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">ELO Ratings</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-600">Bullet</label>
                  {editing ? (
                    <input
                      type="number"
                      value={formData.eloBullet || 0}
                      onChange={(e) => setFormData({ ...formData, eloBullet: parseInt(e.target.value) })}
                      className="w-full px-3 py-1 border rounded"
                    />
                  ) : (
                    <p className="text-2xl font-bold text-primary">{user.elo_bullet}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm text-gray-600">Blitz</label>
                  {editing ? (
                    <input
                      type="number"
                      value={formData.eloBlitz || 0}
                      onChange={(e) => setFormData({ ...formData, eloBlitz: parseInt(e.target.value) })}
                      className="w-full px-3 py-1 border rounded"
                    />
                  ) : (
                    <p className="text-2xl font-bold text-primary">{user.elo_blitz}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm text-gray-600">Rapid</label>
                  {editing ? (
                    <input
                      type="number"
                      value={formData.eloRapid || 0}
                      onChange={(e) => setFormData({ ...formData, eloRapid: parseInt(e.target.value) })}
                      className="w-full px-3 py-1 border rounded"
                    />
                  ) : (
                    <p className="text-2xl font-bold text-primary">{user.elo_rapid}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm text-gray-600">Daily</label>
                  {editing ? (
                    <input
                      type="number"
                      value={formData.eloDaily || 0}
                      onChange={(e) => setFormData({ ...formData, eloDaily: parseInt(e.target.value) })}
                      className="w-full px-3 py-1 border rounded"
                    />
                  ) : (
                    <p className="text-2xl font-bold text-primary">{user.elo_daily}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Game Statistics</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Games</span>
                  <span className="font-bold">{user.total_games}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Wins</span>
                  <span className="font-bold text-green-600">{user.wins}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Draws</span>
                  <span className="font-bold text-yellow-600">{user.draws}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Losses</span>
                  <span className="font-bold text-red-600">{losses}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-gray-600">Win Rate</span>
                  <span className="font-bold text-primary">{winRate}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Games */}
        <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Recent Games</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time Control</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">White</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Black</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Result</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {games.map((game) => (
                  <tr key={game.id}>
                    <td className="px-4 py-2 text-sm">{game.time_control}</td>
                    <td className="px-4 py-2 text-sm">{game.white_username}</td>
                    <td className="px-4 py-2 text-sm">{game.black_username}</td>
                    <td className="px-4 py-2 text-sm">{game.result || game.status}</td>
                    <td className="px-4 py-2 text-sm">{new Date(game.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminUserDetailPage;
