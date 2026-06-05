import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { docRoutes } from "./routes/documents";
import { queryRoutes } from "./routes/query";
import { gapRoutes } from "./routes/gaps";
import { analyticsRoutes } from "./routes/analytics";
import { exposeMetrics } from "./lib/metrics";

export const app = new Hono();

app.use("*", cors());
app.use("*", logger());

app.get("/health", (c) => c.json({ status: "ok" }));

app.get("/metrics", async (c) => {
  const metrics = await exposeMetrics();
  return c.text(metrics);
});

app.route("/", docRoutes);
app.route("/", queryRoutes);
app.route("/", gapRoutes);
app.route("/", analyticsRoutes);
