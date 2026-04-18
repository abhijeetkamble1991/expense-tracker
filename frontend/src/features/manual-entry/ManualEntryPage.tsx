import { useManualEntryPrompts } from "../month-workflow/workflow-data";

export function ManualEntryPage() {
  const prompts = useManualEntryPrompts();

  return (
    <section className="report-home workflow-page">
      <p className="report-home__eyebrow">Manual entry</p>
      <h2>Capture expenses that never arrived in import</h2>
      <p className="report-home__copy">
        Keep the month clean when cash spend, reimbursements, or late receipts
        need to be added by hand.
      </p>
      <div className="stack-list">
        {prompts.map((prompt) => (
          <article className="stack-list__item" key={prompt}>
            <div>
              <h3>{prompt}</h3>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
