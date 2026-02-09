import { create } from 'zustand';

interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  eloBullet: number;
  eloBlitz: number;
  eloRapid: number;
  eloDaily: number;
  isOnline: boolean;
  isPremium: boolean;
  role: string;
}

interface AuthStore {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (user: User, accessToken: string, refreshToken: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
  updateToken: (accessToken: string) => void;
}

const storedUser = localStorage.getItem('user');
const initialUser = storedUser ? JSON.parse(storedUser) : null;

export const useAuthStore = create<AuthStore>((set) => ({
  user: initialUser,
  accessToken: localStorage.getItem('accessToken'),
  refreshToken: localStorage.getItem('refreshToken'),
  isAuthenticated: !!localStorage.getItem('accessToken'),
  isAdmin: initialUser?.role === 'admin',
  
  login: (user, accessToken, refreshToken) => {
    console.log('🔐 Login called with user:', user);
    console.log('🔐 User role:', user.role);
    console.log('🔐 Is admin?', user.role === 'admin');
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, accessToken, refreshToken, isAuthenticated: true, isAdmin: user.role === 'admin' });
    console.log('🔐 Auth store updated, isAdmin:', user.role === 'admin');
  },

  setTokens: (accessToken, refreshToken) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    set({ accessToken, refreshToken, isAuthenticated: true });
  },
  
  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, isAdmin: false });
  },
  
  updateToken: (accessToken) => {
    localStorage.setItem('accessToken', accessToken);
    set({ accessToken });
  }
}));
