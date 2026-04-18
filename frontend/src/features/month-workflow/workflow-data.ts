export type SummaryMetric = {
  label: string;
  value: string;
  tone?: "default" | "warning";
};

export type ReviewExpense = {
  id: string;
  date: string;
  merchant: string;
  expenseCategory: string;
  spendCategory: string;
  status: string;
};

export type CategoryAllocation = {
  category: string;
  amount: string;
  note: string;
};

export type MerchantSummary = {
  merchant: string;
  total: string;
  transactionCount: number;
};

export type DetailedTransaction = {
  id: string;
  merchant: string;
  amount: string;
  detail: string;
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
    expenseCategory: "Meals",
    spendCategory: "Client delivery",
    status: "Needs category check",
  },
  {
    id: "rvw-087",
    date: "Apr 16",
    merchant: "Uber",
    expenseCategory: "Local Travel",
    spendCategory: "Field visits",
    status: "Needs receipt",
  },
  {
    id: "rvw-075",
    date: "Apr 14",
    merchant: "AWS",
    expenseCategory: "Software",
    spendCategory: "Platform ops",
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

const merchantSummary: MerchantSummary[] = [
  { merchant: "AWS", total: "$1,120.00", transactionCount: 3 },
  { merchant: "Blue Tokai", total: "$214.60", transactionCount: 5 },
  { merchant: "Uber", total: "$186.40", transactionCount: 7 },
];

const detailedTransactions: DetailedTransaction[] = [
  {
    id: "txn-447",
    merchant: "AWS",
    amount: "$320.00",
    detail: "Apr 14 • Software • Platform ops",
  },
  {
    id: "txn-451",
    merchant: "Blue Tokai",
    amount: "$42.80",
    detail: "Apr 18 • Meals • Client delivery",
  },
  {
    id: "txn-455",
    merchant: "Uber",
    amount: "$18.35",
    detail: "Apr 16 • Local Travel • Field visits",
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
    merchantSummary,
    detailedTransactions,
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
