import { useReportSummary } from "../month-workflow/workflow-data";

export function ReportHomePage() {
  const {
    monthLabel,
    metrics,
    needsReviewCount,
    spendByCategory,
    merchantSummary,
    detailedTransactions,
  } = useReportSummary();

  return (
    <section className="report-home report-page">
      <div className="report-page__hero">
        <div>
          <p className="report-home__eyebrow">Reports</p>
          <h2>{monthLabel} summary</h2>
          <p className="report-home__copy">
            The report home keeps this month&apos;s totals, review pressure, and
            category drift visible before close.
          </p>
        </div>
        <p className="report-page__review-pill">
          {needsReviewCount} expenses need review
        </p>
      </div>

      <div className="summary-strip" aria-label={`${monthLabel} totals`}>
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
                  <p>
                    {merchant.transactionCount} transactions
                  </p>
                </div>
                <strong>{merchant.total}</strong>
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
