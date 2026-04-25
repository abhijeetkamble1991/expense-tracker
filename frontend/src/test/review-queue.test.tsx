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
    delete: jest.fn(),
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;

beforeEach(() => {
  mockedApi.get.mockReset();
  mockedApi.patch.mockReset();
  mockedApi.delete.mockReset();
});

test("review queue fetches pending transactions and saves review updates", async () => {
  mockedApi.get.mockImplementation((url) => {
    if (url === "/settings") {
      return Promise.resolve({ data: { currency_code: "INR" } });
    }

    if (url === "/transactions") {
      return Promise.resolve({
        data: [
          {
            id: 102,
            transaction_date: "2026-04-18",
            transaction_time: "07:05 PM",
            amount: "42.80",
            description: "Coffee",
            merchant: "Blue Tokai",
            month_key: "2026-04",
            expense_category: "personal",
            spend_category_id: null,
            source_type: "credit_card_pdf",
            review_status: "needs_review",
            reimburse: false,
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
      transaction_time: "07:05 PM",
      amount: "42.80",
      description: "Coffee",
      merchant: "Blue Tokai",
      month_key: "2026-04",
      expense_category: "personal",
      spend_category_id: 8,
      source_type: "credit_card_pdf",
      review_status: "reviewed",
      reimburse: true,
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
    within(table).getByRole("columnheader", { name: /amount/i }),
  ).toBeInTheDocument();
  expect(
    within(table).getByRole("columnheader", { name: /time/i }),
  ).toBeInTheDocument();
  expect(
    within(table).getByRole("columnheader", { name: /warning/i }),
  ).toBeInTheDocument();
  expect(
    within(table).getByRole("columnheader", { name: /reimburse/i }),
  ).toBeInTheDocument();
  expect(await within(table).findByText("Personal")).toBeInTheDocument();
  expect(within(table).getByText("18 Apr")).toBeInTheDocument();
  expect(within(table).getByText("2026 Sat")).toBeInTheDocument();
  expect(within(table).getByText("₹42.80")).toBeInTheDocument();
  expect(within(table).getByText("07:05 PM")).toBeInTheDocument();
  expect(within(table).getByText("Matches transaction #51")).toBeInTheDocument();
  expect(screen.getByLabelText("Merchant 102")).toHaveClass("review-table__control");
  expect(screen.getByLabelText("Expense category 102")).toHaveClass(
    "review-table__control",
  );
  expect(screen.getByLabelText("Spend category 102")).toHaveClass(
    "review-table__control",
  );
  expect(screen.getByLabelText("Reimburse 102")).toBeDisabled();
  expect(screen.getByLabelText("Status 102")).toHaveClass("review-table__control");

  await user.clear(screen.getByLabelText("Merchant 102"));
  await user.type(screen.getByLabelText("Merchant 102"), "Blue Tokai Cafe");
  await user.selectOptions(screen.getByLabelText("Expense category 102"), "common");
  expect(screen.getByLabelText("Reimburse 102")).not.toBeDisabled();
  await user.click(screen.getByLabelText("Reimburse 102"));
  await user.selectOptions(screen.getByLabelText("Spend category 102"), "8");
  await user.selectOptions(screen.getByLabelText("Status 102"), "reviewed");
  await user.click(
    await screen.findByRole("button", {
      name: /save review changes for blue tokai/i,
    }),
  );

  expect(mockedApi.patch).toHaveBeenCalledWith("/transactions/102", {
    merchant: "Blue Tokai Cafe",
    expense_category: "common",
    spend_category_id: 8,
    reimburse: true,
    review_status: "reviewed",
  });
  expect(await screen.findByText(/saved review changes/i)).toBeInTheDocument();
  expect(
    await screen.findByRole("button", {
      name: /save review changes for blue tokai/i,
    }),
  ).toHaveTextContent("Save");
});

test("review queue can save an untouched row using current transaction values", async () => {
  mockedApi.get.mockImplementation((url) => {
    if (url === "/settings") {
      return Promise.resolve({ data: { currency_code: "INR" } });
    }

    if (url === "/transactions") {
      return Promise.resolve({
        data: [
          {
            id: 205,
            transaction_date: "2026-04-20",
            transaction_time: null,
            amount: "19.99",
            description: "Snack",
            merchant: "Corner Store",
            month_key: "2026-04",
            expense_category: "common",
            spend_category_id: 8,
            source_type: "credit_card_pdf",
            review_status: "needs_review",
            reimburse: true,
            duplicate_suspected: false,
            duplicate_reason: null,
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
      id: 205,
      transaction_date: "2026-04-20",
      transaction_time: null,
      amount: "19.99",
      description: "Snack",
      merchant: "Corner Store",
      month_key: "2026-04",
      expense_category: "common",
      spend_category_id: 8,
      source_type: "credit_card_pdf",
      review_status: "needs_review",
      reimburse: true,
      duplicate_suspected: false,
      duplicate_reason: null,
      notes: null,
    },
  });

  renderWithProviders(<ReviewQueuePage />);
  const user = userEvent.setup();

  expect(await screen.findByText("-")).toBeInTheDocument();
  expect(screen.getByLabelText("Reimburse 205")).toBeChecked();

  await user.click(
    await screen.findByRole("button", {
      name: /save review changes for corner store/i,
    }),
  );

  expect(mockedApi.patch).toHaveBeenCalledWith("/transactions/205", {
    merchant: "Corner Store",
    expense_category: "common",
    spend_category_id: 8,
    reimburse: true,
    review_status: "needs_review",
  });
});

test("review queue refreshes saved needs-review rows from server data", async () => {
  let transactionFetchCount = 0;

  mockedApi.get.mockImplementation((url) => {
    if (url === "/settings") {
      return Promise.resolve({ data: { currency_code: "INR" } });
    }

    if (url === "/transactions") {
      transactionFetchCount += 1;
      return Promise.resolve({
        data: [
          {
            id: 206,
            transaction_date: "2026-04-20",
            transaction_time: null,
            amount: "19.99",
            description: "Snack",
            merchant:
              transactionFetchCount > 1
                ? "Corner Store Updated"
                : "corner store",
            month_key: "2026-04",
            expense_category: "common",
            spend_category_id: 8,
            source_type: "credit_card_pdf",
            review_status: "needs_review",
            reimburse: true,
            duplicate_suspected: false,
            duplicate_reason: null,
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
      id: 206,
      transaction_date: "2026-04-20",
      transaction_time: null,
      amount: "19.99",
      description: "Snack",
      merchant: "Corner Store Updated",
      month_key: "2026-04",
      expense_category: "common",
      spend_category_id: 8,
      source_type: "credit_card_pdf",
      review_status: "needs_review",
      reimburse: true,
      duplicate_suspected: false,
      duplicate_reason: null,
      notes: null,
    },
  });

  renderWithProviders(<ReviewQueuePage />);
  const user = userEvent.setup();

  expect(await screen.findByDisplayValue("corner store")).toBeInTheDocument();

  await user.clear(screen.getByLabelText("Merchant 206"));
  await user.type(screen.getByLabelText("Merchant 206"), "corner store updated");

  await user.click(
    await screen.findByRole("button", {
      name: /save review changes for corner store/i,
    }),
  );

  expect(await screen.findByText(/saved review changes/i)).toBeInTheDocument();
  expect(await screen.findByDisplayValue("Corner Store Updated")).toBeInTheDocument();
});

test("review queue can delete a transaction with confirmation", async () => {
  mockedApi.get.mockImplementation((url) => {
    if (url === "/settings") {
      return Promise.resolve({ data: { currency_code: "INR" } });
    }

    if (url === "/transactions") {
      return Promise.resolve({
        data: [
          {
            id: 311,
            transaction_date: "2026-04-21",
            transaction_time: null,
            amount: "99.00",
            description: "Cab",
            merchant: "Uber",
            month_key: "2026-04",
            expense_category: "common",
            spend_category_id: null,
            source_type: "credit_card_pdf",
            review_status: "needs_review",
            reimburse: false,
            duplicate_suspected: false,
            duplicate_reason: null,
            notes: null,
          },
        ],
      });
    }

    if (url === "/spend-categories") {
      return Promise.resolve({ data: [] });
    }

    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });

  mockedApi.delete.mockResolvedValue({
    data: { deleted_id: 311 },
  });

  renderWithProviders(<ReviewQueuePage />);
  const user = userEvent.setup();

  expect(await screen.findByText("₹99.00")).toBeInTheDocument();

  await user.click(
    await screen.findByRole("button", {
      name: /delete uber from review queue/i,
    }),
  );

  expect(await screen.findByText(/delete this transaction permanently/i)).toBeInTheDocument();

  await user.click(
    screen.getByRole("button", { name: /confirm delete uber/i }),
  );

  expect(mockedApi.delete).toHaveBeenCalledWith("/transactions/311");
  expect(await screen.findByText(/transaction deleted/i)).toBeInTheDocument();
});
