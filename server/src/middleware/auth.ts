import { Request, Response, NextFunction } from 'express';

export type UserRole = 'customer' | 'cashier' | 'manager';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

declare module 'express-session' {
  interface SessionData {
    user?: SessionUser;
  }
}

/**
 * Middleware: Requires the user to be logged in with a valid session.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session || !req.session.user) {
    res.status(401).json({
      error: 'Authentication required. Please sign in to continue.',
      code: 'UNAUTHORIZED',
    });
    return;
  }
  next();
}

/**
 * Middleware: Enforces that the authenticated user possesses one of the specified roles.
 * Never trusts a role claim supplied by the client.
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.session || !req.session.user) {
      res.status(401).json({
        error: 'Authentication required. Please sign in to continue.',
        code: 'UNAUTHORIZED',
      });
      return;
    }

    const userRole = req.session.user.role;
    if (!allowedRoles.includes(userRole)) {
      res.status(403).json({
        error: `Access denied. Requires one of [${allowedRoles.join(', ')}] role.`,
        code: 'FORBIDDEN',
      });
      return;
    }

    next();
  };
}

/**
 * Middleware: Optional authentication. If a session exists, attaches it; otherwise proceeds.
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  // Session is available if present
  next();
}
