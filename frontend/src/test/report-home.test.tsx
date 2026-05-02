import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ReportHomePage } from "../features/reports/ReportHomePage";
import { api } from "../lib/api";
import { bootstrapDisplayName, bootstrapUsername } from "./bootstrap-credentials";
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

test("report home renders the report dashboard with category, comparison, ledger, and top expense sections", async () => {
  mockedApi.get.mockImplementation((url) => {
    if (url === "/months") {
      return Promise.resolve({
        data: ["2026-04", "2026-03", "2026-02", "2026-01", "2025-12", "2025-11"],
      });
    }

    if (url === "/settings") {
      return Promise.resolve({
        data: {
          username: bootstrapUsername,
          display_name: bootstrapDisplayName,
          created_at: "2026-04-19T10:00:00Z",
          currency_code: "INR",
        },
      });
    }

    if (url === "/spend-categories") {
      return Promise.resolve({
        data: [
          { id: 7, name: "Food", is_active: true },
          { id: 8, name: "Dairy", is_active: true },
          { id: 9, name: "Coffee", is_active: true },
          { id: 10, name: "Home", is_active: true },
        ],
      });
    }

    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });

  mockedApi.post.mockImplementation((url) => {
    if (url === "/reports/2026-04/regenerate") {
      return Promise.resolve({
        data: {
          month_key: "2026-04",
          unresolved_count: 1,
          totals: {
            overall: "3160.45",
            common: "850.00",
            personal: "2310.45",
            common_reimburse: "425.00",
            personal_reimburse: "0.00",
          },
          by_source: { manual: "850.00", credit_card_pdf: "2310.45" },
          by_merchant: {
            "Vendor payment": "2267.65",
            "Office lunch": "680.00",
            "Milk basket": "170.00",
            "Blue Tokai": "42.80",
          },
          by_spend_category: {
            Food: "680.00",
            Dairy: "170.00",
            Coffee: "42.80",
            Home: "2267.65",
          },
          transactions: [
            {
              id: 81,
              transaction_date: "2026-04-12",
              amount: "680.00",
              description: "Team lunch",
              merchant: "Office lunch",
              month_key: "2026-04",
              expense_category: "common",
              spend_category_id: 7,
              source_type: "manual",
              review_status: "reviewed",
              notes: null,
            },
            {
              id: 82,
              transaction_date: "2026-04-15",
              amount: "170.00",
              description: "Milk and curd",
              merchant: "Milk basket",
              month_key: "2026-04",
              expense_category: "common",
              spend_category_id: 8,
              source_type: "manual",
              review_status: "reviewed",
              notes: null,
            },
            {
              id: 102,
              transaction_date: "2026-04-18",
              amount: "42.80",
              description: "Coffee",
              merchant: "Blue Tokai",
              month_key: "2026-04",
              expense_category: "personal",
              spend_category_id: 9,
              source_type: "credit_card_pdf",
              review_status: "reviewed",
              notes: null,
            },
            {
              id: 103,
              transaction_date: "2026-04-20",
              amount: "2267.65",
              description: "Vendor payment",
              merchant: "Vendor payment",
              month_key: "2026-04",
              expense_category: "personal",
              spend_category_id: 10,
              source_type: "credit_card_pdf",
              review_status: "reviewed",
              notes: null,
            },
          ],
        },
      });
    }

    if (url === "/reports/2026-03/regenerate") {
      return Promise.resolve({
        data: {
          month_key: "2026-03",
          unresolved_count: 0,
          totals: {
            overall: "2650.00",
            common: "500.00",
            personal: "2150.00",
            common_reimburse: "0.00",
            personal_reimburse: "0.00",
          },
          by_source: { manual: "500.00", credit_card_pdf: "2150.00" },
          by_merchant: {
            "Office lunch": "500.00",
            "Blue Tokai": "50.00",
            Rent: "2100.00",
          },
          by_spend_category: {
            Food: "500.00",
            Coffee: "50.00",
            Home: "2100.00",
          },
          transactions: [
            {
              id: 71,
              transaction_date: "2026-03-09",
              amount: "500.00",
              description: "Team lunch",
              merchant: "Office lunch",
              month_key: "2026-03",
              expense_category: "common",
              spend_category_id: 7,
              source_type: "manual",
              review_status: "reviewed",
              notes: null,
            },
            {
              id: 72,
              transaction_date: "2026-03-17",
              amount: "50.00",
              description: "Coffee",
              merchant: "Blue Tokai",
              month_key: "2026-03",
              expense_category: "personal",
              spend_category_id: 9,
              source_type: "credit_card_pdf",
              review_status: "reviewed",
              notes: null,
            },
            {
              id: 73,
              transaction_date: "2026-03-20",
              amount: "2100.00",
              description: "Rent",
              merchant: "Rent",
              month_key: "2026-03",
              expense_category: "personal",
              spend_category_id: 10,
              source_type: "credit_card_pdf",
              review_status: "reviewed",
              notes: null,
            },
          ],
        },
      });
    }

    if (url === "/reports/2026-02/regenerate") {
      return Promise.resolve({
        data: {
          month_key: "2026-02",
          unresolved_count: 0,
          totals: {
            overall: "2410.00",
            common: "760.00",
            personal: "1650.00",
            common_reimburse: "0.00",
            personal_reimburse: "0.00",
          },
          by_source: { manual: "760.00", credit_card_pdf: "1650.00" },
          by_merchant: {
            Grocer: "510.00",
            Commute: "250.00",
            Rent: "1650.00",
          },
          by_spend_category: {
            Food: "510.00",
            Travel: "250.00",
            Home: "1650.00",
          },
          transactions: [
            {
              id: 61,
              transaction_date: "2026-02-04",
              amount: "510.00",
              description: "Groceries",
              merchant: "Grocer",
              month_key: "2026-02",
              expense_category: "common",
              spend_category_id: 7,
              source_type: "manual",
              review_status: "reviewed",
              notes: null,
            },
            {
              id: 62,
              transaction_date: "2026-02-10",
              amount: "250.00",
              description: "Cab",
              merchant: "Commute",
              month_key: "2026-02",
              expense_category: "common",
              spend_category_id: null,
              source_type: "manual",
              review_status: "reviewed",
              notes: null,
            },
            {
              id: 63,
              transaction_date: "2026-02-12",
              amount: "1650.00",
              description: "Rent",
              merchant: "Rent",
              month_key: "2026-02",
              expense_category: "personal",
              spend_category_id: 10,
              source_type: "credit_card_pdf",
              review_status: "reviewed",
              notes: null,
            },
          ],
        },
      });
    }

    if (url === "/reports/2026-01/regenerate") {
      return Promise.resolve({
        data: {
          month_key: "2026-01",
          unresolved_count: 0,
          totals: {
            overall: "2280.00",
            common: "640.00",
            personal: "1640.00",
            common_reimburse: "0.00",
            personal_reimburse: "0.00",
          },
          by_source: { manual: "640.00", credit_card_pdf: "1640.00" },
          by_merchant: {
            Grocer: "420.00",
            Utilities: "220.00",
            Rent: "1640.00",
          },
          by_spend_category: {
            Food: "420.00",
            Home: "1640.00",
          },
          transactions: [
            {
              id: 51,
              transaction_date: "2026-01-06",
              amount: "420.00",
              description: "Groceries",
              merchant: "Grocer",
              month_key: "2026-01",
              expense_category: "common",
              spend_category_id: 7,
              source_type: "manual",
              review_status: "reviewed",
              notes: null,
            },
            {
              id: 52,
              transaction_date: "2026-01-14",
              amount: "220.00",
              description: "Electricity",
              merchant: "Utilities",
              month_key: "2026-01",
              expense_category: "common",
              spend_category_id: null,
              source_type: "manual",
              review_status: "reviewed",
              notes: null,
            },
            {
              id: 53,
              transaction_date: "2026-01-19",
              amount: "1640.00",
              description: "Rent",
              merchant: "Rent",
              month_key: "2026-01",
              expense_category: "personal",
              spend_category_id: 10,
              source_type: "credit_card_pdf",
              review_status: "reviewed",
              notes: null,
            },
          ],
        },
      });
    }

    if (url === "/reports/2025-12/regenerate") {
      return Promise.resolve({
        data: {
          month_key: "2025-12",
          unresolved_count: 0,
          totals: {
            overall: "2100.00",
            common: "580.00",
            personal: "1520.00",
            common_reimburse: "0.00",
            personal_reimburse: "0.00",
          },
          by_source: { manual: "580.00", credit_card_pdf: "1520.00" },
          by_merchant: {
            Grocer: "380.00",
            Utilities: "200.00",
            Rent: "1520.00",
          },
          by_spend_category: {
            Food: "380.00",
            Home: "1520.00",
          },
          transactions: [],
        },
      });
    }

    if (url === "/reports/2025-11/regenerate") {
      return Promise.resolve({
        data: {
          month_key: "2025-11",
          unresolved_count: 0,
          totals: {
            overall: "1950.00",
            common: "540.00",
            personal: "1410.00",
            common_reimburse: "0.00",
            personal_reimburse: "0.00",
          },
          by_source: { manual: "540.00", credit_card_pdf: "1410.00" },
          by_merchant: {
            Grocer: "360.00",
            Utilities: "180.00",
            Rent: "1410.00",
          },
          by_spend_category: {
            Food: "360.00",
            Home: "1410.00",
          },
          transactions: [],
        },
      });
    }

    return Promise.reject(new Error(`Unexpected POST ${url}`));
  });

  renderWithProviders(<ReportHomePage />);
  const user = userEvent.setup();

  expect(
    await screen.findByRole("heading", { name: /monthly report/i }),
  ).toBeInTheDocument();
  await waitFor(() => {
    expect(mockedApi.post).toHaveBeenCalledWith("/reports/2026-04/regenerate");
    expect(mockedApi.post).toHaveBeenCalledWith("/reports/2026-03/regenerate");
    expect(mockedApi.post).toHaveBeenCalledWith("/reports/2026-02/regenerate");
    expect(mockedApi.post).toHaveBeenCalledWith("/reports/2026-01/regenerate");
    expect(mockedApi.post).toHaveBeenCalledWith("/reports/2025-12/regenerate");
    expect(mockedApi.post).toHaveBeenCalledWith("/reports/2025-11/regenerate");
  });

  const totalsStrip = within(await screen.findByLabelText("2026-04 totals"));
  expect(totalsStrip.getByText("Monthly Total")).toBeInTheDocument();
  expect(totalsStrip.getByText("Common Total")).toBeInTheDocument();
  expect(totalsStrip.getByText("Personal Total")).toBeInTheDocument();
  expect(totalsStrip.getByText("Expenses Need Review")).toBeInTheDocument();
  expect(totalsStrip.getByText("Reimburse")).toBeInTheDocument();
  expect(totalsStrip.getByText("₹3,160.45")).toBeInTheDocument();
  expect(totalsStrip.getByText("₹850.00")).toBeInTheDocument();
  expect(totalsStrip.getByText("₹2,310.45")).toBeInTheDocument();
  expect(totalsStrip.getByText("₹425.00")).toBeInTheDocument();
  expect(totalsStrip.getByText("1")).toBeInTheDocument();
  expect(totalsStrip.getByText("↑ 19.3% vs Mar")).toBeInTheDocument();
  expect(totalsStrip.getByText("↑ 70.0% vs Mar")).toBeInTheDocument();
  expect(totalsStrip.getByText("↑ 7.5% vs Mar")).toBeInTheDocument();
  expect(totalsStrip.getByText("New vs Mar")).toBeInTheDocument();

  expect(await screen.findByRole("heading", { name: /expense split/i })).toBeInTheDocument();
  expect(await screen.findByText("26.9% of total")).toBeInTheDocument();
  expect(await screen.findByText("73.1% of total")).toBeInTheDocument();

  const categorySection = screen
    .getByRole("heading", { name: /expenses by category/i })
    .closest("section");
  expect(categorySection).not.toBeNull();
  const scopedCategory = within(categorySection as HTMLElement);
  expect(scopedCategory.getByLabelText("Category spend type")).toHaveValue("common");
  expect(await scopedCategory.findByText("Food")).toBeInTheDocument();
  expect(await scopedCategory.findByText("80.0% of common spend")).toBeInTheDocument();
  expect(await scopedCategory.findByText("Dairy")).toBeInTheDocument();
  expect(await scopedCategory.findByText("20.0% of common spend")).toBeInTheDocument();

  const comparisonSection = screen
    .getByRole("heading", { name: /comparison with previous month/i })
    .closest("section");
  expect(comparisonSection).not.toBeNull();
  const scopedComparison = within(comparisonSection as HTMLElement);
  expect(scopedComparison.getByLabelText("Comparison expense type")).toHaveValue(
    "common",
  );
  const comparisonRows = await scopedComparison.findAllByRole("article");
  expect(within(comparisonRows[0]).getByText("Food")).toBeInTheDocument();
  expect(within(comparisonRows[0]).getAllByText("Increased by 36.0%")).toHaveLength(1);
  expect(within(comparisonRows[0]).getByText("Last month")).toHaveClass(
    "comparison-row__cell-label",
  );
  expect(within(comparisonRows[0]).getByText("₹500.00")).toHaveClass(
    "comparison-row__cell-value",
  );
  expect(within(comparisonRows[0]).getByText("Current month")).toHaveClass(
    "comparison-row__cell-label",
  );
  expect(within(comparisonRows[0]).getByText("₹680.00")).toHaveClass(
    "comparison-row__cell-value",
  );
  expect(within(comparisonRows[0]).getByText("Change")).toHaveClass(
    "comparison-row__cell-label",
  );
  expect(within(comparisonRows[0]).getByText("+₹180.00 vs last month")).toHaveClass(
    "comparison-row__cell-value",
  );
  expect(within(comparisonRows[0]).getByText("Note")).toHaveClass(
    "comparison-row__cell-label",
  );
  expect(within(comparisonRows[0]).getByText("Higher than last month")).toHaveClass(
    "comparison-row__cell-value",
  );
  expect(within(comparisonRows[0]).getByText("Increased by 36.0%")).toHaveClass(
    "delta-chip",
    "delta-chip--up",
  );
  expect(within(comparisonRows[1]).getByText("Dairy")).toBeInTheDocument();
  expect(within(comparisonRows[1]).getAllByText("New")).toHaveLength(1);
  expect(within(comparisonRows[1]).getByText("New")).toHaveClass(
    "delta-chip",
    "delta-chip--new",
  );
  expect(within(comparisonRows[1]).getByText("No spend in Mar")).toHaveClass(
    "comparison-row__cell-value",
  );

  const trendSection = screen
    .getByRole("heading", { name: /month-over-month trend/i })
    .closest("section");
  expect(trendSection).not.toBeNull();
  const scopedTrend = within(trendSection as HTMLElement);
  expect(scopedTrend.getByText("Nov")).toBeInTheDocument();
  expect(scopedTrend.getByText("Apr")).toBeInTheDocument();
  expect(scopedTrend.getByText("₹3,160.45")).toBeInTheDocument();
  expect(scopedTrend.getByText("₹850.00")).toBeInTheDocument();

  const ledgerSection = screen
    .getByRole("heading", { name: /expenses list/i })
    .closest("section");
  expect(ledgerSection).not.toBeNull();
  const scopedLedger = within(ledgerSection as HTMLElement);
  expect(scopedLedger.getByLabelText("Expense list type")).toHaveValue("common");
  expect(scopedLedger.getByLabelText("Expense list category")).toHaveValue("all");
  expect(await scopedLedger.findByText("Office lunch")).toBeInTheDocument();
  expect(await scopedLedger.findByText("Milk basket")).toBeInTheDocument();
  expect(scopedLedger.getByText("12 Apr")).toBeInTheDocument();
  expect(scopedLedger.getByText("2026 Sun")).toBeInTheDocument();
  expect(scopedLedger.queryByText("Vendor payment")).not.toBeInTheDocument();

  await user.selectOptions(scopedLedger.getByLabelText("Expense list category"), "Dairy");
  expect(await scopedLedger.findByText("Milk basket")).toBeInTheDocument();
  expect(scopedLedger.queryByText("Office lunch")).not.toBeInTheDocument();

  const topExpensesSection = screen
    .getByRole("heading", { name: /top 10 expenses/i })
    .closest("section");
  expect(topExpensesSection).not.toBeNull();
  const scopedTopExpenses = within(topExpensesSection as HTMLElement);
  const topItems = scopedTopExpenses.getAllByRole("article");
  expect(within(topItems[0]).getByText("Vendor payment")).toBeInTheDocument();
  expect(within(topItems[0]).getByText("20 Apr")).toBeInTheDocument();
  expect(within(topItems[0]).getByText("2026 Mon")).toBeInTheDocument();
  expect(within(topItems[0]).getByText("₹2,267.65")).toBeInTheDocument();

  await user.selectOptions(screen.getByLabelText("Year"), "2025");
  expect(screen.getByLabelText("Month")).toHaveValue("2025-12");
  await waitFor(() => {
    expect(mockedApi.post).toHaveBeenCalledWith("/reports/2025-12/regenerate");
    expect(mockedApi.post).toHaveBeenCalledWith("/reports/2025-11/regenerate");
  });
});

test("report expense rows use the compact ledger structure", async () => {
  mockedApi.get.mockImplementation((url) => {
    if (url === "/months") {
      return Promise.resolve({ data: ["2026-04", "2026-03"] });
    }

    if (url === "/settings") {
      return Promise.resolve({
        data: {
          username: bootstrapUsername,
          display_name: bootstrapDisplayName,
          created_at: "2026-04-19T10:00:00Z",
          currency_code: "INR",
        },
      });
    }

    if (url === "/spend-categories") {
      return Promise.resolve({
        data: [{ id: 7, name: "Vegetables", is_active: true }],
      });
    }

    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });

  mockedApi.post.mockImplementation((url) => {
    if (url === "/reports/2026-04/regenerate") {
      return Promise.resolve({
        data: {
          month_key: "2026-04",
          unresolved_count: 0,
          totals: {
            overall: "40.00",
            common: "40.00",
            personal: "0.00",
            common_reimburse: "0.00",
            personal_reimburse: "0.00",
          },
          by_source: { bank_statement_pdf: "40.00" },
          by_merchant: { "SHRINATH NAVANATH RAJIWADE": "40.00" },
          by_spend_category: { Vegetables: "40.00" },
          transactions: [
            {
              id: 401,
              transaction_date: "2026-04-18",
              amount: "40.00",
              description: "Vegetables",
              merchant: "SHRINATH NAVANATH RAJIWADE",
              month_key: "2026-04",
              expense_category: "common",
              spend_category_id: 7,
              source_type: "bank_statement_pdf",
              review_status: "reviewed",
              notes: null,
            },
          ],
        },
      });
    }

    if (url === "/reports/2026-03/regenerate") {
      return Promise.resolve({
        data: {
          month_key: "2026-03",
          unresolved_count: 0,
          totals: {
            overall: "0.00",
            common: "0.00",
            personal: "0.00",
            common_reimburse: "0.00",
            personal_reimburse: "0.00",
          },
          by_source: {},
          by_merchant: {},
          by_spend_category: {},
          transactions: [],
        },
      });
    }

    return Promise.reject(new Error(`Unexpected POST ${url}`));
  });

  renderWithProviders(<ReportHomePage />);

  const expenseListSection = (await screen.findByRole("heading", { name: /expenses list/i })).closest(
    "section",
  );
  expect(expenseListSection).not.toBeNull();

  const merchant = await within(expenseListSection as HTMLElement).findByText(
    "SHRINATH NAVANATH RAJIWADE",
  );
  const row = merchant.closest(".report-transaction-row");

  expect(row).not.toBeNull();
  expect(within(row as HTMLElement).getByText("SHRINATH NAVANATH RAJIWADE")).toHaveClass(
    "report-transaction-row__merchant",
  );
  expect(within(row as HTMLElement).getByText("Common • Vegetables")).toHaveClass(
    "report-transaction-row__meta",
  );
  expect(
    within(row as HTMLElement).queryByText("2026-04-18 • Common • Vegetables"),
  ).not.toBeInTheDocument();
  expect(within(row as HTMLElement).getByText("₹40.00")).toHaveClass(
    "report-transaction-row__amount",
  );
});

test("report expense rows keep the amount pinned right while truncating long content", async () => {
  mockedApi.get.mockImplementation((url) => {
    if (url === "/months") {
      return Promise.resolve({ data: ["2026-04", "2026-03"] });
    }

    if (url === "/settings") {
      return Promise.resolve({
        data: {
          username: bootstrapUsername,
          display_name: bootstrapDisplayName,
          created_at: "2026-04-19T10:00:00Z",
          currency_code: "INR",
        },
      });
    }

    if (url === "/spend-categories") {
      return Promise.resolve({
        data: [{ id: 7, name: "Vegetables", is_active: true }],
      });
    }

    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });

  mockedApi.post.mockImplementation((url) => {
    if (url === "/reports/2026-04/regenerate") {
      return Promise.resolve({
        data: {
          month_key: "2026-04",
          unresolved_count: 0,
          totals: {
            overall: "718.00",
            common: "718.00",
            personal: "0.00",
            common_reimburse: "718.00",
            personal_reimburse: "0.00",
          },
          by_source: { bank_statement_pdf: "718.00" },
          by_merchant: {
            "SURESH BABURAO BACCHEWAR WITH VERY LONG DISPLAY NAME FOR REPORT ROW": "718.00",
          },
          by_spend_category: { Vegetables: "718.00" },
          transactions: [
            {
              id: 777,
              transaction_date: "2026-04-18",
              amount: "718.00",
              description: "Vegetables",
              merchant:
                "SURESH BABURAO BACCHEWAR WITH VERY LONG DISPLAY NAME FOR REPORT ROW",
              month_key: "2026-04",
              expense_category: "common",
              spend_category_id: 7,
              source_type: "bank_statement_pdf",
              review_status: "reviewed",
              notes: null,
            },
          ],
        },
      });
    }

    if (url === "/reports/2026-03/regenerate") {
      return Promise.resolve({
        data: {
          month_key: "2026-03",
          unresolved_count: 0,
          totals: {
            overall: "0.00",
            common: "0.00",
            personal: "0.00",
            common_reimburse: "0.00",
            personal_reimburse: "0.00",
          },
          by_source: {},
          by_merchant: {},
          by_spend_category: {},
          transactions: [],
        },
      });
    }

    return Promise.reject(new Error(`Unexpected POST ${url}`));
  });

  renderWithProviders(<ReportHomePage />);

  const expenseListSection = (await screen.findByRole("heading", { name: /expenses list/i })).closest(
    "section",
  );
  expect(expenseListSection).not.toBeNull();

  const merchant = await within(expenseListSection as HTMLElement).findByText(
    "SURESH BABURAO BACCHEWAR WITH VERY LONG DISPLAY NAME FOR REPORT ROW",
  );
  const row = merchant.closest(".report-transaction-row");
  const content = merchant.closest(".report-transaction-row__content");
  const amount = within(row as HTMLElement).getByText("₹718.00");

  expect(row).not.toBeNull();
  expect(content).not.toBeNull();
  expect(content).toHaveClass("report-transaction-row__content");
  expect(amount).toHaveClass("report-transaction-row__amount");
});

test("report home explains empty month state", async () => {
  mockedApi.get.mockImplementation((url) => {
    if (url === "/months") {
      return Promise.resolve({ data: [] });
    }

    if (url === "/settings") {
      return Promise.resolve({
        data: {
          username: bootstrapUsername,
          display_name: bootstrapDisplayName,
          created_at: "2026-04-19T10:00:00Z",
          currency_code: "INR",
        },
      });
    }

    if (url === "/spend-categories") {
      return Promise.resolve({
        data: [{ id: 7, name: "Groceries", is_active: true }],
      });
    }

    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });

  renderWithProviders(<ReportHomePage />);

  expect(await screen.findByText(/no tracked months yet/i)).toBeInTheDocument();
  expect(
    screen.getByText(
      /import a statement or add a transaction before monthly reports can be generated/i,
    ),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("Year")).toBeDisabled();
  expect(screen.getByLabelText("Month")).toBeDisabled();
});
