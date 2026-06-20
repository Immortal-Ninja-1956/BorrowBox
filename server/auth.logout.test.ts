import "dotenv/config";
import { describe, it, expect } from "vitest";
import { hashToken } from "./_core/auth";
import { revokeToken, isTokenRevoked } from "./db";

describe("Token Revocation System", () => {
  it("should successfully revoke a token and verify it is revoked", async () => {
    const dummyToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummyPayload.dummySignature";
    const tokenHash = hashToken(dummyToken);

    // Initial state: not revoked
    const beforeRevocation = await isTokenRevoked(tokenHash);
    expect(beforeRevocation).toBe(false);

    // Revoke token
    const expiry = new Date(Date.now() + 10 * 1000); // Expires in 10 seconds
    await revokeToken(tokenHash, expiry);

    // State after revocation: revoked
    const afterRevocation = await isTokenRevoked(tokenHash);
    expect(afterRevocation).toBe(true);
  });

  it("should return false for any non-revoked token hash", async () => {
    const randomHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    const isRevoked = await isTokenRevoked(randomHash);
    expect(isRevoked).toBe(false);
  });
});
