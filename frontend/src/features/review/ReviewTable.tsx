import {
  ApiTransaction,
  SpendCategory,
  formatExpenseCategory,
} from "../month-workflow/workflow-data";

type ReviewDraft = {
  merchant: string;
  expenseCategory: ApiTransaction["expense_category"];
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
          <th scope="col">Warning</th>
          <th scope="col">Action</th>
        </tr>
      </thead>
      <tbody>
        {expenses.map((expense) => {
          const draft = drafts[expense.id] ?? {
            merchant: expense.merchant,
            expenseCategory: expense.expense_category,
            spendCategoryId: expense.spend_category_id,
            reviewStatus: expense.review_status,
          };

          return (
            <tr key={expense.id}>
              <td>{expense.transaction_date}</td>
              <td>
                <label className="visually-hidden" htmlFor={`merchant-${expense.id}`}>
                  Merchant {expense.id}
                </label>
                <input
                  aria-label={`Merchant ${expense.id}`}
                  id={`merchant-${expense.id}`}
                  onChange={(event) =>
                    onDraftChange(expense.id, {
                      merchant: event.target.value,
                    })
                  }
                  value={draft.merchant}
                />
              </td>
              <td>
                <label className="visually-hidden" htmlFor={`expense-category-${expense.id}`}>
                  Expense category {expense.id}
                </label>
                <select
                  aria-label={`Expense category ${expense.id}`}
                  id={`expense-category-${expense.id}`}
                  onChange={(event) =>
                    onDraftChange(expense.id, {
                      expenseCategory: event.target
                        .value as ApiTransaction["expense_category"],
                    })
                  }
                  value={draft.expenseCategory}
                >
                  <option value="common">Common</option>
                  <option value="personal">Personal</option>
                </select>
              </td>
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
                {expense.duplicate_suspected ? expense.duplicate_reason : "None"}
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
