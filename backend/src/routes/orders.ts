import { Router } from "express";
import { body, validationResult } from "express-validator";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { ok, fail } from "../utils/response";
import {
  createOrderWithItems,
  listOrdersForProject,
  getOrderById
} from "../models/order";
import { getProjectById } from "../models/project";
import { getSuggestedMaterials } from "../models/material";
import { query } from "../config/database";

const router = Router();

// Helper: ensure user has access to project
async function ensureUserProjectAccess(userId: string, role: string, projectId: string): Promise<boolean> {
  if (role === "ADMIN") return true;
  const res = await query(
    "SELECT 1 FROM user_projects WHERE user_id = $1 AND project_id = $2",
    [userId, projectId]
  );
  return res.rows.length > 0;
}

// GET /api/orders?projectId=...
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  const user = req.user!;
  const projectId = req.query.projectId as string | undefined;
  if (!projectId) {
    return fail(res, "projectId is required", 400);
  }

  const project = await getProjectById(projectId);
  if (!project) {
    return fail(res, "Project not found", 404);
  }

  const hasAccess = await ensureUserProjectAccess(user.id, user.role, projectId);
  if (!hasAccess) return fail(res, "Forbidden", 403);

  const orders = await listOrdersForProject(projectId, user.id, user.role);
  return ok(res, orders);
});

// POST /api/orders (create with budget validation)
router.post(
  "/",
  requireAuth,
  [
    body("projectId").isString().notEmpty(),
    body("requiredDate").optional().isString(),
    body("notes").optional().isString(),
    body("currency").optional().isString(),
    body("items").isArray({ min: 1 }),
    body("items.*.material_id").isString().notEmpty(),
    body("items.*.quantity").isNumeric().custom((v) => v > 0),
    body("items.*.unit_price").optional().isNumeric()
  ],
  async (req: AuthRequest, res) => {
    const user = req.user!;
    if (user.role !== "SITE_ENGINEER" && user.role !== "ADMIN") {
      return fail(res, "Only Site Engineers or Admin can create orders", 403);
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return fail(res, "Validation error", 400, errors.array());
    }

    const { projectId } = req.body;

    const project = await getProjectById(projectId);
    if (!project) {
      return fail(res, "Project not found", 404);
    }

    const hasAccess = await ensureUserProjectAccess(user.id, user.role, projectId);
    if (!hasAccess) return fail(res, "Forbidden", 403);

    try {
      const result = await createOrderWithItems({
        projectId,
        createdById: user.id,
        requiredDate: req.body.requiredDate,
        notes: req.body.notes,
        currency: req.body.currency,
        items: req.body.items
      });

      const { order, budgetInfo } = result;

      let message = "Order created";
      if (budgetInfo.overBudget) {
        message = "Order created and flagged for approval (budget exceeded)";
      } else if (budgetInfo.overThreshold) {
        message = "Order created (warning: approaching budget limit)";
      }

      return ok(res, { order, budgetInfo }, message);
    } catch (e) {
      console.error(e);
      return fail(res, "Failed to create order", 500);
    }
  }
);

// GET /api/orders/:id
router.get("/:id", requireAuth, async (req: AuthRequest, res) => {
  const user = req.user!;
  const order = await getOrderById(req.params.id);
  if (!order) return fail(res, "Order not found", 404);

  const hasAccess = await ensureUserProjectAccess(user.id, user.role, order.project_id);
  if (!hasAccess) return fail(res, "Forbidden", 403);

  return ok(res, order);
});

// GET /api/orders/suggestions?projectId=...  (phase-based materials)
router.get("/suggestions/by-phase", requireAuth, async (req: AuthRequest, res) => {
  const user = req.user!;
  const projectId = req.query.projectId as string | undefined;

  if (!projectId) return fail(res, "projectId is required", 400);

  const project = await getProjectById(projectId);
  if (!project) return fail(res, "Project not found", 404);

  const hasAccess = await ensureUserProjectAccess(user.id, user.role, projectId);
  if (!hasAccess) return fail(res, "Forbidden", 403);

  const phase = project.phase;
  const materials = await getSuggestedMaterials(phase);
  return ok(res, { phase, materials });
});

export default router;