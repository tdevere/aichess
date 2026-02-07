import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

let socket: Socket | null = null;

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const { accessToken } = useAuthStore();

  useEffect(() => {
    if (accessToken && !socket) {
      socket = io({
        path: '/socket.io',
        auth: {
          token: accessToken
        }
      });

      socket.on('connect', () => {
        console.log('✅ Socket connected:', socket?.id);
        setIsConnected(true);
      });

      socket.on('disconnect', (reason) => {
        console.log('❌ Socket disconnected:', reason);
        setIsConnected(false);
      });

      socket.on('connect_error', (error) => {
        console.error('⚠️ Socket connection error:', error.message);
        setIsConnected(false);
      });

      socket.on('error', (error) => {
        console.error('⚠️ Socket error:', error);
      });
    }

    return () => {
      if (socket && !accessToken) {
        socket.disconnect();
        socket = null;
        setIsConnected(false);
      }
    };
  }, [accessToken]);

  return { socket, isConnected };
};

export const getSocket = () => socket;
