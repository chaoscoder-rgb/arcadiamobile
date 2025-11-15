import { Request, Response, NextFunction } from "express";
import { pool } from "../config/database";
import { AuthRequest } from "./auth";

export async function setAuditUser(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) {
  const userId = req.user?.id;
  if (!userId) return next();

  // Set per-connection parameter
  // We’ll use SET LOCAL in queries later for safety
  (req as any).auditUserId = userId;
  next();
}

// Helper to wrap queries with SET LOCAL
export async function withAudit<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL app.current_user_id = $1", [userId]);
    const result = await fn();
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}