// Authentication Middleware
// JWT token verification and user context

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    tenant_id: string;
    role: string;
  };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const secret = process.env.JWT_SECRET;
    
    if (!secret) {
      throw new Error('JWT_SECRET not configured');
    }

    const decoded = jwt.verify(token, secret) as { userId: string };
    
    // Fetch user from database
    const result = await pool.query(
      `SELECT id, email, tenant_id, role 
       FROM site_users 
       WHERE id = $1`,
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = {
      id: result.rows[0].id,
      email: result.rows[0].email,
      tenant_id: result.rows[0].tenant_id,
      role: result.rows[0].role,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

// Admin-only middleware
export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
};

// Tenant isolation middleware
export const enforceTenantIsolation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // Admins can access all tenants
  if (req.user.role === 'ADMIN') {
    return next();
  }

  // For analysis routes, ensure tenant_id matches
  if (req.params.id) {
    const result = await pool.query(
      `SELECT tenant_id FROM site_analyses WHERE id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    if (result.rows[0].tenant_id !== req.user.tenant_id) {
      return res.status(403).json({ error: 'Access denied: tenant isolation' });
    }
  }

  next();
};

