// src/lib/api.ts (UPDATED)

import { API_BASE_URL } from '@/config/api';

export interface Player {
  id: string;
  username: string;
  gamesPlayed: number;
  gamesWon: number;
}

export interface Match {
  id: string;
  player1Id: string;
  player2Id: string;
  status: string;
}

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      // THIS IS THE FIX: Check for an empty response before parsing JSON
      const text = await response.text();
      if (!text) {
        // If the response is empty, return null or an empty object
        // to prevent a JSON parsing error.
        return null as T;
      }
      return JSON.parse(text) as T;

    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  }

  async getPlayer(id: string): Promise<Player> {
    return this.request<Player>(`/player/${id}`);
  }

  // Add the 'id' parameter to match what the frontend is sending
  async createPlayer(username: string, id: string): Promise<Player> {
    return this.request<Player>('/player', {
      method: 'POST',
      body: JSON.stringify({ username, id }),
    });
  }

  async updatePlayer(id: string, data: Partial<Player>): Promise<Player> {
    return this.request<Player>(`/player/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async getMatch(id: string): Promise<Match> {
    return this.request<Match>(`/match/${id}`);
  }

  async getPlayerMatches(playerId: string): Promise<Match[]> {
    return this.request<Match[]>(`/match/player/${playerId}`);
  }
}

export const api = new ApiService();