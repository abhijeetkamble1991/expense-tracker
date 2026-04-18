import { useEffect, useState } from "react";

import {
  formatCurrency,
  formatExpenseCategory,
  useMonths,
  useTransactions,
} from "../month-workflow/workflow-data";

export function TransactionsPage() {
  const { data: months = [] } = useMonths();
  const [selectedMonth, setSelectedMonth] = useState<string>("");

  useEffect(() => {
    if (!selectedMonth && months.length > 0) {
      setSelectedMonth(months[0]);
    }
  }, [months, selectedMonth]);

  const { data: transactions = [], isLoading } = useTransactions({
    month_key: selectedMonth || undefined,
  });

  return (
    <section className="report-home workflow-page">
      <div className="workflow-page__header">
        <div>
          <p className="report-home__eyebrow">Transactions</p>
          <h2>Every line item in the selected month</h2>
          <p className="report-home__copy">
            Use the transaction ledger to verify what landed in reporting before
            and after review.
          </p>
        </div>
        <label className="field">
          Month
          <select
            onChange={(event) => setSelectedMonth(event.target.value)}
            value={selectedMonth}
          >
            {months.map((month) => (
              <option key={month} value={month}>
                {month}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isLoading ? <p className="status-copy">Loading transactions…</p> : null}

      <div className="stack-list">
        {transactions.map((transaction) => (
          <article className="stack-list__item" key={transaction.id}>
            <div>
              <h3>{transaction.merchant}</h3>
              <p>
                {transaction.description} • {transaction.transaction_date} •{" "}
                {formatExpenseCategory(transaction.expense_category)}
              </p>
            </div>
            <strong>{formatCurrency(transaction.amount)}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}
