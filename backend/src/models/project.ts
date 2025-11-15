import { query } from "../config/database";

export interface Project {
  id: string;
  name: string;
  code: string;
  description: string | null;
  phase: string;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
}

export async function getProjectsForUser(userId: string, role: string): Promise<Project[]> {
  if (role === "ADMIN") {
    const result = await query<Project>(
      "SELECT * FROM projects WHERE deleted_at IS NULL AND is_active = TRUE ORDER BY name"
    );
    return result.rows;
  }

  const result = await query<Project>(
    `SELECT p.*
     FROM projects p
     JOIN user_projects up ON up.project_id = p.id
     WHERE up.user_id = $1
       AND p.deleted_at IS NULL
       AND p.is_active = TRUE
     ORDER BY p.name`,
    [userId]
  );
  return result.rows;
}

export async function createProject(data: {
  name: string;
  code: string;
  description?: string;
  phase: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  total_budget?: number;
}): Promise<Project> {
  const result = await query<Project>(
    `INSERT INTO projects
       (name, code, description, phase, location, start_date, end_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [
      data.name,
      data.code,
      data.description || null,
      data.phase,
      data.location || null,
      data.start_date || null,
      data.end_date || null
    ]
  );
  return result.rows[0];
}

export async function getProjectById(id: string): Promise<Project | null> {
  const result = await query<Project>(
    "SELECT * FROM projects WHERE id = $1 AND deleted_at IS NULL",
    [id]
  );
  return result.rows[0] || null;
}