import { screen, waitFor } from "@testing-library/react";

import { ReportHomePage } from "../features/reports/ReportHomePage";
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

test("report home fetches months and renders report summary from the API", async () => {
  mockedApi.get.mockImplementation((url) => {
    if (url === "/months") {
      return Promise.resolve({ data: ["2026-04", "2026-03"] });
    }

    if (url === "/spend-categories") {
      return Promise.resolve({
        data: [
          { id: 7, name: "Platform ops", is_active: true },
          { id: 8, name: "Client delivery", is_active: true },
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
          totals: { overall: "4280.45", common: "1800.00", personal: "2480.45" },
          by_source: { manual: "320.00", credit_card_pdf: "3960.45" },
          by_merchant: { AWS: "1120.00", "Blue Tokai": "214.60" },
          by_spend_category: {
            "Platform ops": "1120.00",
            "Client delivery": "171.80",
          },
          transactions: [
            {
              id: 75,
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
            {
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
              notes: null,
            },
          ],
        },
      });
    }

    return Promise.reject(new Error(`Unexpected POST ${url}`));
  });

  renderWithProviders(<ReportHomePage />);

  expect(
    await screen.findByRole("heading", { name: /monthly report/i }),
  ).toBeInTheDocument();
  await waitFor(() =>
    expect(mockedApi.post).toHaveBeenCalledWith("/reports/2026-04/regenerate"),
  );
  expect(screen.getByRole("option", { name: "2026-04" })).toBeInTheDocument();
  expect(screen.getByText(/2026-04 summary/i)).toBeInTheDocument();
  expect(await screen.findByText("$4,280.45")).toBeInTheDocument();
  expect(await screen.findByText("1 expenses need review")).toBeInTheDocument();
  expect(await screen.findByText("Platform ops")).toBeInTheDocument();
  await waitFor(() =>
    expect(screen.getAllByText(/1 transactions/)).toHaveLength(2),
  );
  expect(
    await screen.findByText("2026-04-14 • common • Platform ops"),
  ).toBeInTheDocument();
});
