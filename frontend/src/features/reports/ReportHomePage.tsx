import { useEffect, useState } from "react";

import {
  buildCategoryAllocations,
  buildDetailedTransactions,
  buildMerchantSummary,
  buildReportMetrics,
  buildSourceSummary,
  formatMonthSummary,
  useMonthReport,
  useMonths,
  useSpendCategories,
} from "../month-workflow/workflow-data";

export function ReportHomePage() {
  const { data: months = [], isLoading: isLoadingMonths } = useMonths();
  const { data: spendCategories = [] } = useSpendCategories();
  const [selectedMonth, setSelectedMonth] = useState<string>("");

  useEffect(() => {
    if (!selectedMonth && months.length > 0) {
      setSelectedMonth(months[0]);
    }
  }, [months, selectedMonth]);

  const { data: report, isLoading: isLoadingReport } = useMonthReport(
    selectedMonth || null,
  );

  const metrics = report ? buildReportMetrics(report) : [];
  const spendByCategory = report
    ? buildCategoryAllocations(report, spendCategories)
    : [];
  const merchantSummary = report ? buildMerchantSummary(report) : [];
  const sourceSummary = report ? buildSourceSummary(report) : [];
  const detailedTransactions = report
    ? buildDetailedTransactions(report, spendCategories)
    : [];
  const needsReviewCount =
    report?.transactions.filter((transaction) => transaction.review_status !== "reviewed")
      .length ?? 0;

  return (
    <section className="report-home report-page">
      <div className="report-page__hero">
        <div>
          <p className="report-home__eyebrow">Reports</p>
          <h2>Monthly report</h2>
          <p className="report-home__copy">
            {selectedMonth ? formatMonthSummary(selectedMonth) : "Pick a month to begin."}
          </p>
          <p className="report-home__copy">
            The report home keeps this month&apos;s totals, review pressure, and
            category drift visible before close.
          </p>
        </div>
        <div className="page-controls">
          <label className="field">
            Month
            <select
              onChange={(event) => setSelectedMonth(event.target.value)}
              value={selectedMonth}
            >
              {months.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
          </label>
          <p className="report-page__review-pill">
            {needsReviewCount} expenses need review
          </p>
        </div>
      </div>

      {isLoadingMonths || isLoadingReport ? (
        <p className="status-copy">Loading monthly report…</p>
      ) : null}

      <div className="summary-strip" aria-label={`${selectedMonth} totals`}>
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
          </article>
        ))}
      </div>

      <div className="report-sections">
        <section className="report-panel">
          <div className="report-panel__header">
            <h3>Category chart</h3>
            <span>Top drivers this month</span>
          </div>
          <div className="stack-list">
            {spendByCategory.map((item) => (
              <article className="stack-list__item" key={item.category}>
                <div>
                  <h4>{item.category}</h4>
                  <p>{item.note}</p>
                </div>
                <strong>{item.amount}</strong>
              </article>
            ))}
          </div>
        </section>

        <section className="report-panel">
          <div className="report-panel__header">
            <h3>Merchant summary</h3>
            <span>Merchants with the highest volume this month</span>
          </div>
          <div className="stack-list">
            {merchantSummary.map((merchant) => (
              <article className="stack-list__item" key={merchant.merchant}>
                <div>
                  <h4>{merchant.merchant}</h4>
                  <p>{merchant.transactionCount} transactions</p>
                </div>
                <strong>{merchant.total}</strong>
              </article>
            ))}
          </div>
        </section>

        <section className="report-panel">
          <div className="report-panel__header">
            <h3>Source summary</h3>
            <span>Imported and manual contribution by source</span>
          </div>
          <div className="stack-list">
            {sourceSummary.map((source) => (
              <article className="stack-list__item" key={source.source}>
                <div>
                  <h4>{source.source}</h4>
                </div>
                <strong>{source.total}</strong>
              </article>
            ))}
          </div>
        </section>

        <section className="report-panel">
          <div className="report-panel__header">
            <h3>Detailed transactions</h3>
            <span>Line items included in this month&apos;s report</span>
          </div>
          <div className="stack-list">
            {detailedTransactions.map((transaction) => (
              <article className="stack-list__item" key={transaction.id}>
                <div>
                  <h4>{transaction.merchant}</h4>
                  <p>{transaction.detail}</p>
                </div>
                <strong>{transaction.amount}</strong>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
