import { render, screen } from "@testing-library/react";

import { ReportHomePage } from "../features/reports/ReportHomePage";

test("report home renders month totals and needs-review count", () => {
  render(<ReportHomePage />);

  expect(screen.getByRole("heading", { name: /monthly report/i })).toBeInTheDocument();
  expect(screen.getByText(/april 2026 summary/i)).toBeInTheDocument();
  expect(screen.getByText(/month total/i)).toBeInTheDocument();
  expect(screen.getByText("$4,280.45")).toBeInTheDocument();
  expect(screen.getByText("3 expenses need review")).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: /category chart/i }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: /merchant summary/i }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: /detailed transactions/i }),
  ).toBeInTheDocument();
  expect(screen.getByText("3 transactions")).toBeInTheDocument();
  expect(screen.getByText("$1,120.00")).toBeInTheDocument();
  expect(screen.getByText("Apr 14 • Software • Platform ops")).toBeInTheDocument();
});
