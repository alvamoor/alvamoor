import { describe, expect, it } from "vitest";

import { isSameOrigin } from "./same-origin";

const req = (headers: Record<string, string>) =>
  new Request("https://alvamoor.com/api/x", { method: "POST", headers });

describe("isSameOrigin", () => {
  it("trusts Fetch Metadata when present", () => {
    expect(isSameOrigin(req({ "sec-fetch-site": "same-origin" }))).toBe(true);
    expect(isSameOrigin(req({ "sec-fetch-site": "cross-site" }))).toBe(false);
    expect(isSameOrigin(req({ "sec-fetch-site": "same-site" }))).toBe(false);
  });

  it("falls back to comparing Origin with Host", () => {
    expect(
      isSameOrigin(
        req({ origin: "https://alvamoor.com", host: "alvamoor.com" }),
      ),
    ).toBe(true);
    expect(
      isSameOrigin(
        req({ origin: "https://evil.example", host: "alvamoor.com" }),
      ),
    ).toBe(false);
  });

  it("rejects a request with neither header, or a malformed Origin", () => {
    expect(isSameOrigin(req({}))).toBe(false);
    expect(
      isSameOrigin(req({ origin: "not a url", host: "alvamoor.com" })),
    ).toBe(false);
  });
});
