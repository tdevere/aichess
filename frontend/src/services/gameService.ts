import api from './api';

export const gameService = {
  async createGame(data: any) {
    const response = await api.post('/games', data);
    return response.data;
  },

  async getGame(gameId: string) {
    const response = await api.get(`/games/${gameId}`);
    return response.data;
  },

  async makeMove(gameId: string, move: string) {
    const response = await api.post(`/games/${gameId}/move`, { move });
    return response.data;
  },

  async resign(gameId: string) {
    const response = await api.post(`/games/${gameId}/resign`);
    return response.data;
  },

  async offerDraw(gameId: string) {
    const response = await api.post(`/games/${gameId}/draw/offer`);
    return response.data;
  },

  async acceptDraw(gameId: string) {
    const response = await api.post(`/games/${gameId}/draw/accept`);
    return response.data;
  },

  async abortGame(gameId: string) {
    const response = await api.post(`/games/${gameId}/abort`);
    return response.data;
  },

  async getActiveGames() {
    const response = await api.get('/games/active');
    return response.data;
  },

  async getGameHistory(limit?: number) {
    const response = await api.get('/games/history', { params: { limit } });
    return response.data;
  },

  async createBotGame(data: { botId: string; timeControl: string; timeLimit: number; timeIncrement: number; playerColor: string }) {
    const response = await api.post('/games/bots/create', data);
    return response.data;
  },

  async getBotProfiles() {
    const response = await api.get('/games/bots/profiles');
    return response.data;
  }
};

