import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const connectionString =
  process.env.DATABASE_URL ||
  `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}` +
    `@${process.env.DB_HOST || "localhost"}:${process.env.DB_PORT || "5432"}/${
      process.env.DB_NAME
    }`;

export const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30000
});

pool.on("error", (err) => {
  console.error("Unexpected PG pool error", err);
});

export async function query<T = any>(text: string, params?: any[]): Promise<{ rows: T[] }> {
  return pool.query<T>(text, params);
}