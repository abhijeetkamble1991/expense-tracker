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

test("report shell keeps future destinations as placeholders until routes exist", async () => {
  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, "test-token");

  const router = createMemoryRouter(routerConfig, {
    initialEntries: ["/reports"],
  });

  render(<RouterProvider router={router} />);

  expect(await screen.findByRole("link", { name: "Reports" })).toHaveAttribute(
    "href",
    "/reports",
  );
  expect(screen.queryByRole("link", { name: "Upload" })).not.toBeInTheDocument();
  expect(screen.getByText("Upload")).toBeInTheDocument();
  expect(screen.getByText("Review Queue")).toBeInTheDocument();

  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
});
