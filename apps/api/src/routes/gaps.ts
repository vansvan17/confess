import { Hono } from "hono";
import { getUnresolvedGaps, resolveGap, groupSimilarGaps } from "../services/gaps";

const gapRoutes = new Hono();

// GET /gaps
gapRoutes.get("/gaps", async (c) => {
  const workspaceId = c.req.query("workspaceId");
  if (!workspaceId) return c.json({ error: "workspaceId required" }, 400);
  const gaps = await getUnresolvedGaps(workspaceId);
  return c.json({ gaps });
});

// GET /gaps/clusters
gapRoutes.get("/gaps/clusters", async (c) => {
  const workspaceId = c.req.query("workspaceId");
  if (!workspaceId) return c.json({ error: "workspaceId required" }, 400);
  const clusters = await groupSimilarGaps(workspaceId);
  return c.json({ clusters });
});

// PATCH /gaps/:id/resolve
gapRoutes.patch("/gaps/:id/resolve", async (c) => {
  const id = c.req.param("id");
  await resolveGap(id);
  return c.json({ resolved: true });
});

export { gapRoutes };
