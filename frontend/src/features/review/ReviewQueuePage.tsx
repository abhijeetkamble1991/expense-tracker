import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "../../lib/api";
import {
  ApiTransaction,
  buildReviewPayload,
  useSpendCategories,
  useTransactions,
} from "../month-workflow/workflow-data";
import { ReviewTable } from "./ReviewTable";

type ReviewDraft = {
  merchant: string;
  expenseCategory: ApiTransaction["expense_category"];
  spendCategoryId: number | null;
  reviewStatus: ApiTransaction["review_status"];
};

export function ReviewQueuePage() {
  const queryClient = useQueryClient();
  const { data: expenses = [] } = useTransactions({
    review_status: "needs_review",
  });
  const { data: spendCategories = [] } = useSpendCategories();
  const [drafts, setDrafts] = useState<Record<number, ReviewDraft>>({});
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: async (transactionId: number) => {
      const expense = expenses.find((item) => item.id === transactionId);
      const draft = drafts[transactionId] ?? {
        merchant: expense?.merchant ?? "",
        expenseCategory: expense?.expense_category ?? "common",
        spendCategoryId: expense?.spend_category_id ?? null,
        reviewStatus: expense?.review_status ?? "needs_review",
      };

      return api.patch(
        `/transactions/${transactionId}`,
        buildReviewPayload({
          merchant: draft.merchant,
          expenseCategory: draft.expenseCategory,
          reviewStatus: draft.reviewStatus,
          spendCategoryId: draft.spendCategoryId,
        }),
      );
    },
    onSuccess: () => {
      setFeedbackMessage("Saved review changes.");
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: () => {
      setFeedbackMessage("Unable to save review changes.");
    },
  });

  const draftState = useMemo(
    () =>
      expenses.reduce<Record<number, ReviewDraft>>((accumulator, expense) => {
        accumulator[expense.id] = drafts[expense.id] ?? {
          merchant: expense.merchant,
          expenseCategory: expense.expense_category,
          spendCategoryId: expense.spend_category_id,
          reviewStatus: expense.review_status,
        };
        return accumulator;
      }, {}),
    [drafts, expenses],
  );

  return (
    <section className="report-home workflow-page">
      <p className="report-home__eyebrow">Review queue</p>
      <div className="workflow-page__header">
        <div>
          <h2>Resolve imported expenses before close</h2>
          <p className="report-home__copy">
            Focus on category gaps, missing receipts, and split transactions.
          </p>
        </div>
        <p className="workflow-page__badge">{expenses.length} pending</p>
      </div>

      {feedbackMessage ? <p className="status-copy">{feedbackMessage}</p> : null}

      <ReviewTable
        drafts={draftState}
        expenses={expenses}
        isSavingId={saveMutation.variables ?? null}
        onDraftChange={(transactionId, patch) => {
          const expense = expenses.find((item) => item.id === transactionId);
          setDrafts((currentDrafts) => ({
            ...currentDrafts,
            [transactionId]: {
              ...(currentDrafts[transactionId] ?? {
                merchant: expense?.merchant ?? "",
                expenseCategory: expense?.expense_category ?? "common",
                spendCategoryId: expense?.spend_category_id ?? null,
                reviewStatus: expense?.review_status ?? "needs_review",
              }),
              ...patch,
            },
          }));
        }}
        onSave={(transactionId) => saveMutation.mutate(transactionId)}
        spendCategories={spendCategories}
      />
    </section>
  );
}
