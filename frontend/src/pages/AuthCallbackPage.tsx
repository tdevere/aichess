import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const AuthCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setTokens } = useAuthStore();

  useEffect(() => {
    const token = searchParams.get('token');
    const refreshToken = searchParams.get('refreshToken');

    if (token && refreshToken) {
      // Store tokens
      setTokens(token, refreshToken);
      
      // Fetch user profile (store will handle this if implemented, or we might need to trigger it)
      // For now, redirect to home which should load the user
      navigate('/');
      
      // Ideally we should verify the token and get user data immediately
      // But triggering a reload or ensuring App.tsx loads user is sufficient
      window.location.href = '/'; 
    } else {
      console.error('Missing tokens in callback URL');
      navigate('/login?error=missing_tokens');
    }
  }, [searchParams, navigate, setTokens]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md text-center">
        <h2 className="text-2xl font-bold mb-4">Authenticating...</h2>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-gray-600">Please wait while we log you in.</p>
      </div>
    </div>
  );
};

export default AuthCallbackPage;
