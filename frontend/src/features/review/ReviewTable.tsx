import { ReviewExpense } from "../month-workflow/workflow-data";

type ReviewTableProps = {
  expenses: ReviewExpense[];
};

export function ReviewTable({ expenses }: ReviewTableProps) {
  return (
    <table aria-label="Expenses pending review" className="review-table">
      <thead>
        <tr>
          <th scope="col">Date</th>
          <th scope="col">Merchant</th>
          <th scope="col">Expense Category</th>
          <th scope="col">Source</th>
          <th scope="col">Amount</th>
          <th scope="col">Status</th>
        </tr>
      </thead>
      <tbody>
        {expenses.map((expense) => (
          <tr key={expense.id}>
            <td>{expense.date}</td>
            <td>{expense.merchant}</td>
            <td>{expense.expenseCategory}</td>
            <td>{expense.source}</td>
            <td>{expense.amount}</td>
            <td>{expense.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
