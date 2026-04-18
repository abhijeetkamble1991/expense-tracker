import { useQuery } from "@tanstack/react-query";

import { api } from "../../lib/api";

export type SummaryMetric = {
  label: string;
  value: string;
  tone?: "default" | "warning";
};

export type ApiTransaction = {
  id: number;
  transaction_date: string;
  amount: string;
  description: string;
  merchant: string;
  month_key: string;
  expense_category: "common" | "personal";
  spend_category_id: number | null;
  source_type: string;
  review_status: "needs_review" | "reviewed" | "flagged";
  duplicate_suspected: boolean;
  duplicate_reason: string | null;
  notes: string | null;
};

export type ReviewExpense = ApiTransaction;

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
  id: number;
  merchant: string;
  amount: string;
  detail: string;
};

export type SpendCategory = {
  id: number;
  name: string;
  is_active: boolean;
};

export type ImportBatch = {
  id: number;
  month_key: string;
  source_type: string;
  original_filename: string;
  parser_type: string;
  parse_status: string;
  extracted_count: number;
  skipped_count: number;
  flagged_count: number;
  warnings: string[];
  uploaded_at: string;
};

export type MonthlyReportResponse = {
  month_key: string;
  totals: Record<string, string>;
  by_source: Record<string, string>;
  by_merchant: Record<string, string>;
  by_spend_category: Record<string, string>;
  transactions: ApiTransaction[];
};

type TransactionFilters = {
  month_key?: string;
  review_status?: ApiTransaction["review_status"];
  source_type?: string;
  expense_category?: ApiTransaction["expense_category"];
  spend_category_id?: number;
};

const spendCategoryNotes: Record<string, string> = {
  "Platform ops": "Infrastructure and tooling that supports delivery.",
  "Client delivery": "Travel, meals, and direct delivery costs.",
  "Revenue ops": "Processing and collections related spend.",
};

export function formatCurrency(amount: number | string) {
  const numericAmount = typeof amount === "string" ? Number(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(numericAmount);
}

export function formatExpenseCategory(
  category: ApiTransaction["expense_category"],
) {
  return category === "common" ? "Common" : "Personal";
}

export function formatMonthSummary(monthKey: string) {
  return `${monthKey} summary`;
}

export function formatTransactionDetail(
  transaction: ApiTransaction,
  spendCategories: SpendCategory[],
) {
  const spendCategoryName =
    spendCategories.find((category) => category.id === transaction.spend_category_id)
      ?.name ?? "Unassigned";

  return `${transaction.transaction_date} • ${transaction.expense_category} • ${spendCategoryName}`;
}

export function buildReportMetrics(
  report: MonthlyReportResponse,
): SummaryMetric[] {
  const importedExpenses = report.transactions.filter(
    (transaction) => transaction.source_type !== "manual",
  ).length;
  const manualEntries = report.transactions.filter(
    (transaction) => transaction.source_type === "manual",
  ).length;
  const needsReviewCount = report.transactions.filter(
    (transaction) => transaction.review_status !== "reviewed",
  ).length;

  return [
    { label: "Month total", value: formatCurrency(report.totals.overall ?? "0") },
    { label: "Imported expenses", value: String(importedExpenses) },
    {
      label: "Expenses needing review",
      value: String(needsReviewCount),
      tone: "warning",
    },
    { label: "Manual entries", value: String(manualEntries) },
  ];
}

export function buildCategoryAllocations(
  report: MonthlyReportResponse,
  _spendCategories: SpendCategory[],
): CategoryAllocation[] {
  return Object.entries(report.by_spend_category)
    .map(([categoryName, amount]) => ({
      category: categoryName,
      amount: formatCurrency(amount),
      note:
        spendCategoryNotes[categoryName] ??
        "Spend grouped from the current month report.",
    }))
    .sort(
      (left, right) =>
        Number(right.amount.replace(/[$,]/g, "")) -
        Number(left.amount.replace(/[$,]/g, "")),
    );
}

export function buildMerchantSummary(
  report: MonthlyReportResponse,
): MerchantSummary[] {
  return Object.entries(report.by_merchant)
    .map(([merchant, total]) => ({
      merchant,
      total: formatCurrency(total),
      transactionCount: report.transactions.filter(
        (transaction) => transaction.merchant === merchant,
      ).length,
    }))
    .sort((left, right) => Number(right.total.replace(/[$,]/g, "")) - Number(left.total.replace(/[$,]/g, "")));
}

export function buildDetailedTransactions(
  report: MonthlyReportResponse,
  spendCategories: SpendCategory[],
): DetailedTransaction[] {
  return report.transactions.map((transaction) => ({
    id: transaction.id,
    merchant: transaction.merchant,
    amount: formatCurrency(transaction.amount),
    detail: formatTransactionDetail(transaction, spendCategories),
  }));
}

export function useMonths() {
  return useQuery({
    queryKey: ["months"],
    queryFn: async () => {
      const response = await api.get<string[]>("/months");
      return response.data;
    },
  });
}

export function useSpendCategories() {
  return useQuery({
    queryKey: ["spend-categories"],
    queryFn: async () => {
      const response = await api.get<SpendCategory[]>("/spend-categories");
      return response.data;
    },
  });
}

export function useMonthReport(monthKey: string | null) {
  return useQuery({
    enabled: monthKey !== null,
    queryKey: ["month-report", monthKey],
    queryFn: async () => {
      const response = await api.post<MonthlyReportResponse>(
        `/reports/${monthKey}/regenerate`,
      );
      return response.data;
    },
  });
}

export function useTransactions(filters: TransactionFilters) {
  return useQuery({
    queryKey: ["transactions", filters],
    queryFn: async () => {
      const response = await api.get<ApiTransaction[]>("/transactions", {
        params: filters,
      });
      return response.data;
    },
  });
}

export function buildReviewPayload({
  merchant,
  expenseCategory,
  reviewStatus,
  spendCategoryId,
}: {
  merchant: string;
  expenseCategory: ApiTransaction["expense_category"];
  reviewStatus: ApiTransaction["review_status"];
  spendCategoryId: number | null;
}) {
  return {
    merchant,
    expense_category: expenseCategory,
    review_status: reviewStatus,
    ...(spendCategoryId !== null ? { spend_category_id: spendCategoryId } : {}),
  };
}
