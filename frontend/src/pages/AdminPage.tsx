import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../services/adminService';
import { useAuthStore } from '../store/authStore';

interface Stats {
  users: { total: number; active: number; deleted: number; admins: number };
  games: { total: number; active: number; completed: number };
  recentUsers: Array<{ username: string; email: string; created_at: string }>;
}

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  elo_blitz: number;
  is_premium: boolean;
  deleted_at: string | null;
  created_at: string;
}

const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuthStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    loadData();
  }, [isAdmin, page, search, includeDeleted]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, usersData] = await Promise.all([
        adminService.getStats(),
        adminService.listUsers({ page, limit: 50, search, includeDeleted })
      ]);
      setStats(statsData);
      setUsers(usersData.users);
      setPagination(usersData.pagination);
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, hard = false) => {
    if (!confirm(`Are you sure you want to ${hard ? 'permanently' : 'soft'} delete this user?`)) return;
    try {
      await adminService.deleteUser(userId, hard);
      loadData();
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('Failed to delete user');
    }
  };

  const handleRestoreUser = async (userId: string) => {
    try {
      await adminService.restoreUser(userId);
      loadData();
    } catch (error) {
      console.error('Failed to restore user:', error);
      alert('Failed to restore user');
    }
  };

  const handleChangeRole = async (userId: string, newRole: 'user' | 'admin') => {
    if (!confirm(`Change user role to ${newRole}?`)) return;
    try {
      await adminService.changeUserRole(userId, newRole);
      loadData();
    } catch (error) {
      console.error('Failed to change role:', error);
      alert('Failed to change role');
    }
  };

  if (loading && !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl">Loading admin panel...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage users and view system statistics</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Users</h3>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-primary">{stats.users.total}</p>
                <p className="text-sm text-gray-600">Active: {stats.users.active}</p>
                <p className="text-sm text-gray-600">Deleted: {stats.users.deleted}</p>
                <p className="text-sm text-gray-600">Admins: {stats.users.admins}</p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Games</h3>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-primary">{stats.games.total}</p>
                <p className="text-sm text-gray-600">Active: {stats.games.active}</p>
                <p className="text-sm text-gray-600">Completed: {stats.games.completed}</p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Recent Users</h3>
              <div className="space-y-1">
                {stats.recentUsers.map((user, i) => (
                  <p key={i} className="text-sm text-gray-600 truncate">{user.username}</p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* User Management */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">User Management</h2>
            
            {/* Search and Filters */}
            <div className="flex gap-4 mb-4">
              <input
                type="text"
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
              />
              <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeDeleted}
                  onChange={(e) => setIncludeDeleted(e.target.checked)}
                />
                <span className="text-sm">Include Deleted</span>
              </label>
              <button
                onClick={() => navigate('/admin/logs')}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800"
              >
                View Logs
              </button>
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Elo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Premium</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className={user.deleted_at ? 'bg-red-50' : ''}>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/admin/users/${user.id}`)}
                        className="text-primary hover:underline font-medium"
                      >
                        {user.username}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{user.elo_blitz}</td>
                    <td className="px-4 py-3">
                      {user.is_premium && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Premium</span>}
                    </td>
                    <td className="px-4 py-3">
                      {user.deleted_at ? (
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Deleted</span>
                      ) : (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Active</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {user.deleted_at ? (
                          <button
                            onClick={() => handleRestoreUser(user.id)}
                            className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                          >
                            Restore
                          </button>
                        ) : (
                          <>
                            {user.role === 'user' ? (
                              <button
                                onClick={() => handleChangeRole(user.id, 'admin')}
                                className="text-xs bg-purple-500 text-white px-2 py-1 rounded hover:bg-purple-600"
                              >
                                Make Admin
                              </button>
                            ) : (
                              <button
                                onClick={() => handleChangeRole(user.id, 'user')}
                                className="text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600"
                              >
                                Remove Admin
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteUser(user.id, false)}
                              className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-6 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Showing {users.length} of {pagination.total} users
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-300"
              >
                Previous
              </button>
              <span className="px-4 py-2">
                Page {page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-300"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
