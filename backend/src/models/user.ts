import { query } from "../config/database";

export interface User {
  id: string;
  username: string;
  password_hash: string;
  full_name: string;
  role: string;
  is_active: boolean;
}

export async function findUserByUsername(username: string): Promise<User | null> {
  const result = await query<User>(
    "SELECT * FROM users WHERE username = $1 AND deleted_at IS NULL",
    [username]
  );
  return result.rows[0] || null;
}

export async function findUserById(id: string): Promise<User | null> {
  const result = await query<User>(
    "SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL",
    [id]
  );
  return result.rows[0] || null;
}