import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ReviewQueuePage } from "../features/review/ReviewQueuePage";
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

test("review queue fetches pending transactions and saves review updates", async () => {
  mockedApi.get.mockImplementation((url) => {
    if (url === "/transactions") {
      return Promise.resolve({
        data: [
          {
            id: 102,
            transaction_date: "2026-04-18",
            amount: "42.80",
            description: "Coffee",
            merchant: "Blue Tokai",
            month_key: "2026-04",
            expense_category: "personal",
            spend_category_id: null,
            source_type: "credit_card_pdf",
            review_status: "needs_review",
            duplicate_suspected: true,
            duplicate_reason: "Matches transaction #51",
            notes: null,
          },
        ],
      });
    }

    if (url === "/spend-categories") {
      return Promise.resolve({
        data: [{ id: 8, name: "Client delivery", is_active: true }],
      });
    }

    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });

  mockedApi.patch.mockResolvedValue({
    data: {
      id: 102,
      transaction_date: "2026-04-18",
      amount: "42.80",
      description: "Coffee",
      merchant: "Blue Tokai",
      month_key: "2026-04",
      expense_category: "personal",
      spend_category_id: 8,
      source_type: "credit_card_pdf",
      review_status: "reviewed",
      duplicate_suspected: true,
      duplicate_reason: "Matches transaction #51",
      notes: null,
    },
  });

  renderWithProviders(<ReviewQueuePage />);
  const user = userEvent.setup();

  const table = await screen.findByRole("table", {
    name: /expenses pending review/i,
  });
  expect(
    within(table).getByRole("columnheader", { name: /expense category/i }),
  ).toBeInTheDocument();
  expect(
    within(table).getByRole("columnheader", { name: /spend category/i }),
  ).toBeInTheDocument();
  expect(
    within(table).getByRole("columnheader", { name: /warning/i }),
  ).toBeInTheDocument();
  expect(await within(table).findByText("Personal")).toBeInTheDocument();
  expect(within(table).getByText("Matches transaction #51")).toBeInTheDocument();

  await user.clear(screen.getByLabelText("Merchant 102"));
  await user.type(screen.getByLabelText("Merchant 102"), "Blue Tokai Cafe");
  await user.selectOptions(screen.getByLabelText("Expense category 102"), "common");
  await user.selectOptions(screen.getByLabelText("Spend category 102"), "8");
  await user.selectOptions(screen.getByLabelText("Status 102"), "reviewed");
  await user.click(await screen.findByRole("button", { name: /save 102/i }));

  expect(mockedApi.patch).toHaveBeenCalledWith("/transactions/102", {
    merchant: "Blue Tokai Cafe",
    expense_category: "common",
    spend_category_id: 8,
    review_status: "reviewed",
  });
  expect(await screen.findByText(/saved review changes/i)).toBeInTheDocument();
});
