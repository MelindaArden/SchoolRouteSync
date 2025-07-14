import Constants from 'expo-constants';

// API Configuration - connects to your existing Express.js backend
export const API_BASE_URL = __DEV__ 
  ? 'http://localhost:5000' // Development - your local backend
  : 'https://e537d7f5-b883-43fe-b64c-44c5c6138301-00-3ipw3bmo8u42i.janeway.replit.dev'; // Production - your deployed backend

export const API_ENDPOINTS = {
  LOGIN: '/api/login',
  LOGOUT: '/api/logout',
  SESSION: '/api/session',
  ROUTES: '/api/routes',
  PICKUP_SESSIONS: '/api/pickup-sessions',
  STUDENT_PICKUPS: '/api/student-pickups',
  DRIVER_LOCATION: '/api/driver-location',
  NOTIFICATIONS: '/api/notifications',
  ISSUES: '/api/issues',
  USERS: '/api/users'
};

// API Client with authentication
class ApiClient {
  private authToken: string | null = null;

  setAuthToken(token: string) {
    this.authToken = token;
  }

  clearAuthToken() {
    this.authToken = null;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.authToken) {
      headers.Authorization = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${API_BASE_URL}${endpoint}`;
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
      credentials: 'include',
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${response.status}: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  async get(endpoint: string): Promise<any> {
    return this.request(endpoint, { method: 'GET' });
  }

  async post(endpoint: string, data: any): Promise<any> {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put(endpoint: string, data: any): Promise<any> {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete(endpoint: string): Promise<any> {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();