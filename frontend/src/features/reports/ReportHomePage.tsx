import { type CSSProperties, useEffect, useState } from "react";

import {
  buildCategoryBars,
  buildCategoryComparisonRows,
  buildDetailedTransactionsFromList,
  buildExpenseSplit,
  buildReportMetrics,
  buildTrendPoints,
  buildTopExpenses,
  ExpenseCategoryFilter,
  formatMonthOptionLabel,
  formatShortMonthLabel,
  formatMonthSummary,
  getMonthsForYear,
  getPreviousMonthKey,
  getTrendMonthKeys,
  getSpendCategoryName,
  getYearFromMonthKey,
  buildYearOptions,
  useMonthReports,
  useMonths,
  useSettings,
  useSpendCategories,
} from "../month-workflow/workflow-data";

type ReportTypeFilter = Exclude<ExpenseCategoryFilter, "all">;

const REPORT_COLORS = {
  common: "#6d28d9",
  personal: "#d946ef",
};

function formatTransactionDateLabel(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function formatTransactionDateMeta(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function ReportHomePage() {
  const { data: months = [], isLoading: isLoadingMonths } = useMonths();
  const { data: spendCategories = [] } = useSpendCategories();
  const { data: settings } = useSettings();
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedCategorySpendType, setSelectedCategorySpendType] =
    useState<ReportTypeFilter>("common");
  const [selectedComparisonType, setSelectedComparisonType] =
    useState<ReportTypeFilter>("common");
  const [selectedExpenseListType, setSelectedExpenseListType] =
    useState<ReportTypeFilter>("common");
  const [selectedExpenseListCategory, setSelectedExpenseListCategory] =
    useState<string>("all");
  const currencyCode = settings?.currency_code ?? "USD";

  useEffect(() => {
    if (months.length === 0) {
      if (selectedMonth) {
        setSelectedMonth("");
      }
      if (selectedYear) {
        setSelectedYear("");
      }
      return;
    }

    const nextMonth = months.includes(selectedMonth) ? selectedMonth : months[0];
    if (nextMonth !== selectedMonth) {
      setSelectedMonth(nextMonth);
      return;
    }

    const nextYear = getYearFromMonthKey(nextMonth);
    if (selectedYear !== nextYear) {
      setSelectedYear(nextYear);
    }
  }, [months, selectedMonth, selectedYear]);

  const yearOptions = buildYearOptions(months);
  const monthOptions = selectedYear ? getMonthsForYear(months, selectedYear) : [];
  const currentMonth = monthOptions.includes(selectedMonth)
    ? selectedMonth
    : monthOptions[0] ?? selectedMonth;
  const previousMonth = currentMonth ? getPreviousMonthKey(currentMonth) : null;
  const trendMonthKeys = currentMonth ? getTrendMonthKeys(months, currentMonth) : [];
  const monthReportQueries = useMonthReports(trendMonthKeys);
  const isLoadingTrendReports = monthReportQueries.some((query) => query.isLoading);
  const availableReports = monthReportQueries.flatMap((query) =>
    query.data ? [query.data] : [],
  );
  const report =
    availableReports.find((monthReport) => monthReport.month_key === currentMonth) ??
    null;
  const previousReport =
    availableReports.find((monthReport) => monthReport.month_key === previousMonth) ??
    null;

  const metrics = report
    ? buildReportMetrics(report, previousReport, currencyCode)
    : [];
  const expenseSplit = report ? buildExpenseSplit(report, currencyCode) : [];
  const categoryBars = report
    ? buildCategoryBars(
        report,
        spendCategories,
        currencyCode,
        selectedCategorySpendType,
      )
    : [];
  const comparisonRows = report
    ? buildCategoryComparisonRows(
        report,
        previousReport,
        spendCategories,
        currencyCode,
        selectedComparisonType,
        previousMonth,
      )
    : [];
  const topExpenses = report
    ? buildTopExpenses(report, spendCategories, currencyCode)
    : [];
  const trendPoints = buildTrendPoints(availableReports, currencyCode);
  const maxTrendAmount = trendPoints.reduce(
    (maximum, point) => Math.max(maximum, point.overallRawAmount),
    0,
  );

  const expenseListCategoryOptions = report
    ? Array.from(
        new Set(
          report.transactions
            .filter(
              (transaction) =>
                transaction.expense_category === selectedExpenseListType,
            )
            .map((transaction) => getSpendCategoryName(transaction, spendCategories)),
        ),
      ).sort()
    : [];

  useEffect(() => {
    if (
      selectedExpenseListCategory !== "all" &&
      !expenseListCategoryOptions.includes(selectedExpenseListCategory)
    ) {
      setSelectedExpenseListCategory("all");
    }
  }, [expenseListCategoryOptions, selectedExpenseListCategory]);

  const filteredExpenseTransactions = report
    ? report.transactions.filter((transaction) => {
        if (transaction.expense_category !== selectedExpenseListType) {
          return false;
        }

        if (selectedExpenseListCategory === "all") {
          return true;
        }

        return (
          getSpendCategoryName(transaction, spendCategories) ===
          selectedExpenseListCategory
        );
      })
    : [];
  const filteredExpenseList = buildDetailedTransactionsFromList(
    filteredExpenseTransactions,
    spendCategories,
    currencyCode,
  );
  const commonPercent = expenseSplit[0]?.rawPercentage ?? 0;
  const commonAmount = expenseSplit[0]?.amount ?? currencyCode;
  const personalAmount = expenseSplit[1]?.amount ?? currencyCode;

  return (
    <section className="report-home report-page">
      <div className="report-page__hero">
        <div>
          <p className="report-home__eyebrow">Reports</p>
          <h2>Monthly report</h2>
          <p className="report-home__copy">
            {currentMonth ? formatMonthSummary(currentMonth) : "Pick a month to begin."}
          </p>
          <p className="report-home__copy">
            Monthly reporting now stays focused on totals, category movement, and
            highest-impact expenses.
          </p>
        </div>
        <div className="page-controls">
          <label className="field">
            Year
            <select
              onChange={(event) => {
                const nextYear = event.target.value;
                setSelectedYear(nextYear);
                const nextMonth = getMonthsForYear(months, nextYear)[0] ?? "";
                setSelectedMonth(nextMonth);
              }}
              value={selectedYear}
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Month
            <select
              onChange={(event) => setSelectedMonth(event.target.value)}
              value={currentMonth}
            >
              {monthOptions.map((month) => (
                <option key={month} value={month}>
                  {formatMonthOptionLabel(month)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {isLoadingMonths || isLoadingTrendReports ? (
        <p className="status-copy">Loading monthly report…</p>
      ) : null}

      <div className="summary-strip" aria-label={`${currentMonth} totals`}>
        {metrics.map((metric) => (
          <article
            className={
              metric.tone === "warning"
                ? "summary-card summary-card--warning"
                : "summary-card"
            }
            key={metric.label}
          >
            <p>{metric.label}</p>
            <strong>{metric.value}</strong>
            {metric.secondaryValue ? (
              <span className="summary-card__secondary">{metric.secondaryValue}</span>
            ) : null}
            {metric.deltaLabel ? (
              <span
                className={`summary-card__delta delta-chip delta-chip--${metric.deltaDirection ?? "flat"}`}
              >
                {metric.deltaLabel}
              </span>
            ) : null}
          </article>
        ))}
      </div>

      <div className="report-dashboard">
        <section className="report-panel">
          <div className="report-panel__header">
            <h3>Expense split</h3>
            <span>Total month spend, split between common and personal.</span>
          </div>
          <div className="report-split">
            <div
              aria-label="Expense split donut"
              className="report-donut"
              style={
                {
                  "--common-sweep": `${commonPercent}%`,
                  "--report-common": REPORT_COLORS.common,
                  "--report-personal": REPORT_COLORS.personal,
                } as CSSProperties
              }
            >
              <div className="report-donut__core">
                <span>Month total</span>
                <strong>{metrics[0]?.value ?? "-"}</strong>
              </div>
            </div>
            <div className="report-split__legend">
              <article className="report-split__legend-item report-split__legend-item--common">
                <div>
                  <h4>Common</h4>
                  <p>{expenseSplit[0]?.percentage ?? "0.0% of total"}</p>
                </div>
                <strong>{commonAmount}</strong>
              </article>
              <article className="report-split__legend-item report-split__legend-item--personal">
                <div>
                  <h4>Personal</h4>
                  <p>{expenseSplit[1]?.percentage ?? "0.0% of total"}</p>
                </div>
                <strong>{personalAmount}</strong>
              </article>
            </div>
          </div>
        </section>

        <section className="report-panel">
          <div className="report-panel__header">
            <h3>Expenses by category</h3>
            <span>Spend by category for the selected expense type.</span>
          </div>
          <div className="report-panel__toolbar">
            <label className="field">
              Category spend type
              <select
                onChange={(event) =>
                  setSelectedCategorySpendType(event.target.value as ReportTypeFilter)
                }
                value={selectedCategorySpendType}
              >
                <option value="common">Common</option>
                <option value="personal">Personal</option>
              </select>
            </label>
          </div>
          <div className="report-bars">
            {categoryBars.map((item) => (
              <article className="report-bar" key={item.category}>
                <div className="report-bar__meta">
                  <div>
                    <h4>{item.category}</h4>
                    <p>{item.percentage}</p>
                  </div>
                  <strong>{item.amount}</strong>
                </div>
                <div className="report-bar__track">
                  <div
                    className={
                      selectedCategorySpendType === "common"
                        ? "report-bar__fill report-bar__fill--common"
                        : "report-bar__fill report-bar__fill--personal"
                    }
                    style={{ width: `${Math.max(item.rawPercentage, 4)}%` }}
                  />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="report-panel">
          <div className="report-panel__header">
            <h3>Month-over-month trend</h3>
            <span>Reviewed totals and common spend across recent months.</span>
          </div>
          <div className="report-trend">
            {trendPoints.map((point) => (
              <article className="report-trend__item" key={point.monthKey}>
                <div className="report-trend__amounts">
                  <strong>{point.overallAmount}</strong>
                  <span>{point.commonAmount}</span>
                </div>
                <div className="report-trend__bars" aria-hidden="true">
                  <div
                    className="report-trend__bar report-trend__bar--overall"
                    style={{
                      height: `${maxTrendAmount === 0 ? 6 : Math.max((point.overallRawAmount / maxTrendAmount) * 100, 6)}%`,
                    }}
                  />
                  <div
                    className="report-trend__bar report-trend__bar--common"
                    style={{
                      height: `${maxTrendAmount === 0 ? 6 : Math.max((point.commonRawAmount / maxTrendAmount) * 100, 6)}%`,
                    }}
                  />
                </div>
                <p>{point.monthLabel}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="report-panel">
          <div className="report-panel__header">
            <h3>Comparison with previous month</h3>
            <span>
              Category movement versus{" "}
              {previousMonth ? formatShortMonthLabel(previousMonth) : "the previous month"}{" "}
              for the selected expense type.
            </span>
          </div>
          <div className="report-panel__toolbar">
            <label className="field">
              Comparison expense type
              <select
                onChange={(event) =>
                  setSelectedComparisonType(event.target.value as ReportTypeFilter)
                }
                value={selectedComparisonType}
              >
                <option value="common">Common</option>
                <option value="personal">Personal</option>
              </select>
            </label>
          </div>
          <div className="comparison-list">
            {comparisonRows.map((row) => (
              <article className="comparison-row" key={row.category}>
                <div className="comparison-row__title">
                  <h4>{row.category}</h4>
                </div>
                <div className="comparison-row__values">
                  <div className="comparison-row__cell">
                    <span className="comparison-row__cell-label">Last month</span>
                    <span className="comparison-row__cell-value">{row.previousAmount}</span>
                  </div>
                  <div className="comparison-row__cell">
                    <span className="comparison-row__cell-label">Current month</span>
                    <span className="comparison-row__cell-value">{row.currentAmount}</span>
                  </div>
                  <div className="comparison-row__cell">
                    <span className="comparison-row__cell-label">Change</span>
                    <span className="comparison-row__cell-value">
                      {row.absoluteChangeLabel}
                    </span>
                  </div>
                  <div className="comparison-row__cell">
                    <span className="comparison-row__cell-label">Note</span>
                    <span className="comparison-row__cell-value">{row.comparisonNote}</span>
                  </div>
                </div>
                <span
                  className={`comparison-row__badge delta-chip delta-chip--${row.direction}`}
                >
                  {row.direction === "up" || row.direction === "down"
                    ? row.changeLabel
                    : row.statusLabel}
                </span>
              </article>
            ))}
          </div>
        </section>

        <section className="report-panel">
          <div className="report-panel__header">
            <h3>Expenses list</h3>
            <span>Reviewed expense lines for the selected type and category.</span>
          </div>
          <div className="report-drilldown__filters">
            <label className="field">
              Expense list type
              <select
                onChange={(event) =>
                  setSelectedExpenseListType(event.target.value as ReportTypeFilter)
                }
                value={selectedExpenseListType}
              >
                <option value="common">Common</option>
                <option value="personal">Personal</option>
              </select>
            </label>
            <label className="field">
              Expense list category
              <select
                onChange={(event) => setSelectedExpenseListCategory(event.target.value)}
                value={selectedExpenseListCategory}
              >
                <option value="all">All</option>
                {expenseListCategoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="stack-list">
            {filteredExpenseList.map((transaction) => (
              <article className="stack-list__item report-transaction-row" key={transaction.id}>
                <div className="transactions-page__date-block report-transaction-row__date">
                  <strong className="transactions-page__date-label">
                    {transaction.transaction_date
                      ? formatTransactionDateLabel(transaction.transaction_date)
                      : "-"}
                  </strong>
                  <span className="transactions-page__date-meta">
                    {transaction.transaction_date
                      ? formatTransactionDateMeta(transaction.transaction_date)
                      : ""}
                  </span>
                </div>
                <div className="report-transaction-row__content">
                  <h4 className="report-transaction-row__merchant">{transaction.merchant}</h4>
                  <p className="report-transaction-row__meta">{transaction.detail}</p>
                </div>
                <strong className="report-transaction-row__amount">{transaction.amount}</strong>
              </article>
            ))}
            {filteredExpenseList.length === 0 ? (
              <p className="status-copy">No transactions match this filter.</p>
            ) : null}
          </div>
        </section>

        <section className="report-panel">
          <div className="report-panel__header">
            <h3>Top 10 expenses</h3>
            <span>Highest reviewed expenses for the selected month.</span>
          </div>
          <div className="stack-list">
            {topExpenses.map((transaction) => (
              <article className="stack-list__item report-transaction-row" key={transaction.id}>
                <div className="transactions-page__date-block report-transaction-row__date">
                  <strong className="transactions-page__date-label">
                    {transaction.transaction_date
                      ? formatTransactionDateLabel(transaction.transaction_date)
                      : "-"}
                  </strong>
                  <span className="transactions-page__date-meta">
                    {transaction.transaction_date
                      ? formatTransactionDateMeta(transaction.transaction_date)
                      : ""}
                  </span>
                </div>
                <div className="report-transaction-row__content">
                  <h4 className="report-transaction-row__merchant">{transaction.merchant}</h4>
                  <p className="report-transaction-row__meta">{transaction.detail}</p>
                </div>
                <strong className="report-transaction-row__amount">{transaction.amount}</strong>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
