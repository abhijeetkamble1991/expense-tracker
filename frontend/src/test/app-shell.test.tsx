import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";

import { routerConfig } from "../app/router";
import {
  api,
  AUTH_TOKEN_STORAGE_KEY,
  SESSION_ACTIVITY_STORAGE_KEY,
  SESSION_TIMEOUT_MS,
} from "../lib/api";
import { renderWithProviders } from "./test-utils";

jest.mock("../lib/api", () => ({
  ...jest.requireActual("../lib/api"),
  api: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;

beforeEach(() => {
  window.localStorage.clear();
  mockedApi.get.mockReset();
  mockedApi.post.mockReset();
  mockedApi.get.mockImplementation((url) => {
    if (url === "/months") {
      return Promise.resolve({ data: ["2026-04"] });
    }

    if (url === "/settings") {
      return Promise.resolve({ data: { currency_code: "USD" } });
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
  window.localStorage.setItem(
    SESSION_ACTIVITY_STORAGE_KEY,
    String(Date.now()),
  );

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
  expect(
    screen.queryByRole("link", { name: "Add Expense" }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute(
    "href",
    "/settings",
  );
  expect(screen.getByRole("button", { name: /logout/i })).toHaveClass(
    "button-secondary",
    "app-shell__logout",
  );
});

test("expired sessions redirect direct links back to login", async () => {
  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, "expired-token");
  window.localStorage.setItem(
    SESSION_ACTIVITY_STORAGE_KEY,
    String(Date.now() - SESSION_TIMEOUT_MS - 1_000),
  );

  const router = createMemoryRouter(routerConfig, {
    initialEntries: ["/reports"],
  });

  renderWithProviders(<RouterProvider router={router} />);

  expect(
    await screen.findByRole("heading", { name: /sign in/i }),
  ).toBeInTheDocument();
});

test("logout clears session and returns the user to login", async () => {
  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, "test-token");
  window.localStorage.setItem(
    SESSION_ACTIVITY_STORAGE_KEY,
    String(Date.now()),
  );

  const router = createMemoryRouter(routerConfig, {
    initialEntries: ["/reports"],
  });

  renderWithProviders(<RouterProvider router={router} />);
  const user = userEvent.setup();

  await user.click(await screen.findByRole("button", { name: /logout/i }));

  expect(window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull();
  expect(window.localStorage.getItem(SESSION_ACTIVITY_STORAGE_KEY)).toBeNull();
  expect(
    await screen.findByRole("heading", { name: /sign in/i }),
  ).toBeInTheDocument();
});
