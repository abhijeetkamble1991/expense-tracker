import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { TransactionsPage } from "../features/transactions/TransactionsPage";
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

test("transactions page fetches and renders live transactions", async () => {
  mockedApi.get.mockImplementation((url) => {
    if (url === "/months") {
      return Promise.resolve({ data: ["2026-04", "2026-03", "2025-12"] });
    }

    if (url === "/settings") {
      return Promise.resolve({ data: { currency_code: "INR" } });
    }

    if (url === "/spend-categories") {
      return Promise.resolve({
        data: [{ id: 7, name: "Platform ops", is_active: true }],
      });
    }

    if (url === "/transactions") {
      return Promise.resolve({
        data: [
          {
            id: 75,
            transaction_date: "2026-04-09",
            amount: "180.00",
            description: "Coffee",
            merchant: "Blue Tokai",
            month_key: "2026-04",
            expense_category: "personal",
            spend_category_id: 7,
            source_type: "manual",
            review_status: "reviewed",
            notes: null,
          },
          {
            id: 76,
            transaction_date: "2026-04-14",
            amount: "320.00",
            description: "Hosting",
            merchant: "AWS",
            month_key: "2026-04",
            expense_category: "common",
            spend_category_id: 7,
            source_type: "manual",
            review_status: "reviewed",
            notes: null,
          },
        ],
      });
    }

    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });

  renderWithProviders(<TransactionsPage />);
  const user = userEvent.setup();

  expect(await screen.findByText("Transactions")).toBeInTheDocument();
  await waitFor(() => {
    expect(screen.getByLabelText("Year")).toHaveValue("2026");
    expect(screen.getByLabelText("Month")).toHaveValue("2026-04");
  });
  expect(screen.getByRole("option", { name: "April" })).toBeInTheDocument();
  expect(screen.getByRole("option", { name: "March" })).toBeInTheDocument();
  await waitFor(() =>
    expect(mockedApi.get).toHaveBeenCalledWith(
      "/transactions",
      expect.objectContaining({
        params: expect.objectContaining({ month_key: "2026-04" }),
      }),
    ),
  );
  expect(await screen.findByText("₹320.00")).toBeInTheDocument();
  expect(screen.getByLabelText("Sort by date")).toHaveValue("desc");
  expect(screen.getByText("14 Apr")).toBeInTheDocument();
  expect(screen.getAllByText("Common")[0]).toHaveClass("transactions-page__meta-pill");
  expect(screen.getAllByText("Platform ops")[0]).toHaveClass(
    "transactions-page__meta-pill",
  );
  expect(screen.getAllByText("Manual")[0]).toHaveClass(
    "transactions-page__meta-source",
  );

  let rows = screen.getAllByTestId("transaction-row");
  expect(within(rows[0]).getByText("AWS")).toBeInTheDocument();
  expect(within(rows[1]).getByText("Blue Tokai")).toBeInTheDocument();

  await user.selectOptions(screen.getByLabelText("Sort by date"), "asc");

  rows = screen.getAllByTestId("transaction-row");
  expect(within(rows[0]).getByText("Blue Tokai")).toBeInTheDocument();
  expect(within(rows[1]).getByText("AWS")).toBeInTheDocument();

  await user.selectOptions(screen.getByLabelText("Year"), "2025");
  expect(screen.getByLabelText("Month")).toHaveValue("2025-12");
  expect(screen.queryByRole("option", { name: "April" })).not.toBeInTheDocument();
  expect(screen.getByRole("option", { name: "December" })).toBeInTheDocument();
  await waitFor(() =>
    expect(mockedApi.get).toHaveBeenLastCalledWith(
      "/transactions",
      expect.objectContaining({
        params: expect.objectContaining({ month_key: "2025-12" }),
      }),
    ),
  );
});

test("transactions page dedupes repeated merchant descriptions and highlights type and category", async () => {
  mockedApi.get.mockImplementation((url) => {
    if (url === "/months") {
      return Promise.resolve({ data: ["2026-04"] });
    }

    if (url === "/settings") {
      return Promise.resolve({ data: { currency_code: "INR" } });
    }

    if (url === "/spend-categories") {
      return Promise.resolve({
        data: [{ id: 7, name: "Home", is_active: true }],
      });
    }

    if (url === "/transactions") {
      return Promise.resolve({
        data: [
          {
            id: 134,
            transaction_date: "2026-04-18",
            amount: "718.00",
            description: "Paid to URBANCOMPANY",
            merchant: "URBANCOMPANY",
            month_key: "2026-04",
            expense_category: "personal",
            spend_category_id: 7,
            source_type: "upi_pdf",
            review_status: "needs_review",
            notes: null,
          },
        ],
      });
    }

    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });

  renderWithProviders(<TransactionsPage />);

  const row = (await screen.findAllByTestId("transaction-row"))[0];

  expect(within(row).getAllByText("URBANCOMPANY")).toHaveLength(1);
  expect(within(row).queryByText("Paid to URBANCOMPANY")).not.toBeInTheDocument();
  expect(within(row).getByText("Personal")).toHaveClass("transactions-page__meta-pill");
  expect(within(row).getByText("Home")).toHaveClass("transactions-page__meta-pill");
  expect(within(row).getByText("UPI import")).toHaveClass(
    "transactions-page__meta-source",
  );
});

test("transactions page includes manual expense entry", async () => {
  mockedApi.get.mockImplementation((url) => {
    if (url === "/months") {
      return Promise.resolve({ data: ["2026-04"] });
    }

    if (url === "/settings") {
      return Promise.resolve({ data: { currency_code: "USD" } });
    }

    if (url === "/spend-categories") {
      return Promise.resolve({
        data: [{ id: 7, name: "Platform ops", is_active: true }],
      });
    }

    if (url === "/transactions") {
      return Promise.resolve({ data: [] });
    }

    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });

  mockedApi.post.mockResolvedValue({
    data: {
      id: 75,
      transaction_date: "2026-04-14",
      amount: "320.00",
      description: "Hosting",
      merchant: "AWS",
      month_key: "2026-04",
      expense_category: "common",
      spend_category_id: 7,
      source_type: "manual",
      review_status: "reviewed",
      notes: null,
    },
  });

  renderWithProviders(<TransactionsPage />);
  const user = userEvent.setup();

  expect(await screen.findByRole("button", { name: /add transaction/i })).toBeInTheDocument();
  expect(screen.queryByLabelText("Date")).not.toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: /add transaction/i }));

  await user.type(screen.getByLabelText("Date"), "2026-04-14");
  await user.type(screen.getByLabelText("Merchant"), "AWS");
  await user.type(screen.getByLabelText("Description"), "Hosting");
  await user.type(screen.getByLabelText("Amount"), "320");
  await user.selectOptions(screen.getByLabelText("Expense category"), "common");
  await user.selectOptions(screen.getByLabelText("Spend category"), "7");
  await user.click(screen.getByRole("button", { name: /save manual transaction/i }));

  expect(mockedApi.post).toHaveBeenCalledWith("/transactions/manual", {
    month_key: "2026-04",
    transaction_date: "2026-04-14",
    merchant: "AWS",
    description: "Hosting",
    amount: "320.00",
    expense_category: "common",
    spend_category_id: 7,
    reimburse: false,
    notes: null,
  });
  expect(await screen.findByText(/manual transaction saved/i)).toBeInTheDocument();
});

test("transactions page can move a transaction back to review", async () => {
  mockedApi.get.mockImplementation((url) => {
    if (url === "/months") {
      return Promise.resolve({ data: ["2026-04"] });
    }

    if (url === "/settings") {
      return Promise.resolve({ data: { currency_code: "INR" } });
    }

    if (url === "/spend-categories") {
      return Promise.resolve({
        data: [{ id: 7, name: "Platform ops", is_active: true }],
      });
    }

    if (url === "/transactions") {
      return Promise.resolve({
        data: [
          {
            id: 76,
            transaction_date: "2026-04-14",
            amount: "320.00",
            description: "Hosting",
            merchant: "AWS",
            month_key: "2026-04",
            expense_category: "common",
            spend_category_id: 7,
            source_type: "manual",
            review_status: "reviewed",
            notes: null,
          },
        ],
      });
    }

    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });

  mockedApi.patch.mockResolvedValue({
    data: {
      id: 76,
      transaction_date: "2026-04-14",
      amount: "320.00",
      description: "Hosting",
      merchant: "AWS",
      month_key: "2026-04",
      expense_category: "common",
      spend_category_id: 7,
      source_type: "manual",
      review_status: "needs_review",
      notes: null,
    },
  });

  renderWithProviders(<TransactionsPage />);
  const user = userEvent.setup();

  expect(await screen.findByText("Transactions")).toBeInTheDocument();
  await waitFor(() =>
    expect(mockedApi.get).toHaveBeenCalledWith(
      "/transactions",
      expect.objectContaining({
        params: expect.objectContaining({ month_key: "2026-04" }),
      }),
    ),
  );
  await waitFor(() =>
    expect(screen.getAllByTestId("transaction-row")).toHaveLength(1),
  );

  await user.click(screen.getByRole("button", { name: /more actions for aws/i }));
  await user.click(screen.getByRole("button", { name: /move aws to review/i }));

  expect(mockedApi.patch).toHaveBeenCalledWith("/transactions/76", {
    review_status: "needs_review",
  });
  expect(await screen.findByText("Needs review")).toBeInTheDocument();
});

test("transactions page confirms before deleting a transaction", async () => {
  mockedApi.get.mockImplementation((url) => {
    if (url === "/months") {
      return Promise.resolve({ data: ["2026-04"] });
    }

    if (url === "/settings") {
      return Promise.resolve({ data: { currency_code: "INR" } });
    }

    if (url === "/spend-categories") {
      return Promise.resolve({
        data: [{ id: 7, name: "Platform ops", is_active: true }],
      });
    }

    if (url === "/transactions") {
      return Promise.resolve({
        data: [
          {
            id: 76,
            transaction_date: "2026-04-14",
            amount: "320.00",
            description: "Hosting",
            merchant: "AWS",
            month_key: "2026-04",
            expense_category: "common",
            spend_category_id: 7,
            source_type: "manual",
            review_status: "reviewed",
            notes: null,
          },
        ],
      });
    }

    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });

  mockedApi.delete.mockResolvedValue({
    data: { deleted_id: 76 },
  });

  renderWithProviders(<TransactionsPage />);
  const user = userEvent.setup();

  expect(await screen.findByText("Transactions")).toBeInTheDocument();
  await waitFor(() =>
    expect(mockedApi.get).toHaveBeenCalledWith(
      "/transactions",
      expect.objectContaining({
        params: expect.objectContaining({ month_key: "2026-04" }),
      }),
    ),
  );
  await waitFor(() =>
    expect(screen.getAllByTestId("transaction-row")).toHaveLength(1),
  );

  await user.click(screen.getByRole("button", { name: /more actions for aws/i }));
  await user.click(screen.getByRole("button", { name: /delete aws/i }));

  expect(
    await screen.findByText(/delete this transaction permanently/i),
  ).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: /confirm delete aws/i }));

  expect(mockedApi.delete).toHaveBeenCalledWith("/transactions/76");
  expect(screen.queryByText("AWS")).not.toBeInTheDocument();
});

test("transactions page explains empty month state", async () => {
  mockedApi.get.mockImplementation((url) => {
    if (url === "/months") {
      return Promise.resolve({ data: [] });
    }

    if (url === "/settings") {
      return Promise.resolve({ data: { currency_code: "USD" } });
    }

    if (url === "/spend-categories") {
      return Promise.resolve({
        data: [{ id: 7, name: "Groceries", is_active: true }],
      });
    }

    if (url === "/transactions") {
      return Promise.resolve({ data: [] });
    }

    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });

  renderWithProviders(<TransactionsPage />);

  expect(await screen.findByText(/no tracked months yet/i)).toBeInTheDocument();
  expect(
    screen.getByText(/add a manual transaction or import a statement to create the first month/i),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("Year")).toBeDisabled();
  expect(screen.getByLabelText("Month")).toBeDisabled();
});
