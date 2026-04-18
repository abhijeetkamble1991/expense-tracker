import {
  ApiTransaction,
  SpendCategory,
  formatExpenseCategory,
} from "../month-workflow/workflow-data";

type ReviewDraft = {
  spendCategoryId: number | null;
  reviewStatus: ApiTransaction["review_status"];
};

type ReviewTableProps = {
  expenses: ApiTransaction[];
  drafts: Record<number, ReviewDraft>;
  spendCategories: SpendCategory[];
  onDraftChange: (
    transactionId: number,
    patch: Partial<ReviewDraft>,
  ) => void;
  onSave: (transactionId: number) => void;
  isSavingId: number | null;
};

export function ReviewTable({
  expenses,
  drafts,
  spendCategories,
  onDraftChange,
  onSave,
  isSavingId,
}: ReviewTableProps) {
  return (
    <table aria-label="Expenses pending review" className="review-table">
      <thead>
        <tr>
          <th scope="col">Date</th>
          <th scope="col">Merchant</th>
          <th scope="col">Expense Category</th>
          <th scope="col">Spend Category</th>
          <th scope="col">Status</th>
          <th scope="col">Action</th>
        </tr>
      </thead>
      <tbody>
        {expenses.map((expense) => {
          const draft = drafts[expense.id] ?? {
            spendCategoryId: expense.spend_category_id,
            reviewStatus: expense.review_status,
          };

          return (
            <tr key={expense.id}>
              <td>{expense.transaction_date}</td>
              <td>{expense.merchant}</td>
              <td>{formatExpenseCategory(expense.expense_category)}</td>
              <td>
                <label className="visually-hidden" htmlFor={`spend-category-${expense.id}`}>
                  Spend category {expense.id}
                </label>
                <select
                  aria-label={`Spend category ${expense.id}`}
                  id={`spend-category-${expense.id}`}
                  onChange={(event) =>
                    onDraftChange(expense.id, {
                      spendCategoryId: event.target.value
                        ? Number(event.target.value)
                        : null,
                    })
                  }
                  value={draft.spendCategoryId ?? ""}
                >
                  <option value="">Unassigned</option>
                  {spendCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <label className="visually-hidden" htmlFor={`status-${expense.id}`}>
                  Status {expense.id}
                </label>
                <select
                  aria-label={`Status ${expense.id}`}
                  id={`status-${expense.id}`}
                  onChange={(event) =>
                    onDraftChange(expense.id, {
                      reviewStatus: event.target
                        .value as ApiTransaction["review_status"],
                    })
                  }
                  value={draft.reviewStatus}
                >
                  <option value="needs_review">Needs review</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="flagged">Flagged</option>
                </select>
              </td>
              <td>
                <button
                  className="button-secondary"
                  disabled={isSavingId === expense.id}
                  onClick={() => onSave(expense.id)}
                  type="button"
                >
                  {isSavingId === expense.id ? "Saving…" : `Save ${expense.id}`}
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
