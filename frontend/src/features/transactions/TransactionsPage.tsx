import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { api } from "../../lib/api";
import {
  ApiTransaction,
  buildYearOptions,
  formatCurrency,
  formatExpenseCategory,
  formatMonthOptionLabel,
  getMonthsForYear,
  getYearFromMonthKey,
  useMonths,
  useSettings,
  useSpendCategories,
  useTransactions,
} from "../month-workflow/workflow-data";
import { ManualEntryForm } from "../manual-entry/ManualEntryForm";

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

function formatSourceType(value: string) {
  if (value === "manual") {
    return "Manual";
  }

  if (value === "upi_pdf") {
    return "UPI import";
  }

  if (value === "credit_card_pdf") {
    return "Card import";
  }

  return value.replace(/_/g, " ");
}

function formatReviewStatus(value: "needs_review" | "reviewed" | "flagged") {
  if (value === "needs_review") {
    return "Needs review";
  }

  if (value === "reviewed") {
    return "Reviewed";
  }

  return "Flagged";
}

function normalizeComparableText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isDescriptionRedundant({
  merchant,
  description,
}: {
  merchant: string;
  description: string;
}) {
  const normalizedMerchant = normalizeComparableText(merchant);
  const normalizedDescription = normalizeComparableText(description);

  if (!normalizedMerchant || !normalizedDescription) {
    return false;
  }

  const strippedDescription = description
    .trim()
    .replace(/^(paid to|received from|payment to)\s+/i, "");

  return normalizeComparableText(strippedDescription) === normalizedMerchant;
}

export function TransactionsPage() {
  const queryClient = useQueryClient();
  const { data: months = [] } = useMonths();
  const { data: settings } = useSettings();
  const { data: spendCategories = [] } = useSpendCategories();
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false);
  const [sortDirection, setSortDirection] = useState<"desc" | "asc">("desc");
  const [openMenuTransactionId, setOpenMenuTransactionId] = useState<number | null>(
    null,
  );
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<number | null>(
    null,
  );
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionTransactionId, setActionTransactionId] = useState<number | null>(null);
  const currencyCode = settings?.currency_code ?? "USD";

  useEffect(() => {
    if (months.length === 0) {
      if (selectedMonth) {
        setSelectedMonth("");
      }
      if (selectedYear) {
        setSelectedYear("");
      }
      return;
    }

    const nextMonth = months.includes(selectedMonth) ? selectedMonth : months[0];
    if (nextMonth !== selectedMonth) {
      setSelectedMonth(nextMonth);
      return;
    }

    const nextYear = getYearFromMonthKey(nextMonth);
    if (selectedYear !== nextYear) {
      setSelectedYear(nextYear);
    }
  }, [months, selectedMonth, selectedYear]);

  const yearOptions = buildYearOptions(months);
  const monthOptions = selectedYear ? getMonthsForYear(months, selectedYear) : [];
  const currentMonth = monthOptions.includes(selectedMonth)
    ? selectedMonth
    : monthOptions[0] ?? selectedMonth;

  const { data: transactions = [], isLoading } = useTransactions({
    month_key: currentMonth || undefined,
  });
  const sortedTransactions = [...transactions].sort((left, right) => {
    const dateDelta =
      new Date(left.transaction_date).getTime() -
      new Date(right.transaction_date).getTime();

    if (dateDelta !== 0) {
      return sortDirection === "asc" ? dateDelta : -dateDelta;
    }

    return sortDirection === "asc" ? left.id - right.id : right.id - left.id;
  });

  function updateTransactionCaches(
    updater: (transaction: ApiTransaction) => ApiTransaction | null,
  ) {
    queryClient.setQueriesData(
      { queryKey: ["transactions"] },
      (currentTransactions: ApiTransaction[] | undefined) =>
        currentTransactions
          ? currentTransactions
              .map((transaction) => updater(transaction))
              .filter((transaction): transaction is ApiTransaction => transaction !== null)
          : currentTransactions,
    );
  }

  async function moveTransactionToReview(transactionId: number) {
    setActionError(null);
    setActionMessage(null);
    setActionTransactionId(transactionId);

    try {
      const response = await api.patch(`/transactions/${transactionId}`, {
        review_status: "needs_review",
      });
      const updatedTransaction = response.data as ApiTransaction;
      updateTransactionCaches((transaction) =>
        transaction.id === transactionId ? updatedTransaction : transaction,
      );
      setActionMessage("Transaction moved to review.");
      setOpenMenuTransactionId(null);
    } catch {
      setActionError("Unable to move the selected transaction to review.");
    } finally {
      setActionTransactionId((current) => (current === transactionId ? null : current));
    }
  }

  async function deleteTransaction(transactionId: number) {
    setActionError(null);
    setActionMessage(null);
    setActionTransactionId(transactionId);

    try {
      await api.delete(`/transactions/${transactionId}`);
      updateTransactionCaches((transaction) =>
        transaction.id === transactionId ? null : transaction,
      );
      queryClient.invalidateQueries({ queryKey: ["month-report"] });
      setActionMessage("Transaction deleted.");
      setDeleteConfirmationId(null);
      setOpenMenuTransactionId(null);
    } catch {
      setActionError("Unable to delete the selected transaction.");
    } finally {
      setActionTransactionId((current) => (current === transactionId ? null : current));
    }
  }

  return (
    <section className="report-home workflow-page">
      <div className="workflow-page__header">
        <div>
          <p className="report-home__eyebrow">Transactions</p>
          <h2>Transactions and manual expense entry</h2>
          <p className="report-home__copy">
            Add missing expenses and review the selected month from one place.
          </p>
        </div>
        <div className="transactions-page__filters">
          <label className="field">
            Year
            <select
              onChange={(event) => {
                const nextYear = event.target.value;
                setSelectedYear(nextYear);
                const nextMonth = getMonthsForYear(months, nextYear)[0] ?? "";
                setSelectedMonth(nextMonth);
              }}
              value={selectedYear}
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Month
            <select
              onChange={(event) => setSelectedMonth(event.target.value)}
              value={currentMonth}
            >
              {monthOptions.map((month) => (
                <option key={month} value={month}>
                  {formatMonthOptionLabel(month)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Sort by date
            <select
              onChange={(event) =>
                setSortDirection(event.target.value as "desc" | "asc")
              }
              value={sortDirection}
            >
              <option value="desc">Newest first</option>
              <option value="asc">Oldest first</option>
            </select>
          </label>
        </div>
      </div>

      {isLoading ? <p className="status-copy">Loading transactions…</p> : null}
      {actionMessage ? <p className="status-copy">{actionMessage}</p> : null}
      {actionError ? <p className="status-copy">{actionError}</p> : null}

      <section className="report-panel">
        <div className="report-panel__header">
          <h3>Add expense</h3>
          <span>Capture manual expenses for the selected month.</span>
        </div>
        <button
          aria-expanded={isManualEntryOpen}
          className="button-primary"
          onClick={() => setIsManualEntryOpen((current) => !current)}
          type="button"
        >
          {isManualEntryOpen ? "Hide transaction form" : "Add transaction"}
        </button>
        {isManualEntryOpen ? <ManualEntryForm /> : null}
      </section>

      <div className="report-sections transactions-page__sections">
        <section className="report-panel">
          <div className="report-panel__header">
            <h3>Ledger</h3>
            <span>
              Every line item currently stored for {currentMonth || "this month"},
              ordered by date.
            </span>
          </div>
          <div className="stack-list">
            {sortedTransactions.map((transaction) => (
              <div className="transactions-page__row-shell" key={transaction.id}>
                <article
                  className="stack-list__item transactions-page__item"
                  data-testid="transaction-row"
                >
                  <div className="transactions-page__date-block">
                    <strong className="transactions-page__date-label">
                      {formatTransactionDateLabel(transaction.transaction_date)}
                    </strong>
                    <span className="transactions-page__date-meta">
                      {formatTransactionDateMeta(transaction.transaction_date)}
                    </span>
                  </div>
                  <div className="transactions-page__content">
                    <div className="transactions-page__summary-line">
                      <span className="transactions-page__merchant">
                        {transaction.merchant}
                      </span>
                      {!isDescriptionRedundant({
                        merchant: transaction.merchant,
                        description: transaction.description,
                      }) ? (
                        <>
                          <span
                            aria-hidden="true"
                            className="transactions-page__divider"
                          >
                            |
                          </span>
                          <span className="transactions-page__description">
                            {transaction.description}
                          </span>
                        </>
                      ) : null}
                      <span
                        aria-hidden="true"
                        className="transactions-page__divider"
                      >
                        |
                      </span>
                      <span className="transactions-page__meta-group">
                        <span className="transactions-page__meta-pill">
                          {formatExpenseCategory(transaction.expense_category)}
                        </span>
                        <span className="transactions-page__meta-pill">
                          {spendCategories.find(
                            (category) => category.id === transaction.spend_category_id,
                          )?.name ?? "Uncategorized"}
                        </span>
                        <span className="transactions-page__meta-source">
                          {formatSourceType(transaction.source_type)}
                        </span>
                      </span>
                      {transaction.review_status !== "reviewed" ? (
                        <span className="transactions-page__status-inline">
                          {formatReviewStatus(transaction.review_status)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="transactions-page__amount-block">
                    <strong>{formatCurrency(transaction.amount, currencyCode)}</strong>
                  </div>
                  <div className="stack-list__menu">
                    <button
                      aria-expanded={openMenuTransactionId === transaction.id}
                      aria-label={`More actions for ${transaction.merchant}`}
                      className="icon-button"
                      onClick={() =>
                        setOpenMenuTransactionId((current) =>
                          current === transaction.id ? null : transaction.id,
                        )
                      }
                      type="button"
                    >
                      ...
                    </button>
                    {openMenuTransactionId === transaction.id ? (
                      <div className="stack-list__menu-panel" role="menu">
                        <button
                          className="stack-list__menu-action"
                          disabled={actionTransactionId === transaction.id}
                          onClick={() => moveTransactionToReview(transaction.id)}
                          type="button"
                        >
                          Move {transaction.merchant} to review
                        </button>
                        <button
                          className="stack-list__menu-action stack-list__menu-action--danger"
                          disabled={actionTransactionId === transaction.id}
                          onClick={() => {
                            setDeleteConfirmationId(transaction.id);
                            setOpenMenuTransactionId(null);
                          }}
                          type="button"
                        >
                          Delete {transaction.merchant}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </article>
                {deleteConfirmationId === transaction.id ? (
                  <div className="stack-list__warning transactions-page__warning">
                    <p>Delete this transaction permanently?</p>
                    <div className="stack-list__actions">
                      <button
                        className="button-primary"
                        disabled={actionTransactionId === transaction.id}
                        onClick={() => deleteTransaction(transaction.id)}
                        type="button"
                      >
                        {actionTransactionId === transaction.id
                          ? "Deleting…"
                          : `Confirm delete ${transaction.merchant}`}
                      </button>
                      <button
                        className="button-secondary"
                        disabled={actionTransactionId === transaction.id}
                        onClick={() => setDeleteConfirmationId(null)}
                        type="button"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
