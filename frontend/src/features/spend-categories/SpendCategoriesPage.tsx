import axios from "axios";
import { FormEvent, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "../../lib/api";
import { useSpendCategories } from "../month-workflow/workflow-data";

type DeleteWarningState = {
  categoryId: number;
  detail: string;
  linkedTransactions: number;
};

function getApiErrorDetails(
  error: unknown,
): { status?: number; detail?: string; linkedTransactions?: number } {
  if (axios.isAxiosError(error)) {
    return {
      status: error.response?.status,
      detail: error.response?.data?.detail,
      linkedTransactions: error.response?.data?.linked_transactions,
    };
  }

  const fallbackError = error as
    | {
        response?: {
          status?: number;
          data?: { detail?: string; linked_transactions?: number };
        };
      }
    | undefined;

  return {
    status: fallbackError?.response?.status,
    detail: fallbackError?.response?.data?.detail,
    linkedTransactions: fallbackError?.response?.data?.linked_transactions,
  };
}

export function SpendCategoriesPage() {
  const queryClient = useQueryClient();
  const { data: categories = [] } = useSpendCategories();
  const [newCategoryName, setNewCategoryName] = useState("");
  const [openMenuCategoryId, setOpenMenuCategoryId] = useState<number | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [deleteWarning, setDeleteWarning] = useState<DeleteWarningState | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<number | null>(null);
  const [savingCategoryId, setSavingCategoryId] = useState<number | null>(null);

  const mutation = useMutation({
    mutationFn: async () =>
      api.post("/spend-categories", { name: newCategoryName.trim() }),
    onSuccess: (response) => {
      setNewCategoryName("");
      queryClient.setQueryData(
        ["spend-categories"],
        (currentCategories: typeof categories = []) => {
          const nextCategory = response.data;
          if (
            currentCategories.some((category) => category.id === nextCategory.id)
          ) {
            return currentCategories;
          }

          return [...currentCategories, nextCategory].sort((left, right) =>
            left.name.localeCompare(right.name),
          );
        },
      );
    },
  });

  async function deleteCategory(categoryId: number, confirm = false) {
    setDeleteError(null);
    setDeletingCategoryId(categoryId);

    try {
      await api.delete(
        confirm
          ? `/spend-categories/${categoryId}?confirm=true`
          : `/spend-categories/${categoryId}`,
      );

      setDeleteWarning((current) =>
        current?.categoryId === categoryId ? null : current,
      );
      queryClient.setQueryData(
        ["spend-categories"],
        (currentCategories: typeof categories = []) =>
          currentCategories.filter((category) => category.id !== categoryId),
      );
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["month-report"] });
      queryClient.invalidateQueries({ queryKey: ["months"] });
    } catch (error) {
      const errorDetails = getApiErrorDetails(error);

      if (errorDetails.status === 409) {
        setDeleteWarning({
          categoryId,
          detail:
            errorDetails.detail ??
            "Deleting this category will move linked transactions to review",
          linkedTransactions: errorDetails.linkedTransactions ?? 0,
        });
      } else {
        setDeleteError(
          errorDetails.detail ?? "Unable to delete the selected category",
        );
      }
    } finally {
      setDeletingCategoryId((current) => (current === categoryId ? null : current));
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    mutation.mutate();
  }

  async function saveCategoryName(categoryId: number) {
    const trimmedName = editingCategoryName.trim();
    if (!trimmedName) {
      setDeleteError("Category name cannot be blank");
      return;
    }

    setDeleteError(null);
    setSavingCategoryId(categoryId);

    try {
      const response = await api.patch(`/spend-categories/${categoryId}`, {
        name: trimmedName,
      });

      queryClient.setQueryData(
        ["spend-categories"],
        (currentCategories: typeof categories = []) =>
          currentCategories
            .map((category) =>
              category.id === categoryId ? response.data : category,
            )
            .sort((left, right) => left.name.localeCompare(right.name)),
      );
      setEditingCategoryId(null);
      setEditingCategoryName("");
      setOpenMenuCategoryId(null);
    } catch (error) {
      const errorDetails = getApiErrorDetails(error);
      setDeleteError(errorDetails.detail ?? "Unable to rename the selected category");
    } finally {
      setSavingCategoryId((current) => (current === categoryId ? null : current));
    }
  }

  return (
    <section className="report-home workflow-page">
      <p className="report-home__eyebrow">Categories</p>
      <h2>Keep category rules aligned to reporting</h2>
      <p className="report-home__copy">
        Review the category set used in imports and manual entries before the
        report is finalized.
      </p>

      {deleteError ? <p className="status-copy">{deleteError}</p> : null}

      <form className="inline-form" onSubmit={handleSubmit}>
        <label className="field">
          New category
          <input
            onChange={(event) => setNewCategoryName(event.target.value)}
            required
            value={newCategoryName}
          />
        </label>
        <button className="button-primary" type="submit">
          {mutation.isPending ? "Adding…" : "Add category"}
        </button>
      </form>

      <div className="stack-list">
        {categories.map((category) => (
          <article className="stack-list__item" key={category.id}>
            <div className="stack-list__content">
              {editingCategoryId === category.id ? (
                <label className="field">
                  Rename category
                  <input
                    aria-label="Rename category"
                    onChange={(event) => setEditingCategoryName(event.target.value)}
                    value={editingCategoryName}
                  />
                </label>
              ) : (
                <>
                  <h3>{category.name}</h3>
                  <p>{category.is_active ? "Active" : "Archived"}</p>
                </>
              )}
              {deleteWarning?.categoryId === category.id ? (
                <div className="stack-list__warning">
                  <p>
                    {deleteWarning.detail}. {deleteWarning.linkedTransactions} tagged
                    transactions will become uncategorized and move to review.
                  </p>
                  <div className="stack-list__actions">
                    <button
                      className="button-primary"
                      disabled={deletingCategoryId === category.id}
                      onClick={() => deleteCategory(category.id, true)}
                      type="button"
                    >
                      {deletingCategoryId === category.id
                        ? "Deleting…"
                        : `Confirm delete ${category.name}`}
                    </button>
                    <button
                      className="button-secondary"
                      disabled={deletingCategoryId === category.id}
                      onClick={() => setDeleteWarning(null)}
                      type="button"
                    >
                      Keep category
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="stack-list__menu">
              {editingCategoryId === category.id ? (
                <div className="stack-list__actions">
                  <button
                    className="button-primary"
                    disabled={savingCategoryId === category.id}
                    onClick={() => saveCategoryName(category.id)}
                    type="button"
                  >
                    {savingCategoryId === category.id
                      ? "Saving…"
                      : `Save category name for ${category.name}`}
                  </button>
                  <button
                    className="button-secondary"
                    disabled={savingCategoryId === category.id}
                    onClick={() => {
                      setEditingCategoryId(null);
                      setEditingCategoryName("");
                    }}
                    type="button"
                  >
                    Cancel rename
                  </button>
                </div>
              ) : (
                <>
                  <button
                    aria-expanded={openMenuCategoryId === category.id}
                    aria-label={`More actions for ${category.name}`}
                    className="icon-button"
                    onClick={() =>
                      setOpenMenuCategoryId((current) =>
                        current === category.id ? null : category.id,
                      )
                    }
                    type="button"
                  >
                    ...
                  </button>
                  {openMenuCategoryId === category.id ? (
                    <div className="stack-list__menu-panel" role="menu">
                      <button
                        className="stack-list__menu-action"
                        onClick={() => {
                          setEditingCategoryId(category.id);
                          setEditingCategoryName(category.name);
                          setOpenMenuCategoryId(null);
                          setDeleteWarning(null);
                          setDeleteError(null);
                        }}
                        type="button"
                      >
                        Rename {category.name}
                      </button>
                      <button
                        className="stack-list__menu-action stack-list__menu-action--danger"
                        disabled={deletingCategoryId === category.id}
                        onClick={() => {
                          setOpenMenuCategoryId(null);
                          deleteCategory(category.id);
                        }}
                        type="button"
                      >
                        {deletingCategoryId === category.id
                          ? "Deleting…"
                          : `Delete ${category.name}`}
                      </button>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
