import api from './api';

interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export const authService = {
  async register(data: RegisterRequest) {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  async login(data: LoginRequest) {
    const response = await api.post('/auth/login', data);
    return response.data;
  },

  async logout() {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  async refreshToken(refreshToken: string) {
    const response = await api.post('/auth/refresh', { refreshToken });
    return response.data;
  }
};
