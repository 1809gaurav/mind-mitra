import axios from 'axios';

export interface PlatformStats {
  total_users: number;
  active_users: number;
  sos_count: number;
}

export interface JournalEntry {
  anon_user_id: string;
  mood: number | null;
  text_excerpt: string;
  created_at: string | null;
}

const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` });

export const fetchAdminStats = (token: string) =>
  axios.get<PlatformStats>('/api/v1/admin/stats', { headers: authHeader(token) });

export const fetchRecentJournals = (token: string, limit = 10) =>
  axios.get<JournalEntry[]>(`/api/v1/admin/journals?limit=${limit}`, {
    headers: authHeader(token),
  });
