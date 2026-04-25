import { expect, test } from "@playwright/test";

test("user can sign in and land on the monthly report", async ({
  page,
  request,
}) => {
  const username =
    process.env.EXPENSE_TRACKER_BOOTSTRAP_USERNAME ?? "owner";
  const password =
    process.env.EXPENSE_TRACKER_BOOTSTRAP_PASSWORD ?? "secret123";
  const backendUrl = "http://127.0.0.1:8000";
  const categoryName = `Smoke Category ${Date.now()}`;

  const authResponse = await request.post(`${backendUrl}/auth/login`, {
    data: { username, password },
  });
  expect(authResponse.ok()).toBeTruthy();
  const { access_token: accessToken } = await authResponse.json();

  const categoryResponse = await request.post(
    `${backendUrl}/spend-categories`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { name: categoryName },
    },
  );
  expect(categoryResponse.ok()).toBeTruthy();
  const { id: spendCategoryId } = await categoryResponse.json();

  const transactionResponse = await request.post(
    `${backendUrl}/transactions/manual`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {
        transaction_date: "2026-04-14",
        amount: "320.00",
        description: "Smoke test transaction",
        merchant: "Smoke Merchant",
        month_key: "2026-04",
        expense_category: "common",
        spend_category_id: spendCategoryId,
      },
    },
  );
  expect(transactionResponse.ok()).toBeTruthy();

  await page.goto("/login");

  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/reports$/);
  await expect(page.getByRole("heading", { name: /monthly report/i })).toBeVisible();
  await expect(page.getByText(/month total/i)).toBeVisible();
});
