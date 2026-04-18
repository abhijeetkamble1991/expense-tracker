export type SummaryMetric = {
  label: string;
  value: string;
  tone?: "default" | "warning";
};

export type ReviewExpense = {
  id: string;
  date: string;
  merchant: string;
  amount: string;
  expenseCategory: string;
  source: string;
  status: string;
};

export type CategoryAllocation = {
  category: string;
  amount: string;
  note: string;
};

export type UploadBatch = {
  vendor: string;
  status: string;
  receivedAt: string;
  transactions: number;
};

const reportSummary: SummaryMetric[] = [
  { label: "Month total", value: "$4,280.45" },
  { label: "Imported expenses", value: "186" },
  { label: "Expenses needing review", value: "12", tone: "warning" },
  { label: "Manual entries", value: "8" },
];

const reviewExpenses: ReviewExpense[] = [
  {
    id: "rvw-102",
    date: "Apr 18",
    merchant: "Blue Tokai",
    amount: "$42.80",
    expenseCategory: "Meals",
    source: "Visa ending 2210",
    status: "Needs category check",
  },
  {
    id: "rvw-087",
    date: "Apr 16",
    merchant: "Uber",
    amount: "$18.35",
    expenseCategory: "Local Travel",
    source: "Imported CSV",
    status: "Needs receipt",
  },
  {
    id: "rvw-075",
    date: "Apr 14",
    merchant: "AWS",
    amount: "$320.00",
    expenseCategory: "Software",
    source: "Manual rule",
    status: "Needs split",
  },
];

const spendByCategory: CategoryAllocation[] = [
  {
    category: "Software",
    amount: "$1,680.00",
    note: "Subscription renewals landed this month.",
  },
  {
    category: "Travel",
    amount: "$1,210.10",
    note: "Two client visits are driving the increase.",
  },
  {
    category: "Meals",
    amount: "$524.25",
    note: "Mostly team lunches and airport meals.",
  },
];

const uploadBatches: UploadBatch[] = [
  {
    vendor: "Corporate card CSV",
    status: "Imported",
    receivedAt: "Today, 09:30",
    transactions: 48,
  },
  {
    vendor: "Bank statement PDF",
    status: "Ready for mapping",
    receivedAt: "Yesterday, 18:10",
    transactions: 19,
  },
];

const categoryCoverage = [
  { name: "Meals", ruleCount: 5, lastUpdated: "Apr 12" },
  { name: "Software", ruleCount: 8, lastUpdated: "Apr 09" },
  { name: "Office supplies", ruleCount: 3, lastUpdated: "Apr 02" },
];

const manualEntryPrompts = [
  "Capture cash purchases before month end close.",
  "Use manual entry when an imported record is missing.",
  "Attach context so review can stay lightweight later.",
];

export function useReportSummary() {
  return {
    monthLabel: "April 2026",
    metrics: reportSummary,
    needsReviewCount: 12,
    spendByCategory,
  };
}

export function useReviewQueue() {
  return {
    expenses: reviewExpenses,
    totalPending: reviewExpenses.length,
  };
}

export function useUploadBatches() {
  return uploadBatches;
}

export function useCategoryCoverage() {
  return categoryCoverage;
}

export function useManualEntryPrompts() {
  return manualEntryPrompts;
}
