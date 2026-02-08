import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import HomePage from './pages/HomePage';
import PlayPage from './pages/PlayPage';
import GamePage from './pages/GamePage';
import PuzzlePage from './pages/PuzzlePage';
import AdminPage from './pages/AdminPage';
import AdminUserDetailPage from './pages/AdminUserDetailPage';
import { appVersion } from './utils/version';

function App() {
  const { isAuthenticated, isAdmin } = useAuthStore();

  return (
    <div className="min-h-screen eok-page text-slate-100">
      <Routes>
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" />} />
        <Route path="/register" element={!isAuthenticated ? <RegisterPage /> : <Navigate to="/" />} />
        <Route path="/" element={isAuthenticated ? <HomePage /> : <Navigate to="/login" />} />
        <Route path="/play" element={isAuthenticated ? <PlayPage /> : <Navigate to="/login" />} />
        <Route path="/game/:id" element={isAuthenticated ? <GamePage /> : <Navigate to="/login" />} />
        <Route path="/puzzles" element={isAuthenticated ? <PuzzlePage /> : <Navigate to="/login" />} />
        <Route path="/admin" element={isAuthenticated && isAdmin ? <AdminPage /> : <Navigate to="/" />} />
        <Route path="/admin/users/:id" element={isAuthenticated && isAdmin ? <AdminUserDetailPage /> : <Navigate to="/" />} />
      </Routes>
      <div className="fixed bottom-4 right-4 text-xs tracking-[0.2em] uppercase text-slate-400 bg-slate-900/70 border border-slate-700/70 rounded-full px-3 py-1 shadow-lg">
        Version {appVersion}
      </div>
    </div>
  );
}

export default App;

