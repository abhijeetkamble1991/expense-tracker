import "@testing-library/jest-dom";
import { TextDecoder, TextEncoder } from "util";
import {
  Headers as CrossFetchHeaders,
  Request as CrossFetchRequest,
  Response as CrossFetchResponse,
  fetch as crossFetch,
} from "cross-fetch";

if (typeof globalThis.TextEncoder === "undefined") {
  Object.assign(globalThis, { TextEncoder });
}

if (typeof globalThis.TextDecoder === "undefined") {
  Object.assign(globalThis, { TextDecoder });
}

if (typeof globalThis.Headers === "undefined") {
  Object.assign(globalThis, { Headers: CrossFetchHeaders });
}

if (typeof globalThis.Request === "undefined") {
  Object.assign(globalThis, { Request: CrossFetchRequest });
}

if (typeof globalThis.Response === "undefined") {
  Object.assign(globalThis, { Response: CrossFetchResponse });
}

if (typeof globalThis.fetch === "undefined") {
  Object.assign(globalThis, { fetch: crossFetch });
}
