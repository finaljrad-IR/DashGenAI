import UserService from '../../services/userService';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { ALL_ROLES } from 'shared';

interface AuthRequest extends Request {
  user?: Record<string, unknown>;
}

const requireUser = (allowedRoles: string[] = ALL_ROLES) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    // Try to get token from Authorization header first, then from query parameter
    // Query parameter is needed for EventSource connections which can't send custom headers
    let token = req.headers.authorization?.split(' ')[1];

    if (!token && req.query.token) {
      token = req.query.token as string;
      console.log('[Auth] Using token from query parameter for SSE connection');
    }

    if (!token) {
      console.error('[Auth] No token provided in header or query parameter');
      return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as jwt.JwtPayload;
      const user = await UserService.get(decoded.sub);
      if (!user) {
        console.error('[Auth] User not found for token');
        return res.status(401).json({ error: 'User not found' });
      }

      // If roles are specified, check if user has one of the allowed roles
      if (allowedRoles && allowedRoles.length > 0) {
        if (!allowedRoles.includes(user.role)) {
          console.error(`[Auth] User role ${user.role} not in allowed roles:`, allowedRoles);
          return res.status(403).json({ error: 'Insufficient permissions' });
        }
      }

      req.user = user;
      next();
    } catch (error) {
      console.error('[Auth] Token verification failed:', error instanceof Error ? error.message : 'Unknown error');
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
  };
};

export {
  requireUser,
};
