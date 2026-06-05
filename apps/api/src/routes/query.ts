import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { queryKnowledgeBase } from "../services/retrieval";
import { auditAnswer } from "../services/critic";
import { logGap } from "../services/gaps";
import { pool } from "../db/schema";
import { logger } from "../lib/logger";

const queryRoutes = new Hono();

// POST /query
queryRoutes.post(
  "/query",
  zValidator(
    "json",
    z.object({
      workspaceId: z.string().uuid(),
      userId: z.string(),
      question: z.string().min(1).max(2000),
    }),
  ),
  async (c) => {
    const { workspaceId, userId, question } = c.req.valid("json");

    const result = await queryKnowledgeBase(workspaceId, userId, question);

    if (result.answered && result.answer) {
      // Run critic agent
      const sourceContents = result.sources.map((s) => s.content);
      const critic = await auditAnswer(question, result.answer, sourceContents);

      result.criticVerdict = critic.verdict;
      if (critic.verdict === "fail" && critic.revisedAnswer) {
        result.answer = critic.revisedAnswer;
      }

      // Log audit
      await pool.query(
        `INSERT INTO audit_logs (workspace_id, question, answer, verdict, unsupported_claims, confidence_adj)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
        [
          workspaceId,
          question,
          result.answer,
          critic.verdict,
          JSON.stringify(critic.unsupportedClaims),
          critic.confidenceAdjustment,
        ],
      );

      logger.info(
        { workspaceId, confidence: result.confidence, verdict: critic.verdict },
        "Query answered",
      );
    }

    if (result.gapLogged && result.reason) {
      await logGap(
        workspaceId,
        question,
        result.confidence,
        result.reason,
        result.suggestion ?? "No suggestion available",
      );
      logger.info({ workspaceId, confidence: result.confidence }, "Gap logged");
    }

    return c.json(result);
  },
);

// GET /query/history
queryRoutes.get("/query/history", async (c) => {
  const workspaceId = c.req.query("workspaceId");
  if (!workspaceId) return c.json({ error: "workspaceId required" }, 400);

  const res = await pool.query(
    `SELECT id, question, verdict, created_at
     FROM audit_logs WHERE workspace_id = $1
     ORDER BY created_at DESC
     LIMIT 50`,
    [workspaceId],
  );

  return c.json({ history: res.rows });
});

export { queryRoutes };
