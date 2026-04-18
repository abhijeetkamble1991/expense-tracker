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

  await user.type(screen.getByLabelText("Month"), "2026-04");
  await user.selectOptions(screen.getByLabelText("Source type"), "credit_card_pdf");
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
  expect(await screen.findByText("statement.pdf")).toBeInTheDocument();
  expect(screen.getByText(/4 transactions extracted/i)).toBeInTheDocument();
});
