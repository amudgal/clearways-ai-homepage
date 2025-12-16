// Authentication Service - OTP-based passwordless authentication
// Uses backend API for authentication

import { User, Tenant, UserRole } from '../types';
import { getApiBaseUrl } from '../utils/apiConfig';

// Get API URL dynamically to ensure HTTPS conversion happens at runtime
const getApiUrl = () => getApiBaseUrl();

export class AuthService {
  /**
   * Generate OTP and send via email (calls backend API)
   */
  static async sendOTP(email: string): Promise<{ success: boolean; message: string; otp?: string }> {
    try {
      const apiUrl = getApiUrl();
      console.log('[AuthService] Sending OTP request to:', `${apiUrl}/auth/otp/send`);
      
      const response = await fetch(`${apiUrl}/auth/otp/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      console.log('[AuthService] Response status:', response.status, response.statusText);

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('[AuthService] Non-JSON response:', text);
        return { 
          success: false, 
          message: `Server error (${response.status}): ${text.substring(0, 100)}` 
        };
      }

      const data = await response.json();
      console.log('[AuthService] Response data:', data);

      if (!response.ok) {
        return { success: false, message: data.error || `Failed to send OTP (${response.status})` };
      }

      return {
        success: true,
        message: data.message,
        ...(data.otp && { otp: data.otp }), // Include OTP if provided (dev mode)
      };
    } catch (error) {
      console.error('[AuthService] Send OTP error:', error);
      
      // Provide more specific error messages
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        return { 
          success: false, 
          message: 'Network error: Cannot connect to server. Please check your connection or contact support.' 
        };
      }
      
      if (error instanceof Error) {
        return { 
          success: false, 
          message: `Error: ${error.message}` 
        };
      }
      
      return { success: false, message: 'Failed to send OTP. Please try again.' };
    }
  }

  /**
   * Verify OTP and create/return user session (calls backend API)
   */
  static async verifyOTP(email: string, otp: string): Promise<{ success: boolean; user?: User; token?: string; message: string }> {
    try {
      const response = await fetch(`${getApiUrl()}/auth/otp/verify`, {
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

      const response = await fetch(`${getApiUrl()}/auth/me`, {
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

