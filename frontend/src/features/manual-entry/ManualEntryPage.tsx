import { ManualEntryForm } from "./ManualEntryForm";

export function ManualEntryPage() {
  return (
    <section className="report-home workflow-page">
      <p className="report-home__eyebrow">Manual entry</p>
      <h2>Capture expenses that never arrived in import</h2>
      <p className="report-home__copy">
        Keep the month clean when cash spend, reimbursements, or late receipts
        need to be added by hand.
      </p>
      <ManualEntryForm />
    </section>
  );
}
