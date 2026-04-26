import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function resolveEnvPath() {
  const candidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "..", ".env"),
    path.resolve(__dirname, "../../../.env"),
  ];

  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error("Could not locate the repository .env file for test credentials.");
  }

  return match;
}

function readEnvFile() {
  const values: Record<string, string> = {};
  const envFile = readFileSync(resolveEnvPath(), "utf-8");

  for (const line of envFile.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    values[key] = value;
  }

  return values;
}

function getRequiredCredential(name: string) {
  const value = process.env[name] ?? readEnvFile()[name];
  if (!value) {
    throw new Error(`Missing required test credential: ${name}`);
  }
  return value;
}

function toDisplayName(username: string) {
  return username.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export const bootstrapUsername = getRequiredCredential(
  "EXPENSE_TRACKER_BOOTSTRAP_USERNAME",
);
export const bootstrapPassword = getRequiredCredential(
  "EXPENSE_TRACKER_BOOTSTRAP_PASSWORD",
);
export const bootstrapDisplayName = toDisplayName(bootstrapUsername);
export const updatedBootstrapPassword = `${bootstrapPassword}-updated`;
