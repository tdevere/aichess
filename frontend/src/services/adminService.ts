import api from './api';

export const adminService = {
  // User management
  listUsers: async (params?: { page?: number; limit?: number; search?: string; includeDeleted?: boolean }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.includeDeleted) queryParams.append('includeDeleted', 'true');
    
    const response = await api.get(`/admin/users?${queryParams}`);
    return response.data;
  },

  getUser: async (id: string) => {
    const response = await api.get(`/admin/users/${id}`);
    return response.data;
  },

  updateUser: async (id: string, data: any) => {
    const response = await api.put(`/admin/users/${id}`, data);
    return response.data;
  },

  deleteUser: async (id: string, hard = false) => {
    const response = await api.delete(`/admin/users/${id}?hard=${hard}`);
    return response.data;
  },

  restoreUser: async (id: string) => {
    const response = await api.patch(`/admin/users/${id}/restore`);
    return response.data;
  },

  changeUserRole: async (id: string, role: 'user' | 'admin') => {
    const response = await api.patch(`/admin/users/${id}/role`, { role });
    return response.data;
  },

  // Dashboard & logs
  getStats: async () => {
    const response = await api.get('/admin/stats');
    return response.data;
  },

  getAdminLogs: async (params?: { page?: number; limit?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const response = await api.get(`/admin/logs?${queryParams}`);
    return response.data;
  }
};
