import { FormEvent, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "../../lib/api";
import { useSpendCategories } from "../month-workflow/workflow-data";

export function SpendCategoriesPage() {
  const queryClient = useQueryClient();
  const { data: categories = [] } = useSpendCategories();
  const [newCategoryName, setNewCategoryName] = useState("");

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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    mutation.mutate();
  }

  return (
    <section className="report-home workflow-page">
      <p className="report-home__eyebrow">Categories</p>
      <h2>Keep category rules aligned to reporting</h2>
      <p className="report-home__copy">
        Review the category set used in imports and manual entries before the
        report is finalized.
      </p>

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
            <div>
              <h3>{category.name}</h3>
              <p>{category.is_active ? "Active" : "Archived"}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
