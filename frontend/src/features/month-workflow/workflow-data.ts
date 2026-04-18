export type SummaryMetric = {
  label: string;
  value: string;
  tone?: "default" | "warning";
};

type WorkflowTransaction = {
  id: string;
  date: string;
  merchant: string;
  amount: number;
  expenseCategory: string;
  spendCategory: string;
  source: "imported" | "manual";
  status: string;
  needsReview: boolean;
};

export type ReviewExpense = Pick<
  WorkflowTransaction,
  "id" | "date" | "merchant" | "expenseCategory" | "spendCategory" | "status"
>;

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

const workflowTransactions: WorkflowTransaction[] = [
  {
    id: "rvw-102",
    date: "Apr 18",
    merchant: "Blue Tokai",
    amount: 42.8,
    expenseCategory: "Meals",
    spendCategory: "Client delivery",
    source: "imported",
    status: "Needs category check",
    needsReview: true,
  },
  {
    id: "rvw-087",
    date: "Apr 16",
    merchant: "Uber",
    amount: 18.35,
    expenseCategory: "Local Travel",
    spendCategory: "Field visits",
    source: "imported",
    status: "Needs receipt",
    needsReview: true,
  },
  {
    id: "rvw-075",
    date: "Apr 14",
    merchant: "AWS",
    amount: 320,
    expenseCategory: "Software",
    spendCategory: "Platform ops",
    source: "manual",
    status: "Needs split",
    needsReview: true,
  },
  {
    id: "txn-446",
    date: "Apr 13",
    merchant: "AWS",
    amount: 400,
    expenseCategory: "Software",
    spendCategory: "Platform ops",
    source: "imported",
    status: "Ready",
    needsReview: false,
  },
  {
    id: "txn-445",
    date: "Apr 08",
    merchant: "AWS",
    amount: 400,
    expenseCategory: "Software",
    spendCategory: "Platform ops",
    source: "imported",
    status: "Ready",
    needsReview: false,
  },
  {
    id: "txn-452",
    date: "Apr 11",
    merchant: "Blue Tokai",
    amount: 171.8,
    expenseCategory: "Meals",
    spendCategory: "Client delivery",
    source: "manual",
    status: "Ready",
    needsReview: false,
  },
  {
    id: "txn-456",
    date: "Apr 09",
    merchant: "Uber",
    amount: 168.05,
    expenseCategory: "Local Travel",
    spendCategory: "Field visits",
    source: "imported",
    status: "Ready",
    needsReview: false,
  },
  {
    id: "txn-460",
    date: "Apr 07",
    merchant: "Stripe",
    amount: 980.25,
    expenseCategory: "Processing Fees",
    spendCategory: "Revenue ops",
    source: "imported",
    status: "Ready",
    needsReview: false,
  },
  {
    id: "txn-463",
    date: "Apr 05",
    merchant: "Notion",
    amount: 699.2,
    expenseCategory: "Software",
    spendCategory: "Back office",
    source: "manual",
    status: "Ready",
    needsReview: false,
  },
  {
    id: "txn-468",
    date: "Apr 03",
    merchant: "Delta",
    amount: 1080,
    expenseCategory: "Travel",
    spendCategory: "Client delivery",
    source: "imported",
    status: "Ready",
    needsReview: false,
  },
];

const uploadBatches: UploadBatch[] = [
  {
    vendor: "Corporate card CSV",
    status: "Imported",
    receivedAt: "Apr 18, 2026 09:30",
    transactions: 48,
  },
  {
    vendor: "Bank statement PDF",
    status: "Ready for mapping",
    receivedAt: "Apr 17, 2026 18:10",
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

const categoryNotes: Record<string, string> = {
  Software: "Subscription renewals and tooling spend are concentrated here.",
  Travel: "Client travel is the main driver this month.",
  Meals: "Team lunches and client meetings are grouped here.",
  "Local Travel": "Short-haul rides tied to field visits.",
  "Processing Fees": "Payment platform costs linked to collections.",
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function parseCurrency(currency: string) {
  return Number(currency.replace(/[$,]/g, ""));
}

export function useReportSummary() {
  const reviewExpenses: ReviewExpense[] = workflowTransactions
    .filter((transaction) => transaction.needsReview)
    .map(({ id, date, merchant, expenseCategory, spendCategory, status }) => ({
      id,
      date,
      merchant,
      expenseCategory,
      spendCategory,
      status,
    }));

  const needsReviewCount = reviewExpenses.length;
  const monthTotal = workflowTransactions.reduce(
    (total, transaction) => total + transaction.amount,
    0,
  );
  const importedExpenses = workflowTransactions.filter(
    (transaction) => transaction.source === "imported",
  ).length;
  const manualEntries = workflowTransactions.filter(
    (transaction) => transaction.source === "manual",
  ).length;

  const spendByCategory: CategoryAllocation[] = Object.values(
    workflowTransactions.reduce<Record<string, CategoryAllocation>>(
      (accumulator, transaction) => {
        const existing = accumulator[transaction.expenseCategory];

        if (existing) {
          existing.amount = formatCurrency(
            parseCurrency(existing.amount) + transaction.amount,
          );
          return accumulator;
        }

        accumulator[transaction.expenseCategory] = {
          category: transaction.expenseCategory,
          amount: formatCurrency(transaction.amount),
          note:
            categoryNotes[transaction.expenseCategory] ??
            "Spend grouped for monthly reporting.",
        };

        return accumulator;
      },
      {},
    ),
  )
    .sort((left, right) => parseCurrency(right.amount) - parseCurrency(left.amount))
    .slice(0, 3);

  const merchantSummary: MerchantSummary[] = Object.values(
    workflowTransactions.reduce<Record<string, MerchantSummary>>(
      (accumulator, transaction) => {
        const existing = accumulator[transaction.merchant];

        if (existing) {
          existing.total = formatCurrency(
            parseCurrency(existing.total) + transaction.amount,
          );
          existing.transactionCount += 1;
          return accumulator;
        }

        accumulator[transaction.merchant] = {
          merchant: transaction.merchant,
          total: formatCurrency(transaction.amount),
          transactionCount: 1,
        };

        return accumulator;
      },
      {},
    ),
  )
    .sort((left, right) => parseCurrency(right.total) - parseCurrency(left.total))
    .slice(0, 3);

  const detailedTransactions: DetailedTransaction[] = workflowTransactions
    .slice(0, 3)
    .map((transaction) => ({
      id: transaction.id,
      merchant: transaction.merchant,
      amount: formatCurrency(transaction.amount),
      detail: `${transaction.date} • ${transaction.expenseCategory} • ${transaction.spendCategory}`,
    }));

  const metrics: SummaryMetric[] = [
    { label: "Month total", value: formatCurrency(monthTotal) },
    { label: "Imported expenses", value: String(importedExpenses) },
    {
      label: "Expenses needing review",
      value: String(needsReviewCount),
      tone: "warning",
    },
    { label: "Manual entries", value: String(manualEntries) },
  ];

  return {
    monthLabel: "April 2026",
    metrics,
    needsReviewCount,
    spendByCategory,
    merchantSummary,
    detailedTransactions,
  };
}

export function useReviewQueue() {
  const expenses: ReviewExpense[] = workflowTransactions
    .filter((transaction) => transaction.needsReview)
    .map(({ id, date, merchant, expenseCategory, spendCategory, status }) => ({
      id,
      date,
      merchant,
      expenseCategory,
      spendCategory,
      status,
    }));

  return {
    expenses,
    totalPending: expenses.length,
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
