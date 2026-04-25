import { FormEvent, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "../../lib/api";
import { useSpendCategories } from "../month-workflow/workflow-data";

function deriveMonthKey(transactionDate: string) {
  return transactionDate ? transactionDate.slice(0, 7) : "";
}

export function ManualEntryForm() {
  const queryClient = useQueryClient();
  const { data: spendCategories = [] } = useSpendCategories();
  const [transactionDate, setTransactionDate] = useState("");
  const [merchant, setMerchant] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState<"common" | "personal">(
    "common",
  );
  const [reimburse, setReimburse] = useState(false);
  const [spendCategoryId, setSpendCategoryId] = useState("");
  const [notes, setNotes] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const monthKey = deriveMonthKey(transactionDate);

  const mutation = useMutation({
    mutationFn: async () =>
      api.post("/transactions/manual", {
        month_key: monthKey,
        transaction_date: transactionDate,
        merchant,
        description,
        amount: Number(amount).toFixed(2),
        expense_category: expenseCategory,
        spend_category_id: Number(spendCategoryId),
        reimburse: expenseCategory === "common" ? reimburse : false,
        notes: notes.trim() ? notes.trim() : null,
      }),
    onSuccess: () => {
      setFeedbackMessage("Manual transaction saved.");
      queryClient.invalidateQueries({ queryKey: ["months"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["month-report"] });
      setTransactionDate("");
      setMerchant("");
      setDescription("");
      setAmount("");
      setExpenseCategory("common");
      setReimburse(false);
      setSpendCategoryId("");
      setNotes("");
    },
    onError: () => {
      setFeedbackMessage("Unable to save manual transaction.");
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedbackMessage(null);
    mutation.mutate();
  }

  return (
    <>
      <form className="workflow-form" onSubmit={handleSubmit}>
        <label className="field">
          Date
          <input
            onChange={(event) => setTransactionDate(event.target.value)}
            required
            type="date"
            value={transactionDate}
          />
        </label>
        <div className="field field--readonly" aria-live="polite">
          <span>Tracked month</span>
          <strong>{monthKey || "Select a date to detect the month"}</strong>
        </div>
        <label className="field">
          Merchant
          <input
            onChange={(event) => setMerchant(event.target.value)}
            required
            value={merchant}
          />
        </label>
        <label className="field">
          Description
          <input
            onChange={(event) => setDescription(event.target.value)}
            required
            value={description}
          />
        </label>
        <label className="field">
          Amount
          <input
            inputMode="decimal"
            onChange={(event) => setAmount(event.target.value)}
            required
            value={amount}
          />
        </label>
        <label className="field">
          Expense category
          <select
            onChange={(event) => {
              const nextCategory = event.target.value as "common" | "personal";
              setExpenseCategory(nextCategory);
              if (nextCategory !== "common") {
                setReimburse(false);
              }
            }}
            value={expenseCategory}
          >
            <option value="common">Common</option>
            <option value="personal">Personal</option>
          </select>
        </label>
        <label className="field field--checkbox">
          <span>Reimburse</span>
          <input
            checked={reimburse}
            disabled={expenseCategory !== "common"}
            onChange={(event) => setReimburse(event.target.checked)}
            type="checkbox"
          />
        </label>
        <label className="field">
          Spend category
          <select
            onChange={(event) => setSpendCategoryId(event.target.value)}
            required
            value={spendCategoryId}
          >
            <option value="">Select a category</option>
            {spendCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field field--full">
          Notes
          <textarea
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            value={notes}
          />
        </label>
        <button className="button-primary" type="submit">
          {mutation.isPending ? "Saving…" : "Save manual transaction"}
        </button>
      </form>

      {feedbackMessage ? <p className="status-copy">{feedbackMessage}</p> : null}
    </>
  );
}
