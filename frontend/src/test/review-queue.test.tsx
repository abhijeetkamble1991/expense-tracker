import { render, screen, within } from "@testing-library/react";

import { ReviewQueuePage } from "../features/review/ReviewQueuePage";

test("review queue shows a table with expense category data", () => {
  render(<ReviewQueuePage />);

  const table = screen.getByRole("table", { name: /expenses pending review/i });
  const categoryHeader = within(table).getByRole("columnheader", {
    name: /expense category/i,
  });

  expect(categoryHeader).toBeInTheDocument();
  expect(within(table).getByText("Meals")).toBeInTheDocument();
});
