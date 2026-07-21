import apiClient from './client';

export const sendChatMessage = async (message: string, token: string) =>
  apiClient.post('/api/v1/chat', { message }, { headers: { Authorization: `Bearer ${token}` } });
