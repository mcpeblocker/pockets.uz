import express from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase, dbRun, dbGet } from '../db/database.js';
import { generateToken, authenticateToken } from '../middleware/auth.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/email.js';
import crypto from 'crypto';

const router = express.Router();

// Sign up
router.post('/signup', async (req, res, next) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const db = getDatabase();

    // Check if user exists
    const existingUser = await dbGet(db, 'SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Create user (email starts as unverified)
    await dbRun(
      db,
      `INSERT INTO users (id, email, password_hash, name, verification_token, email_verified)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, email.toLowerCase(), passwordHash, name || null, verificationToken, 0]
    );

    // Send verification email (required before sign-in)
    try {
      await sendVerificationEmail(email, verificationToken);
    } catch (emailError) {
      console.error('Error sending verification email:', emailError);
      // Don't fail signup if email fails
    }

    res.status(201).json({
      success: true,
      user: { id: userId, email, name },
      message: 'Account created! Please check your email to verify your account before signing in.'
    });
  } catch (error) {
    next(error);
  }
});

// Sign in
router.post('/signin', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const db = getDatabase();

    // Find user
    const user = await dbGet(
      db,
      'SELECT id, email, password_hash, name, email_verified FROM users WHERE email = ?',
      [email.toLowerCase()]
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Require email verification before allowing sign-in
    if (user.email_verified !== 1) {
      return res.status(403).json({
        error: 'Please verify your email address before signing in. Check your inbox for a verification link.'
      });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate token
    const token = generateToken(user.id, user.email);

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        email_verified: user.email_verified === 1
      },
      token
    });
  } catch (error) {
    next(error);
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const db = getDatabase();
    const user = await dbGet(
      db,
      'SELECT id, email, name, email_verified, created_at FROM users WHERE id = ?',
      [req.user.userId]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      email_verified: user.email_verified === 1,
      created_at: user.created_at
    });
  } catch (error) {
    next(error);
  }
});

// Verify email
router.post('/verify-email', async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    const db = getDatabase();
    const user = await dbGet(
      db,
      'SELECT id, email FROM users WHERE verification_token = ?',
      [token]
    );

    if (!user) {
      return res.status(400).json({ error: 'Invalid verification token' });
    }

    await dbRun(
      db,
      'UPDATE users SET email_verified = 1, verification_token = NULL WHERE id = ?',
      [user.id]
    );

    res.json({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    next(error);
  }
});

// Request password reset
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const db = getDatabase();
    const user = await dbGet(db, 'SELECT id, email FROM users WHERE email = ?', [email.toLowerCase()]);

    if (!user) {
      // Don't reveal if user exists
      return res.json({ success: true, message: 'If an account exists, a password reset email has been sent.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = Date.now() + 3600000; // 1 hour

    await dbRun(
      db,
      'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
      [resetToken, resetTokenExpires, user.id]
    );

    try {
      await sendPasswordResetEmail(email, resetToken);
    } catch (emailError) {
      console.error('Error sending password reset email:', emailError);
    }

    res.json({ success: true, message: 'If an account exists, a password reset email has been sent.' });
  } catch (error) {
    next(error);
  }
});

// Reset password
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const db = getDatabase();
    const user = await dbGet(
      db,
      'SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > ?',
      [token, Date.now()]
    );

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await dbRun(
      db,
      'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
      [passwordHash, user.id]
    );

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    next(error);
  }
});

// Sign out (client-side token removal, but we can add token blacklist here if needed)
router.post('/signout', authenticateToken, (req, res) => {
  res.json({ success: true, message: 'Signed out successfully' });
});

export default router;
