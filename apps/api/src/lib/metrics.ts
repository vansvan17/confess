import client from "prom-client";

const register = new client.Registry();

client.collectDefaultMetrics({ register });

export const queryLatency = new client.Histogram({
  name: "confess_query_latency_seconds",
  help: "Query endpoint latency",
  labelNames: ["status"],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});
register.registerMetric(queryLatency);

export const confidenceScore = new client.Histogram({
  name: "confess_confidence_score",
  help: "Confidence score distribution",
  buckets: [0.2, 0.4, 0.6, 0.8, 1.0],
});
register.registerMetric(confidenceScore);

export const criticVerdicts = new client.Counter({
  name: "confess_critic_verdicts_total",
  help: "Critic agent verdict count",
  labelNames: ["verdict"],
});
register.registerMetric(criticVerdicts);

export function exposeMetrics() {
  return register.metrics();
}
