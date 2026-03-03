import { describe, expect, it } from "vitest";
import { ALLOWED_EMAIL_DOMAIN, API_BASE_URL, isAllowedEmail } from "./api";

describe("api config", () => {
  it("keeps API base URL normalized", () => {
    expect(typeof API_BASE_URL).toBe("string");
    expect(API_BASE_URL.endsWith("/")).toBe(false);
  });

  it("accepts only allowed email domain", () => {
    expect(isAllowedEmail(`usuario@${ALLOWED_EMAIL_DOMAIN}`)).toBe(true);

    const blockedDomain = ALLOWED_EMAIL_DOMAIN === "example.com" ? "example.org" : "example.com";
    expect(isAllowedEmail(`usuario@${blockedDomain}`)).toBe(false);
  });
});
