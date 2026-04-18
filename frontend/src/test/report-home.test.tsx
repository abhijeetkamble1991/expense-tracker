import { render, screen } from "@testing-library/react";

import { ReportHomePage } from "../features/reports/ReportHomePage";

test("report home renders month totals and needs-review count", () => {
  render(<ReportHomePage />);

  expect(
    screen.getByRole("heading", { name: /april 2026 summary/i }),
  ).toBeInTheDocument();
  expect(screen.getByText("$4,280.45")).toBeInTheDocument();
  expect(screen.getByText("12 expenses need review")).toBeInTheDocument();
});
