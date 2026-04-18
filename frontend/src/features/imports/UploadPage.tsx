import { FormEvent, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "../../lib/api";
import { ImportBatch } from "../month-workflow/workflow-data";

export function UploadPage() {
  const queryClient = useQueryClient();
  const [monthKey, setMonthKey] = useState("");
  const [sourceType, setSourceType] = useState("credit_card_pdf");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedBatch, setUploadedBatch] = useState<ImportBatch | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("month_key", monthKey);
      formData.append("source_type", sourceType);
      if (selectedFile) {
        formData.append("file", selectedFile);
      }

      return api.post<ImportBatch>("/imports", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: (response) => {
      setUploadedBatch(response.data);
      setFeedbackMessage("Import uploaded.");
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["months"] });
    },
    onError: () => {
      setFeedbackMessage("Unable to upload import.");
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedbackMessage(null);
    mutation.mutate();
  }

  return (
    <section className="report-home workflow-page">
      <p className="report-home__eyebrow">Upload</p>
      <h2>Bring in this month&apos;s bank and card files</h2>
      <p className="report-home__copy">
        Start imports, confirm mapping, and keep the review queue scoped to real
        exceptions.
      </p>

      <form className="workflow-form" noValidate onSubmit={handleSubmit}>
        <label className="field">
          Month
          <input
            onChange={(event) => setMonthKey(event.target.value)}
            required
            value={monthKey}
          />
        </label>
        <label className="field">
          Source type
          <select
            onChange={(event) => setSourceType(event.target.value)}
            value={sourceType}
          >
            <option value="credit_card_pdf">credit_card_pdf</option>
            <option value="upi_pdf">upi_pdf</option>
          </select>
        </label>
        <label className="field field--full">
          Statement file
          <input
            accept=".pdf"
            onChange={(event) =>
              setSelectedFile(event.target.files?.[0] ?? null)
            }
            required
            type="file"
          />
        </label>
        <button className="button-primary" type="submit">
          {mutation.isPending ? "Uploading…" : "Upload import"}
        </button>
      </form>

      {feedbackMessage ? <p className="status-copy">{feedbackMessage}</p> : null}

      {uploadedBatch ? (
        <div className="stack-list">
          <article className="stack-list__item">
            <div>
              <h3>{uploadedBatch.original_filename}</h3>
              <p>{uploadedBatch.extracted_count} transactions extracted</p>
              {uploadedBatch.warnings.length > 0 ? (
                <p>{uploadedBatch.warnings.join(" • ")}</p>
              ) : null}
            </div>
            <strong>{uploadedBatch.parse_status}</strong>
          </article>
        </div>
      ) : null}
    </section>
  );
}
