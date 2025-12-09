// context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthState } from '../types';

interface AuthContextType {
  authState: AuthState;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: localStorage.getItem('token'),
    isAuthenticated: false
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Validate token with backend
      validateToken(token);
    } else {
      setIsLoading(false);
    }
  }, []);

  const validateToken = async (token: string) => {
    try {
      const response = await fetch('/api/auth/validate', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const user = await response.json();
        setAuthState({ user, token, isAuthenticated: true });
      }
    } catch (error) {
      localStorage.removeItem('token');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      if (!response.ok) throw new Error('Login failed');
      
      const { user, token } = await response.json();
      localStorage.setItem('token', token);
      setAuthState({ user, token, isAuthenticated: true });
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (username: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });
      
      if (!response.ok) throw new Error('Registration failed');
      
      const { user, token } = await response.json();
      localStorage.setItem('token', token);
      setAuthState({ user, token, isAuthenticated: true });
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setAuthState({ user: null, token: null, isAuthenticated: false });
  };

  return (
    <AuthContext.Provider value={{ authState, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
