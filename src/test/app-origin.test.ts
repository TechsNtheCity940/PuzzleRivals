import { describe, expect, it } from "vitest";
import {
  PRODUCTION_CANONICAL_ORIGIN,
  buildAppUrl,
  resolveAppOrigin,
  resolveCanonicalBrowserUrl,
  shouldRedirectToCanonical,
} from "@/lib/app-origin";

describe("app origin helpers", () => {
  it("canonicalizes the bare production origin", () => {
    expect(resolveAppOrigin("https://puzzlerivals.com")).toBe(PRODUCTION_CANONICAL_ORIGIN);
  });

  it("preserves localhost origins", () => {
    expect(resolveAppOrigin("http://localhost:5173")).toBe("http://localhost:5173");
  });

  it("builds app urls against the canonical production host", () => {
    expect(buildAppUrl("/profile", "https://puzzlerivals.com")).toBe("https://www.puzzlerivals.com/profile");
  });

  it("rewrites bare-domain browser urls to the canonical host", () => {
    expect(resolveCanonicalBrowserUrl("https://puzzlerivals.com/store?checkout=paypal")).toBe(
      "https://www.puzzlerivals.com/store?checkout=paypal",
    );
  });

  it("only redirects when the current url is non-canonical", () => {
    expect(shouldRedirectToCanonical("https://puzzlerivals.com/season")).toBe(true);
    expect(shouldRedirectToCanonical("https://www.puzzlerivals.com/season")).toBe(false);
  });
});
