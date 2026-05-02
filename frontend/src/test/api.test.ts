import { AxiosHeaders } from "axios";

import {
  AUTH_TOKEN_STORAGE_KEY,
  SESSION_ACTIVITY_STORAGE_KEY,
  api,
  normalizeApiBaseUrl,
} from "../lib/api";

describe("normalizeApiBaseUrl", () => {
  test("upgrades insecure absolute API URLs when the page is served over https", () => {
    expect(
      normalizeApiBaseUrl(
        "http://api.example.com",
        "https:",
      ),
    ).toBe("https://api.example.com");
  });
});

describe("api session interceptor", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test("login requests bypass the active-session redirect guard", async () => {
    const interceptor = api.interceptors.request.handlers?.[0]?.fulfilled;

    expect(interceptor).toBeDefined();

    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, "stale-token");
    window.localStorage.setItem(SESSION_ACTIVITY_STORAGE_KEY, "1");

    const result = await interceptor?.({
      headers: new AxiosHeaders(),
      url: "/auth/login",
    });

    expect(window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBe("stale-token");
    expect(window.localStorage.getItem(SESSION_ACTIVITY_STORAGE_KEY)).toBe("1");
    expect(result?.headers?.get?.("Authorization")).toBeUndefined();
  });
});
