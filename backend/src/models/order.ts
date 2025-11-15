import { query } from "../config/database";

export type OrderStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "ORDERED"
  | "PARTIALLY_RECEIVED"
  | "COMPLETED"
  | "CANCELLED";

export interface Order {
  id: string;
  project_id: string;
  created_by_id: string;
  requested_by_id: string | null;
  order_number: string;
  status: OrderStatus;
  required_date: string | null;
  total_estimated: string; // numeric
  total_received: string;  // numeric
  currency: string;
  notes: string | null;
}

export interface OrderItemInput {
  material_id: string;
  quantity: number;
  unit_price?: number;
  attributes?: any;
}

export async function listOrdersForProject(
  projectId: string,
  userId: string,
  role: string
): Promise<Order[]> {
  // For now: Admin -> all; others -> must be assigned to project (enforced at route level)
  const result = await query<Order>(
    `SELECT * FROM orders
     WHERE project_id = $1 AND deleted_at IS NULL
     ORDER BY created_at DESC`,
    [projectId]
  );
  return result.rows;
}

export async function getOrderById(id: string): Promise<Order | null> {
  const result = await query<Order>(
    "SELECT * FROM orders WHERE id = $1 AND deleted_at IS NULL",
    [id]
  );
  return result.rows[0] || null;
}

async function generateOrderNumber(projectId: string): Promise<string> {
  const res = await query<{ count: string }>(
    "SELECT COUNT(*)::int AS count FROM orders WHERE project_id = $1",
    [projectId]
  );
  const count = Number(res.rows[0]?.count || 0) + 1;
  return `PO-${count.toString().padStart(4, "0")}`;
}

export async function createOrderWithItems(args: {
  projectId: string;
  createdById: string;
  requiredDate?: string;
  notes?: string;
  currency?: string;
  items: OrderItemInput[];
}): Promise<{ order: Order; budgetInfo: { percentAfter: number; overThreshold: boolean; overBudget: boolean } }> {
  // Calculate estimated total
  const totalEstimated = args.items.reduce((sum, item) => {
    const price = item.unit_price ?? 0;
    return sum + price * item.quantity;
  }, 0);

  // Budget check
  const budgetRes = await query<{
    total_budget: string;
    committed_amount: string;
    spent_amount: string;
  }>(
    "SELECT total_budget, committed_amount, spent_amount FROM project_budgets WHERE project_id = $1",
    [args.projectId]
  );

  let percentAfter = 0;
  let overThreshold = false;
  let overBudget = false;

  if (budgetRes.rows[0]) {
    const b = budgetRes.rows[0];
    const totalBudget = Number(b.total_budget);
    const committed = Number(b.committed_amount);
    const newCommitted = committed + totalEstimated;
    percentAfter = totalBudget > 0 ? (newCommitted / totalBudget) * 100 : 0;
    overThreshold = percentAfter >= 80 && percentAfter < 100;
    overBudget = percentAfter >= 100;
  }

  const client = await query("BEGIN").then(() => null).catch(() => null); // to keep Pool type happy

  // We need a manual transaction:
  const { pool } = await import("../config/database");
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const orderNumber = await generateOrderNumber(args.projectId);

    const orderStatus: OrderStatus = overBudget ? "PENDING_APPROVAL" : "DRAFT";

    const orderRes = await c.query<Order>(
      `INSERT INTO orders
         (project_id, created_by_id, requested_by_id, order_number, status,
          required_date, total_estimated, total_received, currency, notes)
       VALUES ($1,$2,NULL,$3,$4,$5,$6,0,$7,$8)
       RETURNING *`,
      [
        args.projectId,
        args.createdById,
        orderNumber,
        orderStatus,
        args.requiredDate || null,
        totalEstimated,
        args.currency || "USD",
        args.notes || null
      ]
    );
    const order = orderRes.rows[0];

    for (const item of args.items) {
      const lineTotal = (item.unit_price ?? 0) * item.quantity;
      await c.query(
        `INSERT INTO order_items
           (order_id, material_id, quantity, unit_price, currency, attributes, line_total)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          order.id,
          item.material_id,
          item.quantity,
          item.unit_price ?? null,
          args.currency || "USD",
          item.attributes ? JSON.stringify(item.attributes) : null,
          lineTotal
        ]
      );
    }

    // Update committed budget
    if (budgetRes.rows[0]) {
      await c.query(
        `UPDATE project_budgets
         SET committed_amount = committed_amount + $1,
             updated_at = NOW()
         WHERE project_id = $2`,
        [totalEstimated, args.projectId]
      );
    }

    await c.query("COMMIT");

    return {
      order,
      budgetInfo: { percentAfter, overThreshold, overBudget }
    };
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}