import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import pool from '../db';

// Helper to log admin actions
const logAdminAction = async (adminId: string, action: string, targetUserId: string | null, details: any, ipAddress?: string) => {
  await pool.query(
    'INSERT INTO admin_logs (admin_id, action, target_user_id, details, ip_address) VALUES ($1, $2, $3, $4, $5)',
    [adminId, action, targetUserId, JSON.stringify(details), ipAddress]
  );
};

// GET /api/admin/users - List all users with pagination and search
export const listUsers = async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = req.query.search as string || '';
    const includeDeleted = req.query.includeDeleted === 'true';
    const offset = (page - 1) * limit;

    let whereClause = includeDeleted ? '' : 'WHERE deleted_at IS NULL';
    const params: any[] = [];
    
    if (search) {
      whereClause = includeDeleted 
        ? 'WHERE (username ILIKE $1 OR email ILIKE $1)'
        : 'WHERE deleted_at IS NULL AND (username ILIKE $1 OR email ILIKE $1)';
      params.push(`%${search}%`);
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM users ${whereClause}`,
      params
    );

    const usersResult = await pool.query(
      `SELECT id, username, email, avatar, elo_bullet, elo_blitz, elo_rapid, elo_daily, 
              is_online, is_premium, email_verified, role, deleted_at, created_at, updated_at
       FROM users ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    res.json({
      users: usersResult.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
      }
    });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/admin/users/:id - Get single user details
export const getUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const userResult = await pool.query(
      `SELECT u.*, 
              (SELECT COUNT(*) FROM games WHERE white_player_id = u.id OR black_player_id = u.id) as total_games,
              (SELECT COUNT(*) FROM games WHERE (white_player_id = u.id OR black_player_id = u.id) AND result LIKE '%win' AND 
                      ((white_player_id = u.id AND result = 'white_win') OR (black_player_id = u.id AND result = 'black_win'))) as wins,
              (SELECT COUNT(*) FROM games WHERE (white_player_id = u.id OR black_player_id = u.id) AND result = 'draw') as draws
       FROM users u WHERE u.id = $1`,
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get recent games
    const gamesResult = await pool.query(
      `SELECT g.id, g.time_control, g.status, g.result, g.created_at,
              w.username as white_username, b.username as black_username
       FROM games g
       LEFT JOIN users w ON g.white_player_id = w.id
       LEFT JOIN users b ON g.black_player_id = b.id
       WHERE g.white_player_id = $1 OR g.black_player_id = $1
       ORDER BY g.created_at DESC
       LIMIT 10`,
      [id]
    );

    res.json({
      user: userResult.rows[0],
      recentGames: gamesResult.rows
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PUT /api/admin/users/:id - Update user
export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { username, email, bio, country, eloBullet, eloBlitz, eloRapid, eloDaily, isPremium, emailVerified } = req.body;

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (username !== undefined) {
      updates.push(`username = $${paramCount++}`);
      values.push(username);
    }
    if (email !== undefined) {
      updates.push(`email = $${paramCount++}`);
      values.push(email);
    }
    if (bio !== undefined) {
      updates.push(`bio = $${paramCount++}`);
      values.push(bio);
    }
    if (country !== undefined) {
      updates.push(`country = $${paramCount++}`);
      values.push(country);
    }
    if (eloBullet !== undefined) {
      updates.push(`elo_bullet = $${paramCount++}`);
      values.push(eloBullet);
    }
    if (eloBlitz !== undefined) {
      updates.push(`elo_blitz = $${paramCount++}`);
      values.push(eloBlitz);
    }
    if (eloRapid !== undefined) {
      updates.push(`elo_rapid = $${paramCount++}`);
      values.push(eloRapid);
    }
    if (eloDaily !== undefined) {
      updates.push(`elo_daily = $${paramCount++}`);
      values.push(eloDaily);
    }
    if (isPremium !== undefined) {
      updates.push(`is_premium = $${paramCount++}`);
      values.push(isPremium);
    }
    if (emailVerified !== undefined) {
      updates.push(`email_verified = $${paramCount++}`);
      values.push(emailVerified);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    await logAdminAction(req.userId!, 'UPDATE_USER', id, req.body, req.ip);

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// DELETE /api/admin/users/:id - Delete user (soft delete by default)
export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const hardDelete = req.query.hard === 'true';

    if (id === req.userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    if (hardDelete) {
      // Hard delete - permanently remove user
      await pool.query('DELETE FROM users WHERE id = $1', [id]);
      await logAdminAction(req.userId!, 'HARD_DELETE_USER', id, {}, req.ip);
      res.json({ message: 'User permanently deleted' });
    } else {
      // Soft delete - mark as deleted
      const result = await pool.query(
        'UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL RETURNING *',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found or already deleted' });
      }

      await logAdminAction(req.userId!, 'SOFT_DELETE_USER', id, {}, req.ip);
      res.json({ message: 'User deleted', user: result.rows[0] });
    }
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PATCH /api/admin/users/:id/restore - Restore soft-deleted user
export const restoreUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'UPDATE users SET deleted_at = NULL WHERE id = $1 AND deleted_at IS NOT NULL RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found or not deleted' });
    }

    await logAdminAction(req.userId!, 'RESTORE_USER', id, {}, req.ip);
    res.json({ message: 'User restored', user: result.rows[0] });
  } catch (error) {
    console.error('Restore user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PATCH /api/admin/users/:id/role - Change user role
export const changeUserRole = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be "user" or "admin"' });
    }

    if (id === req.userId) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    const result = await pool.query(
      'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [role, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    await logAdminAction(req.userId!, 'CHANGE_ROLE', id, { newRole: role }, req.ip);
    res.json({ message: 'Role updated', user: result.rows[0] });
  } catch (error) {
    console.error('Change role error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/admin/stats - Dashboard statistics
export const getStats = async (req: AuthRequest, res: Response) => {
  try {
    const usersResult = await pool.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE deleted_at IS NULL) as active, COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) as deleted, COUNT(*) FILTER (WHERE role = \'admin\') as admins FROM users');
    const gamesResult = await pool.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = \'in_progress\') as active, COUNT(*) FILTER (WHERE status = \'completed\') as completed FROM games');
    const recentUsersResult = await pool.query('SELECT username, email, created_at FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 5');

    res.json({
      users: {
        total: parseInt(usersResult.rows[0].total),
        active: parseInt(usersResult.rows[0].active),
        deleted: parseInt(usersResult.rows[0].deleted),
        admins: parseInt(usersResult.rows[0].admins)
      },
      games: {
        total: parseInt(gamesResult.rows[0].total),
        active: parseInt(gamesResult.rows[0].active),
        completed: parseInt(gamesResult.rows[0].completed)
      },
      recentUsers: recentUsersResult.rows
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/admin/logs - Get admin activity logs
export const getAdminLogs = async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*) FROM admin_logs');
    
    const logsResult = await pool.query(
      `SELECT al.*, 
              au.username as admin_username,
              tu.username as target_username
       FROM admin_logs al
       LEFT JOIN users au ON al.admin_id = au.id
       LEFT JOIN users tu ON al.target_user_id = tu.id
       ORDER BY al.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({
      logs: logsResult.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
      }
    });
  } catch (error) {
    console.error('Get admin logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
