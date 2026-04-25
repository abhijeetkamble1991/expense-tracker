import { useQueries, useQuery } from "@tanstack/react-query";

import { api } from "../../lib/api";

export type SummaryMetric = {
  label: string;
  value: string;
  tone?: "default" | "warning";
  deltaLabel?: string;
  deltaDirection?: "up" | "down" | "new" | "flat";
  secondaryValue?: string;
};

export type ApiTransaction = {
  id: number;
  transaction_date: string;
  transaction_time?: string | null;
  amount: string;
  description: string;
  merchant: string;
  month_key: string;
  expense_category: "common" | "personal";
  spend_category_id: number | null;
  reimburse: boolean;
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

export type ExpenseSplitSegment = {
  label: string;
  amount: string;
  percentage: string;
  rawPercentage: number;
};

export type ReportCategoryBar = {
  category: string;
  amount: string;
  percentage: string;
  rawPercentage: number;
};

export type CategoryComparisonRow = {
  category: string;
  currentAmount: string;
  previousAmount: string;
  changeLabel: string;
  absoluteChangeLabel: string;
  statusLabel: string;
  comparisonNote: string;
  direction: "new" | "up" | "down" | "flat";
  currentRawAmount: number;
};

export type TrendPoint = {
  monthKey: string;
  monthLabel: string;
  overallAmount: string;
  commonAmount: string;
  overallRawAmount: number;
  commonRawAmount: number;
};

export type MerchantSummary = {
  merchant: string;
  total: string;
  transactionCount: number;
};

export type SourceSummary = {
  source: string;
  total: string;
};

export type DetailedTransaction = {
  id: number;
  transaction_date?: string;
  merchant: string;
  amount: string;
  detail: string;
};

export type SpendCategory = {
  id: number;
  name: string;
  is_active: boolean;
};

export type UserSettings = {
  username: string;
  display_name: string;
  created_at: string;
  currency_code: string;
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
  unresolved_count: number;
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

export type ExpenseCategoryFilter = "all" | ApiTransaction["expense_category"];

const spendCategoryNotes: Record<string, string> = {
  "Platform ops": "Infrastructure and tooling that supports delivery.",
  "Client delivery": "Travel, meals, and direct delivery costs.",
  "Revenue ops": "Processing and collections related spend.",
};

function parseAmount(value: string | number) {
  return typeof value === "string" ? Number(value) : value;
}

export function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

export function formatCurrency(amount: number | string, currencyCode = "USD") {
  const numericAmount = typeof amount === "string" ? Number(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
  }).format(numericAmount);
}

export function formatExpenseCategory(
  category: ApiTransaction["expense_category"],
) {
  return category === "common" ? "Common" : "Personal";
}

export function getSpendCategoryName(
  transaction: Pick<ApiTransaction, "spend_category_id">,
  spendCategories: SpendCategory[],
) {
  return (
    spendCategories.find((category) => category.id === transaction.spend_category_id)?.name ??
    "Uncategorized"
  );
}

export function formatMonthSummary(monthKey: string) {
  return `${monthKey} summary`;
}

const monthLabelFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
});

const shortMonthLabelFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
});

export function getYearFromMonthKey(monthKey: string) {
  return monthKey.slice(0, 4);
}

export function formatMonthOptionLabel(monthKey: string) {
  const [year, month] = monthKey.split("-");
  return monthLabelFormatter.format(new Date(Number(year), Number(month) - 1, 1));
}

export function formatShortMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-");
  return shortMonthLabelFormatter.format(
    new Date(Number(year), Number(month) - 1, 1),
  );
}

export function getPreviousMonthKey(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const previousMonthDate = new Date(year, month - 2, 1);
  const previousYear = previousMonthDate.getFullYear();
  const previousMonth = String(previousMonthDate.getMonth() + 1).padStart(2, "0");
  return `${previousYear}-${previousMonth}`;
}

export function getTrendMonthKeys(
  months: string[],
  currentMonthKey: string,
  limit = 6,
) {
  const currentMonthIndex = months.indexOf(currentMonthKey);
  if (currentMonthIndex === -1) {
    return [];
  }

  return months.slice(currentMonthIndex, currentMonthIndex + limit).reverse();
}

export function buildYearOptions(months: string[]) {
  return Array.from(new Set(months.map(getYearFromMonthKey)));
}

export function getMonthsForYear(months: string[], year: string) {
  return months.filter((monthKey) => getYearFromMonthKey(monthKey) === year);
}

export function formatTransactionDetail(
  transaction: ApiTransaction,
  spendCategories: SpendCategory[],
) {
  const spendCategoryName =
    spendCategories.find((category) => category.id === transaction.spend_category_id)
      ?.name ?? "Unassigned";

  return `${formatExpenseCategory(transaction.expense_category)} • ${spendCategoryName}`;
}

export function buildReportMetrics(
  report: MonthlyReportResponse,
  previousReport: MonthlyReportResponse | null | undefined,
  currencyCode = "USD",
): SummaryMetric[] {
  const needsReviewCount = report.unresolved_count;
  const currentReimburseTotal =
    parseAmount(report.totals.common_reimburse ?? "0") +
    parseAmount(report.totals.personal_reimburse ?? "0");
  const previousReimburseTotal = previousReport
    ? parseAmount(previousReport.totals.common_reimburse ?? "0") +
      parseAmount(previousReport.totals.personal_reimburse ?? "0")
    : undefined;
  const previousMonthLabel = previousReport
    ? formatShortMonthLabel(previousReport.month_key)
    : null;

  function buildDelta(
    currentValue: string | undefined,
    previousValue: string | undefined,
  ): Pick<SummaryMetric, "deltaLabel" | "deltaDirection"> {
    if (!previousReport || !previousMonthLabel) {
      return {};
    }

    const currentAmount = parseAmount(currentValue ?? "0");
    const previousAmount = parseAmount(previousValue ?? "0");

    if (previousAmount === 0 && currentAmount > 0) {
      return {
        deltaLabel: `New vs ${previousMonthLabel}`,
        deltaDirection: "new",
      };
    }

    if (previousAmount === 0 && currentAmount === 0) {
      return {
        deltaLabel: `No activity vs ${previousMonthLabel}`,
        deltaDirection: "flat",
      };
    }

    const percentChange = Math.abs(((currentAmount - previousAmount) / previousAmount) * 100);

    if (currentAmount > previousAmount) {
      return {
        deltaLabel: `↑ ${formatPercent(percentChange)} vs ${previousMonthLabel}`,
        deltaDirection: "up",
      };
    }

    if (currentAmount < previousAmount) {
      return {
        deltaLabel: `↓ ${formatPercent(percentChange)} vs ${previousMonthLabel}`,
        deltaDirection: "down",
      };
    }

    return {
      deltaLabel: `No change vs ${previousMonthLabel}`,
      deltaDirection: "flat",
    };
  }

  return [
    {
      label: "Monthly Total",
      value: formatCurrency(report.totals.overall ?? "0", currencyCode),
      ...buildDelta(report.totals.overall, previousReport?.totals.overall),
    },
    {
      label: "Common Total",
      value: formatCurrency(report.totals.common ?? "0", currencyCode),
      ...buildDelta(report.totals.common, previousReport?.totals.common),
    },
    {
      label: "Personal Total",
      value: formatCurrency(report.totals.personal ?? "0", currencyCode),
      ...buildDelta(report.totals.personal, previousReport?.totals.personal),
    },
    {
      label: "Expenses Need Review",
      value: String(needsReviewCount),
      tone: "warning",
    },
    {
      label: "Reimburse",
      value: formatCurrency(currentReimburseTotal, currencyCode),
      ...buildDelta(
        String(currentReimburseTotal.toFixed(2)),
        previousReimburseTotal?.toFixed(2),
      ),
    },
  ];
}

export function buildCategoryAllocations(
  report: MonthlyReportResponse,
  _spendCategories: SpendCategory[],
  currencyCode = "USD",
): CategoryAllocation[] {
  return Object.entries(report.by_spend_category)
    .map(([categoryName, amount]) => ({
      category: categoryName,
      amount: formatCurrency(amount, currencyCode),
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

export function buildExpenseSplit(
  report: MonthlyReportResponse,
  currencyCode = "USD",
): ExpenseSplitSegment[] {
  const overall = parseAmount(report.totals.overall ?? "0");
  const common = parseAmount(report.totals.common ?? "0");
  const personal = parseAmount(report.totals.personal ?? "0");

  return [
    {
      label: "Common",
      amount: formatCurrency(common, currencyCode),
      percentage: `${formatPercent(overall === 0 ? 0 : (common / overall) * 100)} of total`,
      rawPercentage: overall === 0 ? 0 : (common / overall) * 100,
    },
    {
      label: "Personal",
      amount: formatCurrency(personal, currencyCode),
      percentage: `${formatPercent(overall === 0 ? 0 : (personal / overall) * 100)} of total`,
      rawPercentage: overall === 0 ? 0 : (personal / overall) * 100,
    },
  ];
}

export function buildCategoryBars(
  report: MonthlyReportResponse,
  spendCategories: SpendCategory[],
  currencyCode = "USD",
  expenseCategoryFilter: ExpenseCategoryFilter = "all",
): ReportCategoryBar[] {
  const filteredTransactions = report.transactions.filter((transaction) =>
    expenseCategoryFilter === "all"
      ? true
      : transaction.expense_category === expenseCategoryFilter,
  );
  const baseTotal = filteredTransactions.reduce(
    (sum, transaction) => sum + parseAmount(transaction.amount),
    0,
  );
  const totals = new Map<string, number>();

  filteredTransactions.forEach((transaction) => {
    const categoryName = getSpendCategoryName(transaction, spendCategories);
    totals.set(categoryName, (totals.get(categoryName) ?? 0) + parseAmount(transaction.amount));
  });

  return [...totals.entries()]
    .map(([category, amount]) => ({
      category,
      amount: formatCurrency(amount, currencyCode),
      percentage: `${formatPercent(baseTotal === 0 ? 0 : (amount / baseTotal) * 100)} of ${expenseCategoryFilter === "all" ? "month spend" : `${expenseCategoryFilter} spend`}`,
      rawPercentage: baseTotal === 0 ? 0 : (amount / baseTotal) * 100,
    }))
    .sort((left, right) => right.rawPercentage - left.rawPercentage);
}

function buildCategoryTotalsMap(
  report: MonthlyReportResponse | null | undefined,
  spendCategories: SpendCategory[],
  expenseCategoryFilter: Exclude<ExpenseCategoryFilter, "all">,
) {
  const totals = new Map<string, number>();

  if (!report) {
    return totals;
  }

  report.transactions
    .filter((transaction) => transaction.expense_category === expenseCategoryFilter)
    .forEach((transaction) => {
      const categoryName = getSpendCategoryName(transaction, spendCategories);
      totals.set(categoryName, (totals.get(categoryName) ?? 0) + parseAmount(transaction.amount));
    });

  return totals;
}

export function buildCategoryComparisonRows(
  currentReport: MonthlyReportResponse | null | undefined,
  previousReport: MonthlyReportResponse | null | undefined,
  spendCategories: SpendCategory[],
  currencyCode = "USD",
  expenseCategoryFilter: Exclude<ExpenseCategoryFilter, "all"> = "common",
  previousMonthKey?: string | null,
): CategoryComparisonRow[] {
  const currentTotals = buildCategoryTotalsMap(
    currentReport,
    spendCategories,
    expenseCategoryFilter,
  );
  const previousTotals = buildCategoryTotalsMap(
    previousReport,
    spendCategories,
    expenseCategoryFilter,
  );
  const categories = new Set([
    ...currentTotals.keys(),
    ...previousTotals.keys(),
  ]);

  return [...categories]
    .map((category) => {
      const currentAmount = currentTotals.get(category) ?? 0;
      const previousAmount = previousTotals.get(category) ?? 0;
      const absoluteDifference = currentAmount - previousAmount;
      const previousMonthLabel = previousMonthKey
        ? formatShortMonthLabel(previousMonthKey)
        : "last month";

      let changeLabel = "No change";
      let absoluteChangeLabel = "₹0.00 change";
      let statusLabel = "No change";
      let comparisonNote = "Unchanged from last month";
      let direction: CategoryComparisonRow["direction"] = "flat";

      if (previousAmount === 0 && currentAmount > 0) {
        changeLabel = "New";
        absoluteChangeLabel = `${formatCurrency(currentAmount, currencyCode)} added this month`;
        statusLabel = "New";
        comparisonNote = `No spend in ${previousMonthLabel}`;
        direction = "new";
      } else if (previousAmount > 0 && currentAmount > previousAmount) {
        changeLabel = `Increased by ${formatPercent(((currentAmount - previousAmount) / previousAmount) * 100)}`;
        absoluteChangeLabel = `+${formatCurrency(absoluteDifference, currencyCode)} vs last month`;
        statusLabel = "Increased";
        comparisonNote = "Higher than last month";
        direction = "up";
      } else if (previousAmount > 0 && currentAmount < previousAmount) {
        changeLabel = `Decreased by ${formatPercent(((previousAmount - currentAmount) / previousAmount) * 100)}`;
        absoluteChangeLabel = `-${formatCurrency(previousAmount - currentAmount, currencyCode)} vs last month`;
        statusLabel = currentAmount === 0 ? "Dropped to zero" : "Decreased";
        comparisonNote = currentAmount === 0 ? "No spend this month" : "Lower than last month";
        direction = "down";
      } else if (previousAmount === currentAmount && currentAmount === 0) {
        changeLabel = "No activity";
        absoluteChangeLabel = "₹0.00 change";
        statusLabel = "No activity";
        comparisonNote = `No spend in ${previousMonthLabel}`;
      }

      return {
        category,
        currentAmount: formatCurrency(currentAmount, currencyCode),
        previousAmount: formatCurrency(previousAmount, currencyCode),
        changeLabel,
        absoluteChangeLabel,
        statusLabel,
        comparisonNote,
        direction,
        currentRawAmount: currentAmount,
      };
    })
    .sort((left, right) => right.currentRawAmount - left.currentRawAmount);
}

export function buildMerchantSummary(
  report: MonthlyReportResponse,
  currencyCode = "USD",
): MerchantSummary[] {
  return Object.entries(report.by_merchant)
    .map(([merchant, total]) => ({
      merchant,
      total: formatCurrency(total, currencyCode),
      transactionCount: report.transactions.filter(
        (transaction) => transaction.merchant === merchant,
      ).length,
    }))
    .sort((left, right) => Number(right.total.replace(/[$,]/g, "")) - Number(left.total.replace(/[$,]/g, "")));
}

export function buildSourceSummary(
  report: MonthlyReportResponse,
  currencyCode = "USD",
): SourceSummary[] {
  return Object.entries(report.by_source)
    .map(([source, total]) => ({
      source,
      total: formatCurrency(total, currencyCode),
    }))
    .sort(
      (left, right) =>
        Number(right.total.replace(/[$,]/g, "")) -
        Number(left.total.replace(/[$,]/g, "")),
    );
}

export function buildDetailedTransactions(
  report: MonthlyReportResponse,
  spendCategories: SpendCategory[],
  currencyCode = "USD",
): DetailedTransaction[] {
  return report.transactions.map((transaction) => ({
    id: transaction.id,
    transaction_date: transaction.transaction_date,
    merchant: transaction.merchant,
    amount: formatCurrency(transaction.amount, currencyCode),
    detail: formatTransactionDetail(transaction, spendCategories),
  }));
}

export function buildDetailedTransactionsFromList(
  transactions: ApiTransaction[],
  spendCategories: SpendCategory[],
  currencyCode = "USD",
): DetailedTransaction[] {
  return transactions.map((transaction) => ({
    id: transaction.id,
    transaction_date: transaction.transaction_date,
    merchant: transaction.merchant,
    amount: formatCurrency(transaction.amount, currencyCode),
    detail: formatTransactionDetail(transaction, spendCategories),
  }));
}

export function buildTopExpenses(
  report: MonthlyReportResponse,
  spendCategories: SpendCategory[],
  currencyCode = "USD",
  limit = 10,
): DetailedTransaction[] {
  return [...report.transactions]
    .sort((left, right) => parseAmount(right.amount) - parseAmount(left.amount))
    .slice(0, limit)
    .map((transaction) => ({
      id: transaction.id,
      transaction_date: transaction.transaction_date,
      merchant: transaction.merchant,
      amount: formatCurrency(transaction.amount, currencyCode),
      detail: formatTransactionDetail(transaction, spendCategories),
    }));
}

export function buildTrendPoints(
  reports: Array<MonthlyReportResponse | null | undefined>,
  currencyCode = "USD",
): TrendPoint[] {
  return reports
    .filter((report): report is MonthlyReportResponse => Boolean(report))
    .map((report) => ({
      monthKey: report.month_key,
      monthLabel: formatShortMonthLabel(report.month_key),
      overallAmount: formatCurrency(report.totals.overall ?? "0", currencyCode),
      commonAmount: formatCurrency(report.totals.common ?? "0", currencyCode),
      overallRawAmount: parseAmount(report.totals.overall ?? "0"),
      commonRawAmount: parseAmount(report.totals.common ?? "0"),
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

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const response = await api.get<UserSettings>("/settings");
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

export function useMonthReports(monthKeys: string[]) {
  return useQueries({
    queries: monthKeys.map((monthKey) => ({
      enabled: Boolean(monthKey),
      queryKey: ["month-report", monthKey],
      queryFn: async () => {
        const response = await api.post<MonthlyReportResponse>(
          `/reports/${monthKey}/regenerate`,
        );
        return response.data;
      },
    })),
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
  reimburse,
}: {
  merchant: string;
  expenseCategory: ApiTransaction["expense_category"];
  reviewStatus: ApiTransaction["review_status"];
  spendCategoryId: number | null;
  reimburse: boolean;
}) {
  return {
    merchant,
    expense_category: expenseCategory,
    review_status: reviewStatus,
    reimburse: expenseCategory === "common" ? reimburse : false,
    ...(spendCategoryId !== null ? { spend_category_id: spendCategoryId } : {}),
  };
}
