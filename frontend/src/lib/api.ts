import axios from "axios";

export const AUTH_TOKEN_STORAGE_KEY = "expense-tracker.auth-token";
export const SESSION_ACTIVITY_STORAGE_KEY = "expense-tracker.session-last-activity";
export const SESSION_TIMEOUT_MS = 5 * 60 * 1000;
const apiBaseUrl =
  typeof __APP_API_BASE_URL__ === "string" ? __APP_API_BASE_URL__ : "/api";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

export function getStoredSessionActivity(): number | null {
  if (typeof window === "undefined") {
    return null;
  }

  const storedValue = window.localStorage.getItem(SESSION_ACTIVITY_STORAGE_KEY);
  if (!storedValue) {
    return null;
  }

  const parsedValue = Number(storedValue);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

export function refreshStoredSessionActivity(timestamp = Date.now()) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    SESSION_ACTIVITY_STORAGE_KEY,
    String(timestamp),
  );
}

export function storeToken(token: string) {
  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  refreshStoredSessionActivity();
}

export function clearStoredSession() {
  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(SESSION_ACTIVITY_STORAGE_KEY);
}

export function clearStoredToken() {
  clearStoredSession();
}

export function hasActiveSession(now = Date.now()) {
  const token = getStoredToken();
  const lastActivity = getStoredSessionActivity();

  if (!token || !lastActivity) {
    clearStoredSession();
    return false;
  }

  if (now - lastActivity > SESSION_TIMEOUT_MS) {
    clearStoredSession();
    return false;
  }

  return true;
}

function redirectToLogin() {
  if (typeof window !== "undefined") {
    window.location.assign("/login");
  }
}

function isPublicRequest(url?: string) {
  return url === "/auth/login";
}

export const api = axios.create({
  baseURL: apiBaseUrl,
});

api.interceptors.request.use((config) => {
  if (isPublicRequest(config.url)) {
    return config;
  }

  if (!hasActiveSession()) {
    redirectToLogin();
    return config;
  }

  const token = getStoredToken();

  if (token) {
    refreshStoredSessionActivity();
    config.headers.set("Authorization", `Bearer ${token}`);
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearStoredSession();
      redirectToLogin();
    }

    return Promise.reject(error);
  },
);
