import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";

import { routerConfig } from "../app/router";

test("unauthenticated users land on the login screen", async () => {
  const router = createMemoryRouter(routerConfig, {
    initialEntries: ["/reports"],
  });

  render(<RouterProvider router={router} />);

  expect(
    await screen.findByRole("heading", { name: /sign in/i }),
  ).toBeInTheDocument();
});
