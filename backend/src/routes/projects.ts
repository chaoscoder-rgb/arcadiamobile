import { Router } from "express";
import { body, validationResult } from "express-validator";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth";
import { getProjectsForUser, createProject, getProjectById } from "../models/project";
import { ok, fail } from "../utils/response";

const router = Router();

// GET /api/projects  (role-filtered)
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  const user = req.user!;
  const projects = await getProjectsForUser(user.id, user.role);
  return ok(res, projects);
});

// POST /api/projects  (Admin only)
router.post(
  "/",
  requireAuth,
  requireRole(["ADMIN"]),
  [
    body("name").isString().notEmpty(),
    body("code").isString().notEmpty(),
    body("phase").isString().notEmpty()
  ],
  async (req: AuthRequest, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return fail(res, "Validation error", 400, errors.array());
    }

    const project = await createProject(req.body);
    return ok(res, project, "Project created");
  }
);

// GET /api/projects/:id
router.get("/:id", requireAuth, async (req: AuthRequest, res) => {
  const user = req.user!;
  const project = await getProjectById(req.params.id);
  if (!project) {
    return fail(res, "Project not found", 404);
  }

  if (user.role !== "ADMIN") {
    // Ensure user is assigned to this project
    const result = await import("../config/database").then(({ query }) =>
      query(
        "SELECT 1 FROM user_projects WHERE user_id = $1 AND project_id = $2",
        [user.id, project.id]
      )
    );
    if (result.rows.length === 0) {
      return fail(res, "Forbidden", 403);
    }
  }

  return ok(res, project);
});

export default router;