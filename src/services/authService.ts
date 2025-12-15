// Authentication Service - OTP-based passwordless authentication
// Uses backend API for authentication

import { User, Tenant, UserRole } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export class AuthService {
  /**
   * Generate OTP and send via email (calls backend API)
   */
  static async sendOTP(email: string): Promise<{ success: boolean; message: string; otp?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/otp/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, message: data.error || 'Failed to send OTP' };
      }

      return {
        success: true,
        message: data.message,
        ...(data.otp && { otp: data.otp }), // Include OTP if provided (dev mode)
      };
    } catch (error) {
      console.error('Send OTP error:', error);
      return { success: false, message: 'Failed to send OTP. Please try again.' };
    }
  }

  /**
   * Verify OTP and create/return user session (calls backend API)
   */
  static async verifyOTP(email: string, otp: string): Promise<{ success: boolean; user?: User; token?: string; message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/otp/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, message: data.error || 'Failed to verify OTP' };
      }

      if (!data.success || !data.user || !data.token) {
        return { success: false, message: data.message || 'Authentication failed' };
      }

      // Map backend user to frontend User type
      const user: User = {
        id: data.user.id,
        email: data.user.email,
        domain: data.user.domain || email.split('@')[1]?.toLowerCase() || '',
        tenant_id: data.user.tenant_id,
        role: data.user.role as UserRole,
        created_at: data.user.created_at || new Date().toISOString(),
        last_login_at: data.user.last_login_at || new Date().toISOString(),
      };

      // Store JWT token and user from backend
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('isLoggedIn', 'true');

      return {
        success: true,
        user,
        token: data.token,
        message: data.message || 'Authentication successful',
      };
    } catch (error) {
      console.error('Verify OTP error:', error);
      return { success: false, message: 'Failed to verify OTP. Please try again.' };
    }
  }

  /**
   * Get current user from session
   */
  static getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;

    try {
      return JSON.parse(userStr) as User;
    } catch {
      return null;
    }
  }

  /**
   * Logout user
   */
  static logout(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    localStorage.removeItem('isLoggedIn');
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    return localStorage.getItem('isLoggedIn') === 'true' && !!this.getCurrentUser();
  }

  /**
   * Get current user from backend API (validates token)
   */
  static async refreshUser(): Promise<User | null> {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return null;

      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // Token invalid, clear session
        this.logout();
        return null;
      }

      const data = await response.json();
      const user: User = {
        id: data.user.id,
        email: data.user.email,
        domain: data.user.domain || '',
        tenant_id: data.user.tenant_id,
        role: data.user.role as UserRole,
        created_at: data.user.created_at || new Date().toISOString(),
        last_login_at: data.user.last_login_at || new Date().toISOString(),
      };

      // Update stored user
      localStorage.setItem('user', JSON.stringify(user));
      return user;
    } catch (error) {
      console.error('Refresh user error:', error);
      return null;
    }
  }
}

