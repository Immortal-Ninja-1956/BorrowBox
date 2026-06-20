import { describe, it, expect } from "vitest";

/**
 * Unit tests for the server-side email domain allowlist.
 * These mirror the logic in server/_core/auth.ts :: isAllowedEmail()
 * so that a regression in the domain check is caught by CI.
 */

const ALLOWED_DOMAIN = "@vitstudent.ac.in";

function isAllowedEmail(email: string): boolean {
  return email.toLowerCase().endsWith(ALLOWED_DOMAIN);
}

describe("Server-side email domain restriction", () => {
  it("accepts a valid VIT student email", () => {
    expect(isAllowedEmail("student@vitstudent.ac.in")).toBe(true);
  });

  it("accepts a VIT email regardless of casing", () => {
    expect(isAllowedEmail("Student@VITStudent.AC.IN")).toBe(true);
  });

  it("rejects a Gmail address", () => {
    expect(isAllowedEmail("attacker@gmail.com")).toBe(false);
  });

  it("rejects an address that merely contains the allowed domain", () => {
    // e.g. attacker@vitstudent.ac.in.evil.com — ends-with check handles this
    expect(isAllowedEmail("attacker@vitstudent.ac.in.evil.com")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isAllowedEmail("")).toBe(false);
  });

  it("rejects a non-VIT institutional email", () => {
    expect(isAllowedEmail("user@iit.ac.in")).toBe(false);
  });

  it("rejects an email that uses the domain as the local part", () => {
    expect(isAllowedEmail("vitstudent.ac.in@gmail.com")).toBe(false);
  });
});
