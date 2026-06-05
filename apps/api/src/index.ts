import "dotenv/config";
import { serve } from "@hono/node-server";
import { migrate } from "./db/schema";
import { app } from "./app";
import { config } from "./lib/config";

async function main() {
  await migrate();
  serve({ fetch: app.fetch, port: config.port });
  console.log(`Server running on port ${config.port}`);
}

main().catch(console.error);
