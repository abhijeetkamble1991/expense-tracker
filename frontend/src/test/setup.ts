import "@testing-library/jest-dom";
import { TextDecoder, TextEncoder } from "util";

Object.assign(globalThis, {
  TextDecoder,
  TextEncoder,
});

class TestHeaders {
  private readonly values = new Map<string, string>();

  constructor(init?: HeadersInit) {
    if (!init) {
      return;
    }

    if (Array.isArray(init)) {
      init.forEach(([key, value]) => this.set(key, value));
      return;
    }

    if (init instanceof TestHeaders) {
      init.forEach((value, key) => this.set(key, value));
      return;
    }

    Object.entries(init).forEach(([key, value]) => this.set(key, value));
  }

  forEach(callback: (value: string, key: string) => void) {
    this.values.forEach((value, key) => callback(value, key));
  }

  get(name: string) {
    return this.values.get(name.toLowerCase()) ?? null;
  }

  set(name: string, value: string) {
    this.values.set(name.toLowerCase(), value);
  }
}

class TestRequest {
  headers: TestHeaders;
  method: string;
  signal: AbortSignal | null;
  url: string;

  constructor(input: string | { url: string }, init: RequestInit = {}) {
    this.url = typeof input === "string" ? input : input.url;
    this.method = init.method ?? "GET";
    this.headers = new TestHeaders(init.headers);
    this.signal = init.signal ?? null;
  }
}

class TestResponse {
  constructor(
    public readonly body: BodyInit | null = null,
    public readonly init: ResponseInit = {},
  ) {}
}

Object.assign(globalThis, {
  Headers: TestHeaders,
  Request: TestRequest,
  Response: TestResponse,
  fetch: async () => {
    throw new Error("fetch is not mocked in this test");
  },
});
