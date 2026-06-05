import { Hono } from "hono";
import { pool } from "../db/schema";

const analyticsRoutes = new Hono();

// GET /analytics/confidence
analyticsRoutes.get("/analytics/confidence", async (c) => {
  const workspaceId = c.req.query("workspaceId");
  if (!workspaceId) return c.json({ error: "workspaceId required" }, 400);

  const res = await pool.query(
    `SELECT DATE(created_at) AS day, AVG(confidence_score) AS avg_confidence
     FROM gap_logs WHERE workspace_id = $1
     GROUP BY day ORDER BY day DESC LIMIT 30`,
    [workspaceId],
  );

  return c.json({ trends: res.rows });
});

// GET /analytics/audits
analyticsRoutes.get("/analytics/audits", async (c) => {
  const workspaceId = c.req.query("workspaceId");
  if (!workspaceId) return c.json({ error: "workspaceId required" }, 400);

  const res = await pool.query(
    `SELECT verdict, COUNT(*) AS count
     FROM audit_logs WHERE workspace_id = $1
     GROUP BY verdict`,
    [workspaceId],
  );

  return c.json({ breakdown: res.rows });
});

// GET /analytics/stats
analyticsRoutes.get("/analytics/stats", async (c) => {
  const workspaceId = c.req.query("workspaceId");
  if (!workspaceId) return c.json({ error: "workspaceId required" }, 400);

  const [docCount, gapCount, auditCount] = await Promise.all([
    pool.query(`SELECT COUNT(*) FROM documents WHERE workspace_id = $1`, [workspaceId]),
    pool.query(`SELECT COUNT(*) FROM gap_logs WHERE workspace_id = $1`, [workspaceId]),
    pool.query(`SELECT COUNT(*) FROM audit_logs WHERE workspace_id = $1`, [workspaceId]),
  ]);

  return c.json({
    documents: parseInt(docCount.rows[0]!.count),
    unresolvedGaps: parseInt(gapCount.rows[0]!.count),
    totalQueries: parseInt(auditCount.rows[0]!.count),
  });
});

export { analyticsRoutes };
