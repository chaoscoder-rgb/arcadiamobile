import { Response } from "express";

interface Pagination {
  page: number;
  pageSize: number;
  total?: number;
}

export function ok(res: Response, data: any, message = "OK", pagination?: Pagination) {
  return res.json({
    success: true,
    data,
    message,
    pagination
  });
}

export function fail(res: Response, message = "Error", status = 400, data?: any) {
  return res.status(status).json({
    success: false,
    data,
    message
  });
}