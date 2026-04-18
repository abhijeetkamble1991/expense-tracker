import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SpendCategoriesPage } from "../features/spend-categories/SpendCategoriesPage";
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
  mockedApi.post.mockReset();
});

test("spend categories page lists and creates categories", async () => {
  mockedApi.get.mockResolvedValue({
    data: [{ id: 7, name: "Platform ops", is_active: true }],
  });
  mockedApi.post.mockResolvedValue({
    data: { id: 8, name: "Client delivery", is_active: true },
  });

  renderWithProviders(<SpendCategoriesPage />);
  const user = userEvent.setup();

  expect(await screen.findByText("Platform ops")).toBeInTheDocument();

  await user.type(screen.getByLabelText("New category"), "Client delivery");
  await user.click(screen.getByRole("button", { name: /add category/i }));

  expect(mockedApi.post).toHaveBeenCalledWith("/spend-categories", {
    name: "Client delivery",
  });
  expect(await screen.findByText("Client delivery")).toBeInTheDocument();
});
