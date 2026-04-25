import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { UploadPage } from "../features/imports/UploadPage";
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
  mockedApi.post.mockReset();
});

test("upload page posts a file import and renders the returned batch", async () => {
  mockedApi.post.mockResolvedValue({
    data: {
      id: 5,
      month_key: "2026-04",
      source_type: "credit_card_pdf",
      original_filename: "statement.pdf",
      parser_type: "credit_card",
      parse_status: "success",
      extracted_count: 4,
      skipped_count: 0,
      flagged_count: 1,
      warnings: [],
      uploaded_at: "2026-04-19T10:00:00Z",
    },
  });

  renderWithProviders(<UploadPage />);
  const user = userEvent.setup();
  const file = new File(["pdf"], "statement.pdf", { type: "application/pdf" });

  expect(screen.queryByLabelText("Month")).not.toBeInTheDocument();
  expect(
    screen.getByRole("option", { name: /bank statement/i }),
  ).toHaveValue("bank_statement_pdf");
  await user.selectOptions(screen.getByLabelText("Source type"), "bank_statement_pdf");
  await user.upload(screen.getByLabelText("Statement file"), file);
  await user.click(screen.getByRole("button", { name: /upload import/i }));

  await waitFor(() =>
    expect(mockedApi.post).toHaveBeenCalledWith(
      "/imports",
      expect.any(FormData),
      expect.objectContaining({
        headers: { "Content-Type": "multipart/form-data" },
      }),
    ),
  );
  const formData = mockedApi.post.mock.calls[0]?.[1] as FormData;
  expect(formData.get("source_type")).toBe("bank_statement_pdf");
  expect(formData.get("month_key")).toBeNull();
  expect(await screen.findByText("statement.pdf")).toBeInTheDocument();
  expect(screen.getByText(/detected month: 2026-04/i)).toBeInTheDocument();
  expect(screen.getByText(/4 transactions extracted/i)).toBeInTheDocument();
});
