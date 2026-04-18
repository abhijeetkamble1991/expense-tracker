import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";

import { routerConfig } from "../app/router";
import { AUTH_TOKEN_STORAGE_KEY } from "../lib/api";

test("unauthenticated users land on the login screen", async () => {
  const router = createMemoryRouter(routerConfig, {
    initialEntries: ["/reports"],
  });

  render(<RouterProvider router={router} />);

  expect(
    await screen.findByRole("heading", { name: /sign in/i }),
  ).toBeInTheDocument();
});

test("report shell exposes implemented workflow routes and keeps the rest as placeholders", async () => {
  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, "test-token");

  const router = createMemoryRouter(routerConfig, {
    initialEntries: ["/reports"],
  });

  render(<RouterProvider router={router} />);

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
  expect(screen.getByText("Transactions")).toBeInTheDocument();

  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
});
