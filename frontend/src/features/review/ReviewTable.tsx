import {
  ApiTransaction,
  SpendCategory,
  formatCurrency,
} from "../month-workflow/workflow-data";

function formatTransactionDateLabel(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function formatTransactionDateMeta(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    year: "numeric",
  }).format(new Date(value));
}

type ReviewDraft = {
  merchant: string;
  expenseCategory: ApiTransaction["expense_category"];
  spendCategoryId: number | null;
  reimburse: boolean;
  reviewStatus: ApiTransaction["review_status"];
};

type ReviewTableProps = {
  expenses: ApiTransaction[];
  drafts: Record<number, ReviewDraft>;
  spendCategories: SpendCategory[];
  currencyCode: string;
  deleteConfirmationId: number | null;
  onDraftChange: (
    transactionId: number,
    patch: Partial<ReviewDraft>,
  ) => void;
  onRequestDelete: (transactionId: number) => void;
  onCancelDelete: () => void;
  onConfirmDelete: (transactionId: number) => void;
  onSave: (transactionId: number) => void;
  isSavingId: number | null;
  isDeletingId: number | null;
};

export function ReviewTable({
  expenses,
  drafts,
  spendCategories,
  currencyCode,
  deleteConfirmationId,
  onDraftChange,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
  onSave,
  isSavingId,
  isDeletingId,
}: ReviewTableProps) {
  return (
    <table aria-label="Expenses pending review" className="review-table">
      <thead>
        <tr>
          <th scope="col">Date</th>
          <th scope="col">Time</th>
          <th scope="col">Amount</th>
          <th scope="col">Merchant</th>
          <th scope="col">Expense Category</th>
          <th scope="col">Spend Category</th>
          <th scope="col">Reimburse</th>
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
            reimburse: expense.reimburse,
            reviewStatus: expense.review_status,
          };

          return (
            <tr key={expense.id}>
              <td>
                <div className="transactions-page__date-block review-table__date-block">
                  <strong className="transactions-page__date-label">
                    {formatTransactionDateLabel(expense.transaction_date)}
                  </strong>
                  <span className="transactions-page__date-meta">
                    {formatTransactionDateMeta(expense.transaction_date)}
                  </span>
                </div>
              </td>
              <td>{expense.transaction_time ?? "-"}</td>
              <td className="review-table__amount">
                {formatCurrency(expense.amount, currencyCode)}
              </td>
              <td>
                <label className="visually-hidden" htmlFor={`merchant-${expense.id}`}>
                  Merchant {expense.id}
                </label>
                <input
                  aria-label={`Merchant ${expense.id}`}
                  className="review-table__control"
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
                  className="review-table__control"
                  id={`expense-category-${expense.id}`}
                  onChange={(event) =>
                    onDraftChange(expense.id, {
                      expenseCategory: event.target
                        .value as ApiTransaction["expense_category"],
                      reimburse:
                        event.target.value === "common" ? draft.reimburse : false,
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
                  className="review-table__control"
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
                <label
                  className="visually-hidden"
                  htmlFor={`reimburse-${expense.id}`}
                >
                  Reimburse {expense.id}
                </label>
                <input
                  aria-label={`Reimburse ${expense.id}`}
                  checked={draft.reimburse}
                  className="review-table__checkbox"
                  disabled={draft.expenseCategory !== "common"}
                  id={`reimburse-${expense.id}`}
                  onChange={(event) =>
                    onDraftChange(expense.id, {
                      reimburse: event.target.checked,
                    })
                  }
                  type="checkbox"
                />
              </td>
              <td>
                <label className="visually-hidden" htmlFor={`status-${expense.id}`}>
                  Status {expense.id}
                </label>
                <select
                  aria-label={`Status ${expense.id}`}
                  className="review-table__control"
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
                <div className="review-table__actions">
                  {deleteConfirmationId === expense.id ? (
                    <>
                      <span className="review-table__confirm-copy">
                        Delete this transaction permanently?
                      </span>
                      <button
                        aria-label={`Confirm delete ${expense.merchant}`}
                        className="button-primary"
                        disabled={isDeletingId === expense.id}
                        onClick={() => onConfirmDelete(expense.id)}
                        type="button"
                      >
                        {isDeletingId === expense.id ? "Deleting…" : "Confirm delete"}
                      </button>
                      <button
                        className="button-secondary"
                        disabled={isDeletingId === expense.id}
                        onClick={onCancelDelete}
                        type="button"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        aria-label={`Save review changes for ${expense.merchant}`}
                        className="button-secondary"
                        disabled={isSavingId === expense.id}
                        onClick={() => onSave(expense.id)}
                        type="button"
                      >
                        {isSavingId === expense.id ? "Saving…" : "Save"}
                      </button>
                      <button
                        aria-label={`Delete ${expense.merchant} from review queue`}
                        className="button-secondary"
                        disabled={isDeletingId === expense.id}
                        onClick={() => onRequestDelete(expense.id)}
                        type="button"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
