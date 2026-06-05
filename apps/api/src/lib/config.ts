export const config = {
  port: parseInt(process.env.PORT ?? "3001"),
  databaseUrl: process.env.DATABASE_URL ?? "postgresql://confess:confess@localhost:5432/confess",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  huggingfaceKey: process.env.HUGGINGFACE_API_KEY ?? "",
  clerkSecretKey: process.env.CLERK_SECRET_KEY ?? "",

  confidence: {
    weightSimilarity: parseFloat(process.env.WEIGHT_SIMILARITY ?? "0.5"),
    weightGap: parseFloat(process.env.WEIGHT_GAP ?? "0.3"),
    weightCoverage: parseFloat(process.env.WEIGHT_COVERAGE ?? "0.2"),
    threshold: parseFloat(process.env.CONFIDENCE_THRESHOLD ?? "0.65"),
  },
};
