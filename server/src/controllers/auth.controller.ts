import { Request, Response, NextFunction } from 'express';
import { query } from '../db/pool.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { RegisterInput, LoginInput } from '../validators/auth.js';
import { logger } from '../utils/logger.js';

export async function register(req: Request<{}, {}, RegisterInput>, res: Response, next: NextFunction): Promise<void> {
  const { name, email, password, phone } = req.body;
  const normalizedEmail = email.toLowerCase().trim();

  try {
    // Check if email already registered
    const existing = await query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (existing.rowCount && existing.rowCount > 0) {
      res.status(409).json({
        error: 'An account with this email address already exists.',
        code: 'EMAIL_ALREADY_EXISTS',
      });
      return;
    }

    // Hash password with Argon2id
    const passwordHash = await hashPassword(password);

    // STRICT ROLE RULE: Public registration always creates role = 'customer'
    const result = await query<{
      id: string;
      name: string;
      email: string;
      role: 'customer';
      phone: string | null;
      created_at: string;
    }>(
      `INSERT INTO users (name, email, password_hash, role, phone)
       VALUES ($1, $2, $3, 'customer', $4)
       RETURNING id, name, email, role, phone, created_at`,
      [name.trim(), normalizedEmail, passwordHash, phone?.trim() || null]
    );

    const newUser = result.rows[0];

    // Regenerate session to prevent session fixation attacks
    req.session.regenerate((err) => {
      if (err) {
        logger.error('Failed to regenerate session on register', { error: err.message });
      }

      req.session.user = {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      };

      req.session.save((saveErr) => {
        if (saveErr) {
          logger.error('Failed to save session on register', { error: saveErr.message });
        }

        res.status(201).json({
          message: 'Account registered successfully',
          user: newUser,
        });
      });
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request<{}, {}, LoginInput>, res: Response, next: NextFunction): Promise<void> {
  const { email, password } = req.body;
  const normalizedEmail = email.toLowerCase().trim();

  try {
    const result = await query<{
      id: string;
      name: string;
      email: string;
      password_hash: string;
      role: 'customer' | 'cashier' | 'manager';
      phone: string | null;
      created_at: string;
    }>(
      'SELECT id, name, email, password_hash, role, phone, created_at FROM users WHERE email = $1',
      [normalizedEmail]
    );

    if (result.rowCount === 0) {
      res.status(401).json({
        error: 'Invalid email or password.',
        code: 'INVALID_CREDENTIALS',
      });
      return;
    }

    const user = result.rows[0];
    const passwordValid = await verifyPassword(user.password_hash, password);

    if (!passwordValid) {
      res.status(401).json({
        error: 'Invalid email or password.',
        code: 'INVALID_CREDENTIALS',
      });
      return;
    }

    // Regenerate session to prevent session fixation
    req.session.regenerate((err) => {
      if (err) {
        logger.error('Failed to regenerate session on login', { error: err.message });
      }

      req.session.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      };

      req.session.save((saveErr) => {
        if (saveErr) {
          logger.error('Failed to save session on login', { error: saveErr.message });
        }

        res.status(200).json({
          message: 'Signed in successfully',
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            phone: user.phone,
            created_at: user.created_at,
          },
        });
      });
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.session) {
    res.status(200).json({ message: 'Logged out successfully' });
    return;
  }

  req.session.destroy((err) => {
    if (err) {
      next(err);
      return;
    }
    res.clearCookie('connect.sid');
    res.status(200).json({ message: 'Logged out successfully' });
  });
}

export async function getCurrentUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.session || !req.session.user) {
    res.status(401).json({
      error: 'Not authenticated',
      code: 'UNAUTHORIZED',
    });
    return;
  }

  try {
    const result = await query<{
      id: string;
      name: string;
      email: string;
      role: 'customer' | 'cashier' | 'manager';
      phone: string | null;
      created_at: string;
    }>(
      'SELECT id, name, email, role, phone, created_at FROM users WHERE id = $1',
      [req.session.user.id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({
        error: 'User account not found',
        code: 'USER_NOT_FOUND',
      });
      return;
    }

    res.status(200).json({
      user: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
}
