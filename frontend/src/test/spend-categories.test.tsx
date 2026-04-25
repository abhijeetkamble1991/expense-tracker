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
    delete: jest.fn(),
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;

beforeEach(() => {
  mockedApi.get.mockReset();
  mockedApi.post.mockReset();
  mockedApi.patch.mockReset();
  mockedApi.delete.mockReset();
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

test("spend categories page deletes an unused category", async () => {
  mockedApi.get.mockResolvedValue({
    data: [{ id: 7, name: "Platform ops", is_active: true }],
  });
  mockedApi.delete.mockResolvedValue({
    data: { deleted_id: 7, moved_to_review_count: 0 },
  });

  renderWithProviders(<SpendCategoriesPage />);
  const user = userEvent.setup();

  expect(await screen.findByText("Platform ops")).toBeInTheDocument();

  await user.click(
    screen.getByRole("button", { name: /more actions for platform ops/i }),
  );
  await user.click(screen.getByRole("button", { name: /delete platform ops/i }));

  expect(mockedApi.delete).toHaveBeenCalledWith("/spend-categories/7");
  expect(screen.queryByText("Platform ops")).not.toBeInTheDocument();
});

test("spend categories page renames a category from the actions menu", async () => {
  mockedApi.get.mockResolvedValue({
    data: [{ id: 7, name: "Platform ops", is_active: true }],
  });
  mockedApi.patch.mockResolvedValue({
    data: { id: 7, name: "Platform Operations", is_active: true },
  });

  renderWithProviders(<SpendCategoriesPage />);
  const user = userEvent.setup();

  expect(await screen.findByText("Platform ops")).toBeInTheDocument();

  await user.click(
    screen.getByRole("button", { name: /more actions for platform ops/i }),
  );
  await user.click(screen.getByRole("button", { name: /rename platform ops/i }));
  await user.clear(screen.getByLabelText("Rename category"));
  await user.type(screen.getByLabelText("Rename category"), "Platform Operations");
  await user.click(
    screen.getByRole("button", { name: /save category name for platform ops/i }),
  );

  expect(mockedApi.patch).toHaveBeenCalledWith("/spend-categories/7", {
    name: "Platform Operations",
  });
  expect(await screen.findByText("Platform Operations")).toBeInTheDocument();
});

test("spend categories page asks for confirmation before deleting a used category", async () => {
  mockedApi.get.mockResolvedValue({
    data: [{ id: 7, name: "Platform ops", is_active: true }],
  });
  mockedApi.delete
    .mockRejectedValueOnce({
      response: {
        status: 409,
        data: {
          detail: "Deleting this category will move 3 transactions to review",
          linked_transactions: 3,
        },
      },
    })
    .mockResolvedValueOnce({
      data: { deleted_id: 7, moved_to_review_count: 3 },
    });

  renderWithProviders(<SpendCategoriesPage />);
  const user = userEvent.setup();

  expect(await screen.findByText("Platform ops")).toBeInTheDocument();

  await user.click(
    screen.getByRole("button", { name: /more actions for platform ops/i }),
  );
  await user.click(screen.getByRole("button", { name: /delete platform ops/i }));

  expect(
    await screen.findByText((content) =>
      content.includes("Deleting this category will move 3 transactions to review"),
    ),
  ).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: /confirm delete platform ops/i }));

  expect(mockedApi.delete).toHaveBeenNthCalledWith(2, "/spend-categories/7?confirm=true");
  expect(screen.queryByText("Platform ops")).not.toBeInTheDocument();
});
