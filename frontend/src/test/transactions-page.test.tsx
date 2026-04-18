import { screen, waitFor } from "@testing-library/react";

import { TransactionsPage } from "../features/transactions/TransactionsPage";
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
});

test("transactions page fetches and renders live transactions", async () => {
  mockedApi.get.mockImplementation((url) => {
    if (url === "/months") {
      return Promise.resolve({ data: ["2026-04"] });
    }

    if (url === "/transactions") {
      return Promise.resolve({
        data: [
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
            review_status: "reviewed",
            notes: null,
          },
        ],
      });
    }

    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });

  renderWithProviders(<TransactionsPage />);

  expect(await screen.findByText("Transactions")).toBeInTheDocument();
  await waitFor(() =>
    expect(mockedApi.get).toHaveBeenCalledWith(
      "/transactions",
      expect.objectContaining({
        params: expect.objectContaining({ month_key: "2026-04" }),
      }),
    ),
  );
});
