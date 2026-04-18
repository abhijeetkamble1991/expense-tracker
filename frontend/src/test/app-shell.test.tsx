import { screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";

import { routerConfig } from "../app/router";
import { api, AUTH_TOKEN_STORAGE_KEY } from "../lib/api";
import { renderWithProviders } from "./test-utils";

jest.mock("../lib/api", () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  },
  getStoredToken: () =>
    window.localStorage.getItem("expense-tracker.auth-token"),
  AUTH_TOKEN_STORAGE_KEY: "expense-tracker.auth-token",
}));

const mockedApi = api as jest.Mocked<typeof api>;

beforeEach(() => {
  mockedApi.get.mockReset();
  mockedApi.post.mockReset();
  mockedApi.get.mockImplementation((url) => {
    if (url === "/months") {
      return Promise.resolve({ data: ["2026-04"] });
    }

    if (url === "/spend-categories") {
      return Promise.resolve({ data: [] });
    }

    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });
  mockedApi.post.mockResolvedValue({
    data: {
      month_key: "2026-04",
      totals: { overall: "0.00", common: "0.00", personal: "0.00" },
      by_source: {},
      by_merchant: {},
      by_spend_category: {},
      transactions: [],
    },
  });
});

test("unauthenticated users land on the login screen", async () => {
  const router = createMemoryRouter(routerConfig, {
    initialEntries: ["/reports"],
  });

  renderWithProviders(<RouterProvider router={router} />);

  expect(
    await screen.findByRole("heading", { name: /sign in/i }),
  ).toBeInTheDocument();
});

test("report shell exposes implemented workflow routes", async () => {
  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, "test-token");

  const router = createMemoryRouter(routerConfig, {
    initialEntries: ["/reports"],
  });

  renderWithProviders(<RouterProvider router={router} />);

  expect(await screen.findByRole("link", { name: "Reports" })).toHaveAttribute(
    "href",
    "/reports",
  );
  expect(screen.getByRole("link", { name: "Upload" })).toHaveAttribute(
    "href",
    "/imports/upload",
  );
  expect(screen.getByRole("link", { name: "Review Queue" })).toHaveAttribute(
    "href",
    "/review-queue",
  );
  expect(screen.getByRole("link", { name: "Transactions" })).toHaveAttribute(
    "href",
    "/transactions",
  );

  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
});
