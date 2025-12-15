"use strict";
// Authentication Middleware
// JWT token verification and user context
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enforceTenantIsolation = exports.requireAdmin = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("../config/database");
const authenticate = async (req, res, next) => {
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
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        // Fetch user from database
        const result = await database_1.pool.query(`SELECT id, email, tenant_id, role 
       FROM site_users 
       WHERE id = $1`, [decoded.userId]);
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
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            return res.status(401).json({ error: 'Invalid token' });
        }
        console.error('Auth middleware error:', error);
        return res.status(500).json({ error: 'Authentication failed' });
    }
};
exports.authenticate = authenticate;
// Admin-only middleware
const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};
exports.requireAdmin = requireAdmin;
// Tenant isolation middleware
const enforceTenantIsolation = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    // Admins can access all tenants
    if (req.user.role === 'ADMIN') {
        return next();
    }
    // For analysis routes, ensure tenant_id matches
    if (req.params.id) {
        const result = await database_1.pool.query(`SELECT tenant_id FROM site_analyses WHERE id = $1`, [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Analysis not found' });
        }
        if (result.rows[0].tenant_id !== req.user.tenant_id) {
            return res.status(403).json({ error: 'Access denied: tenant isolation' });
        }
    }
    next();
};
exports.enforceTenantIsolation = enforceTenantIsolation;
//# sourceMappingURL=auth.js.map