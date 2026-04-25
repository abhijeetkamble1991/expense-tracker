import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SettingsPage } from "../features/settings/SettingsPage";
import { api } from "../lib/api";
import { renderWithProviders } from "./test-utils";

jest.mock("../lib/api", () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;

beforeEach(() => {
  mockedApi.get.mockReset();
  mockedApi.patch.mockReset();
});

test("settings page loads and updates the global currency", async () => {
  mockedApi.get.mockResolvedValue({
    data: {
      username: "owner",
      display_name: "Owner",
      created_at: "2026-04-19T10:00:00Z",
      currency_code: "USD",
    },
  });
  mockedApi.patch.mockImplementation((url) => {
    if (url === "/settings") {
      return Promise.resolve({
        data: {
          username: "owner",
          display_name: "Akshay",
          created_at: "2026-04-19T10:00:00Z",
          currency_code: "INR",
        },
      });
    }

    if (url === "/settings/password") {
      return Promise.resolve({
        data: { detail: "Password updated" },
      });
    }

    return Promise.reject(new Error(`Unexpected PATCH ${url}`));
  });

  renderWithProviders(<SettingsPage />);
  const user = userEvent.setup();

  expect(await screen.findByDisplayValue("Owner")).toBeInTheDocument();
  expect(screen.getByDisplayValue("owner")).toBeDisabled();
  expect(await screen.findByLabelText("Currency")).toHaveValue("USD");
  expect(
    screen.getByRole("option", { name: /US Dollar.*USD/i }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("option", { name: /Japanese Yen.*JPY/i }),
  ).toBeInTheDocument();

  await user.clear(screen.getByLabelText("Display name"));
  await user.type(screen.getByLabelText("Display name"), "Akshay");
  await user.selectOptions(screen.getByLabelText("Currency"), "INR");
  await user.click(screen.getByRole("button", { name: /save profile and preferences/i }));

  await waitFor(() =>
    expect(mockedApi.patch).toHaveBeenCalledWith("/settings", {
      display_name: "Akshay",
      currency_code: "INR",
    }),
  );
  expect(await screen.findByText(/settings updated/i)).toBeInTheDocument();

  await user.type(screen.getByLabelText("Current password"), "secret123");
  await user.type(screen.getByLabelText("New password"), "newsecret123");
  await user.click(screen.getByRole("button", { name: /change password/i }));

  await waitFor(() =>
    expect(mockedApi.patch).toHaveBeenCalledWith("/settings/password", {
      current_password: "secret123",
      new_password: "newsecret123",
    }),
  );
  expect(await screen.findByText(/password updated/i)).toBeInTheDocument();
});
