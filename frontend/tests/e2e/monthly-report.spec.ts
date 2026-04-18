import { expect, test } from "@playwright/test";

test("user can sign in and land on the monthly report", async ({ page }) => {
  const username =
    process.env.EXPENSE_TRACKER_BOOTSTRAP_USERNAME ?? "owner";
  const password =
    process.env.EXPENSE_TRACKER_BOOTSTRAP_PASSWORD ?? "secret123";

  await page.goto("/login");

  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/reports$/);
  await expect(page.getByRole("heading", { name: /monthly report/i })).toBeVisible();
  await expect(page.getByText(/month total/i)).toBeVisible();
});
