import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  timeout: 30000,
  webServer: [
    {
      command: "pnpm --filter @confess/api run dev",
      port: 3001,
      reuseExistingServer: true,
    },
    {
      command: "pnpm --filter @confess/web run dev",
      port: 3000,
      reuseExistingServer: true,
    },
  ],
});
