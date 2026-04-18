import { useCategoryCoverage } from "../month-workflow/workflow-data";

export function SpendCategoriesPage() {
  const categories = useCategoryCoverage();

  return (
    <section className="report-home workflow-page">
      <p className="report-home__eyebrow">Categories</p>
      <h2>Keep category rules aligned to reporting</h2>
      <p className="report-home__copy">
        Review the category set used in imports and manual entries before the
        report is finalized.
      </p>
      <div className="stack-list">
        {categories.map((category) => (
          <article className="stack-list__item" key={category.name}>
            <div>
              <h3>{category.name}</h3>
              <p>
                {category.ruleCount} rules • Updated {category.lastUpdated}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
