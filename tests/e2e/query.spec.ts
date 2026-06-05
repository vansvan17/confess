import { test, expect } from "@playwright/test";

test("shows home page", async ({ page }) => {
  await page.goto("http://localhost:3000");
  await expect(page.getByText("Confess")).toBeVisible();
});

test("upload page loads", async ({ page }) => {
  await page.goto("http://localhost:3000/upload");
  await expect(page.getByText("Upload Documents")).toBeVisible();
});

test("query page loads", async ({ page }) => {
  await page.goto("http://localhost:3000/query");
  await expect(page.getByText("Ask a Question")).toBeVisible();
});

test("dashboard page loads", async ({ page }) => {
  await page.goto("http://localhost:3000/dashboard");
  await expect(page.getByText("Dashboard")).toBeVisible();
});
