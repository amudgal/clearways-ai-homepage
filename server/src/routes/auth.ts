// Authentication Routes
// OTP-based passwordless authentication

import express from 'express';
import { pool } from '../config/database';
import jwt from 'jsonwebtoken';
import { query } from '../config/database';
import { sendOTPEmail, isEmailConfigured } from '../services/emailService';
import bcrypt from 'bcryptjs';

const router = express.Router();

// Send OTP
router.post('/otp/send', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) {
      return res.status(400).json({ error: 'Invalid email domain' });
    }

    // Check if domain is a valid tenant
    const tenantResult = await pool.query(
      'SELECT id, name FROM site_tenants WHERE domain = $1 AND status = $2',
      [domain, 'ACTIVE']
    );

    if (tenantResult.rows.length === 0) {
      return res.status(400).json({ error: 'Corporate email domain not recognized' });
    }

    // Block personal email domains
    const personalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com'];
    if (personalDomains.includes(domain)) {
      return res.status(400).json({ error: 'Personal email addresses are not allowed' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in database
    await pool.query(
      `INSERT INTO site_otp_store (email, code, expires_at, attempts)
       VALUES ($1, $2, $3, 0)
       ON CONFLICT (email) 
       DO UPDATE SET code = $2, expires_at = $3, attempts = 0, created_at = CURRENT_TIMESTAMP`,
      [email, otp, expiresAt]
    );

    // Send OTP email
    const emailSent = await sendOTPEmail(email, otp);
    
    const isDevelopment = process.env.NODE_ENV === 'development';
    const emailConfigured = isEmailConfigured();
    
    // In development or if email not configured, return OTP in response
    if (isDevelopment || !emailConfigured) {
      console.log(`[OTP] ${email}: ${otp} (expires at ${expiresAt.toISOString()})`);
      res.json({
        success: true,
        message: isDevelopment 
          ? `OTP sent! Your code is: ${otp} (expires in 10 minutes)`
          : `OTP generated. Email service not configured - check server logs for OTP code.`,
        ...((isDevelopment || !emailConfigured) && { otp }),
      });
    } else {
      // Production with email configured
      if (!emailSent) {
        console.error(`[OTP] Failed to send email to ${email}, but OTP was generated: ${otp}`);
        return res.status(500).json({ 
          error: 'Failed to send OTP email. Please try again or contact support.' 
        });
      }
      
      res.json({
        success: true,
        message: `OTP sent to ${email}. Please check your email.`,
      });
    }
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// Verify OTP and create session
router.post('/otp/verify', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP required' });
    }

    // Get OTP from database
    const otpResult = await pool.query(
      'SELECT code, expires_at, attempts FROM site_otp_store WHERE email = $1',
      [email]
    );

    if (otpResult.rows.length === 0) {
      return res.status(400).json({ error: 'OTP not found. Please request a new OTP.' });
    }

    const otpData = otpResult.rows[0];

    // Check expiration
    if (new Date() > new Date(otpData.expires_at)) {
      await pool.query('DELETE FROM site_otp_store WHERE email = $1', [email]);
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    // Check retry limit
    if (otpData.attempts >= 3) {
      await pool.query('DELETE FROM site_otp_store WHERE email = $1', [email]);
      return res.status(400).json({ error: 'Maximum retry attempts exceeded. Please request a new OTP.' });
    }

    // Verify OTP
    if (otpData.code !== otp) {
      await pool.query(
        'UPDATE site_otp_store SET attempts = attempts + 1 WHERE email = $1',
        [email]
      );
      return res.status(400).json({ 
        error: `Invalid OTP. ${3 - otpData.attempts - 1} attempts remaining.` 
      });
    }

    // OTP verified - get or create user
    const domain = email.split('@')[1]?.toLowerCase();
    const tenantResult = await pool.query(
      'SELECT id FROM site_tenants WHERE domain = $1 AND status = $2',
      [domain, 'ACTIVE']
    );

    if (tenantResult.rows.length === 0) {
      return res.status(400).json({ error: 'Tenant resolution failed. Domain not found or inactive.' });
    }

    const tenantId = tenantResult.rows[0].id;

    // Determine role based on domain - clearways.ai is always ADMIN, others are USER
    const role = domain === 'clearways.ai' ? 'ADMIN' : 'USER';

    // Check if user exists
    let userResult = await pool.query(
      'SELECT id, email, tenant_id, role FROM site_users WHERE email = $1',
      [email]
    );

    let userId: string;

    if (userResult.rows.length === 0) {
      // Create new user
      const newUserResult = await pool.query(
        `INSERT INTO site_users (email, domain, tenant_id, role, last_login_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
         RETURNING id, email, tenant_id, role`,
        [email, domain, tenantId, role]
      );
      userId = newUserResult.rows[0].id;
      userResult = newUserResult;
    } else {
      // Update last login
      userId = userResult.rows[0].id;
      await pool.query(
        'UPDATE site_users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
        [userId]
      );
    }

    // Generate JWT token
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET not configured');
    }

    const payload: object = { userId: String(userId) };
    const expiresIn: string | number = process.env.JWT_EXPIRES_IN || '7d';
    
    const token = jwt.sign(payload, secret as string, { expiresIn } as jwt.SignOptions);

    // Clean up OTP
    await pool.query('DELETE FROM site_otp_store WHERE email = $1', [email]);

    // Audit log - only log OTP logins from non-clearways.ai domains
    if (domain !== 'clearways.ai') {
      await pool.query(
        `INSERT INTO site_audit_logs (user_id, tenant_id, action, target_type, metadata)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, tenantId, 'LOGIN', 'user', JSON.stringify({ email, method: 'OTP', domain })]
      );
    }

    res.json({
      success: true,
      user: userResult.rows[0],
      token,
      message: 'Authentication successful',
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Get current user
router.get('/me', async (req, res) => {
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
    
    const result = await pool.query(
      `SELECT id, email, username, domain, tenant_id, role, created_at, last_login_at
       FROM site_users 
       WHERE id = $1`,
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Credential-based login (username/password)
router.post('/credentials/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Find user by username
    const userResult = await pool.query(
      `SELECT id, email, username, password_hash, tenant_id, role, domain
       FROM site_users 
       WHERE username = $1 AND password_hash IS NOT NULL`,
      [username]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = userResult.rows[0];

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Update last login
    await pool.query(
      'UPDATE site_users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Generate JWT token
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET not configured');
    }

    const payload: object = { userId: String(user.id) };
    const expiresIn: string | number = process.env.JWT_EXPIRES_IN || '7d';
    
    const token = jwt.sign(payload, secret as string, { expiresIn } as jwt.SignOptions);

    // Audit log
    await pool.query(
      `INSERT INTO site_audit_logs (user_id, tenant_id, action, target_type, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.id, user.tenant_id, 'LOGIN', 'user', JSON.stringify({ username, method: 'CREDENTIALS' })]
    );

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        tenant_id: user.tenant_id,
        role: user.role,
        domain: user.domain,
      },
      token,
      message: 'Authentication successful',
    });
  } catch (error) {
    console.error('Credential login error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

export default router;

