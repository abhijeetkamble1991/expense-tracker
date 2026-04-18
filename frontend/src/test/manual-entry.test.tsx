import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ManualEntryPage } from "../features/manual-entry/ManualEntryPage";
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

test("manual entry creates a live transaction", async () => {
  mockedApi.get.mockResolvedValue({
    data: [{ id: 7, name: "Platform ops", is_active: true }],
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

  renderWithProviders(<ManualEntryPage />);
  const user = userEvent.setup();

  await user.type(await screen.findByLabelText("Month"), "2026-04");
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
    notes: null,
  });
  expect(await screen.findByText(/manual transaction saved/i)).toBeInTheDocument();
});
