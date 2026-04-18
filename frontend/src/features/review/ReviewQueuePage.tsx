import { useReviewQueue } from "../month-workflow/workflow-data";
import { ReviewTable } from "./ReviewTable";

export function ReviewQueuePage() {
  const { expenses, totalPending } = useReviewQueue();

  return (
    <section className="report-home workflow-page">
      <p className="report-home__eyebrow">Review queue</p>
      <div className="workflow-page__header">
        <div>
          <h2>Resolve imported expenses before close</h2>
          <p className="report-home__copy">
            Focus on category gaps, missing receipts, and split transactions.
          </p>
        </div>
        <p className="workflow-page__badge">{totalPending} pending</p>
      </div>
      <ReviewTable expenses={expenses} />
    </section>
  );
}
