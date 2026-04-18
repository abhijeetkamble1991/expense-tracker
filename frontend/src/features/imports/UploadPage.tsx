import { useUploadBatches } from "../month-workflow/workflow-data";

export function UploadPage() {
  const batches = useUploadBatches();

  return (
    <section className="report-home workflow-page">
      <p className="report-home__eyebrow">Upload</p>
      <h2>Bring in this month&apos;s bank and card files</h2>
      <p className="report-home__copy">
        Start imports, confirm mapping, and keep the review queue scoped to real
        exceptions.
      </p>
      <div className="stack-list">
        {batches.map((batch) => (
          <article className="stack-list__item" key={batch.vendor}>
            <div>
              <h3>{batch.vendor}</h3>
              <p>
                {batch.receivedAt} • {batch.transactions} transactions
              </p>
            </div>
            <strong>{batch.status}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}
