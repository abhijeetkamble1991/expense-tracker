import { useReportSummary, useReviewQueue } from "../month-workflow/workflow-data";

export function ReportHomePage() {
  const { monthLabel, metrics, needsReviewCount, spendByCategory } =
    useReportSummary();
  const { expenses } = useReviewQueue();

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
            <h3>Category spend</h3>
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
            <h3>Review queue snapshot</h3>
            <span>Most urgent receipts and category fixes</span>
          </div>
          <div className="stack-list">
            {expenses.slice(0, 3).map((expense) => (
              <article className="stack-list__item" key={expense.id}>
                <div>
                  <h4>{expense.merchant}</h4>
                  <p>
                    {expense.date} • {expense.expenseCategory}
                  </p>
                </div>
                <strong>{expense.amount}</strong>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
