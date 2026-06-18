import { expect, test } from "@playwright/test";

test("plays scenarios and renders the MCP App in chat context", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("Show me a learning card for River Red-gum.")).toBeVisible();
  const app = page.frameLocator('iframe[title="Show me River Red-gum interactive card"]')
    .frameLocator('iframe[title="MCP App view"]');
  await expect(app.getByText("River Red-gum", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "Dark" }).click();
  await expect(page.locator(".harness-shell")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Narrow" }).click();
  await expect(page.locator(".conversation")).toHaveClass(/narrow/);

  await page.locator("#scenario").selectOption("golden-wattle");
  await expect(page.getByText("Teach me about Golden Wattle and how to recognise it.")).toBeVisible();
  const goldenApp = page.frameLocator('iframe[title="Teach me about Golden Wattle interactive card"]')
    .frameLocator('iframe[title="MCP App view"]');
  await expect(goldenApp.getByText("Golden Wattle", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "Remount card" }).click();
  await expect(goldenApp.getByText("Golden Wattle", { exact: true }).first()).toBeVisible();
});

test("shows live MCP connection failures in context", async ({ page }) => {
  await page.route("http://localhost:3000/**", (route) => route.abort("connectionfailed"));
  await page.goto("/");
  await page.getByLabel("Live MCP").check();
  await expect(page.getByText("Couldn’t render the app")).toBeVisible();
  await expect(page.locator(".error-state")).toContainText(/fetch|connect|failed/i);
});
