import { Request, Response, NextFunction } from "express";
import { fail } from "../utils/response";

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error("Unhandled error:", err);
  return fail(res, "Internal server error", 500);
}