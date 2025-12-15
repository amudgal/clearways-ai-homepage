// Authentication Context - React context for auth state management

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { AuthService } from '../services/authService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, otp: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  sendOTP: (email: string) => Promise<{ success: boolean; message: string; otp?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount and validate with backend
    const initAuth = async () => {
      const currentUser = AuthService.getCurrentUser();
      if (currentUser) {
        // Validate token with backend
        const refreshedUser = await AuthService.refreshUser();
        setUser(refreshedUser || currentUser);
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);

  const sendOTP = async (email: string) => {
    return await AuthService.sendOTP(email);
  };

  const login = async (email: string, otp: string) => {
    const result = await AuthService.verifyOTP(email, otp);
    if (result.success && result.user) {
      setUser(result.user);
      return { success: true, message: result.message };
    }
    return { success: false, message: result.message };
  };

  const logout = () => {
    AuthService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        sendOTP,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

