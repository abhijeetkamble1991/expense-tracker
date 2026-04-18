import { expect, test } from "@playwright/test";

test("user can sign in and land on the monthly report", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

  await page.getByLabel("Username").fill("owner");
  await page.getByLabel("Password").fill("secret123");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/reports$/);
  await expect(
    page.getByRole("heading", { name: /april 2026 summary/i }),
  ).toBeVisible();
  await expect(page.getByText("3 expenses need review")).toBeVisible();
});
