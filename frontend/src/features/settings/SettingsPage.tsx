import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "../../lib/api";
import { useSettings } from "../month-workflow/workflow-data";
import { currencyOptions } from "./currency-options";

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: settings } = useSettings();
  const [displayName, setDisplayName] = useState("");
  const [currencyCode, setCurrencyCode] = useState("USD");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [profileFeedback, setProfileFeedback] = useState<string | null>(null);
  const [passwordFeedback, setPasswordFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!settings) {
      return;
    }

    setDisplayName(settings.display_name);
    setCurrencyCode(settings.currency_code);
  }, [settings]);

  const settingsMutation = useMutation({
    mutationFn: async () =>
      api.patch("/settings", {
        display_name: displayName,
        currency_code: currencyCode,
      }),
    onSuccess: () => {
      setProfileFeedback("Settings updated.");
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      queryClient.invalidateQueries({ queryKey: ["month-report"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: () => {
      setProfileFeedback("Unable to update settings.");
    },
  });

  const passwordMutation = useMutation({
    mutationFn: async () =>
      api.patch("/settings/password", {
        current_password: currentPassword,
        new_password: newPassword,
      }),
    onSuccess: () => {
      setPasswordFeedback("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
    },
    onError: () => {
      setPasswordFeedback("Unable to change password.");
    },
  });

  function handleSettingsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileFeedback(null);
    settingsMutation.mutate();
  }

  function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordFeedback(null);
    passwordMutation.mutate();
  }

  return (
    <section className="report-home workflow-page">
      <p className="report-home__eyebrow">Settings</p>
      <h2>Global configuration</h2>
      <p className="report-home__copy">
        Manage your profile, password, and currency preference from one place.
      </p>

      <div className="report-sections">
        <section className="report-panel">
          <div className="report-panel__header">
            <h3>Profile</h3>
            <span>View your account details and update your display name.</span>
          </div>
          <form className="workflow-form" onSubmit={handleSettingsSubmit}>
            <label className="field">
              Username
              <input disabled value={settings?.username ?? ""} />
            </label>
            <label className="field">
              Display name
              <input
                onChange={(event) => setDisplayName(event.target.value)}
                value={displayName}
              />
            </label>
            <div className="field field--readonly">
              <span>Created</span>
              <strong>
                {settings?.created_at ? formatTimestamp(settings.created_at) : "Loading…"}
              </strong>
            </div>
            <label className="field">
              Currency
              <select
                onChange={(event) => setCurrencyCode(event.target.value)}
                value={currencyCode}
              >
                {currencyOptions.map((option: { value: string; label: string }) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <button className="button-primary" type="submit">
              {settingsMutation.isPending
                ? "Saving…"
                : "Save profile and preferences"}
            </button>
          </form>
          {profileFeedback ? <p className="status-copy">{profileFeedback}</p> : null}
        </section>

        <section className="report-panel">
          <div className="report-panel__header">
            <h3>Security</h3>
            <span>Change your password for this local account.</span>
          </div>
          <form className="workflow-form" onSubmit={handlePasswordSubmit}>
            <label className="field">
              Current password
              <input
                onChange={(event) => setCurrentPassword(event.target.value)}
                type="password"
                value={currentPassword}
              />
            </label>
            <label className="field">
              New password
              <input
                onChange={(event) => setNewPassword(event.target.value)}
                type="password"
                value={newPassword}
              />
            </label>
            <button className="button-primary" type="submit">
              {passwordMutation.isPending ? "Updating…" : "Change password"}
            </button>
          </form>
          {passwordFeedback ? <p className="status-copy">{passwordFeedback}</p> : null}
        </section>
      </div>
    </section>
  );
}
