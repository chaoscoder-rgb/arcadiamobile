import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { fail } from "../utils/response";

export interface AuthRequest extends Request {
  user?: { id: string; role: string };
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return fail(res, "Unauthorized", 401);
  }

  const token = header.substring("Bearer ".length);

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.userId, role: payload.role };

    // Set current user for DB audit trigger
    // Safe even if no DB call is made
    (req as any).currentUserId = payload.userId;

    next();
  } catch {
    return fail(res, "Invalid or expired token", 401);
  }
}

export function requireRole(roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return fail(res, "Forbidden", 403);
    }
    next();
  };
}