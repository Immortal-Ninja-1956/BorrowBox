import { describe, it, expect } from "vitest";
import { z } from "zod";

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

describe("Forgot Password Schema Validation", () => {
  it("should accept a valid email for forgot password", () => {
    const res = forgotPasswordSchema.safeParse({ email: "user@example.com" });
    expect(res.success).toBe(true);
  });

  it("should reject an invalid email format", () => {
    const res = forgotPasswordSchema.safeParse({ email: "invalid-email" });
    expect(res.success).toBe(false);
  });

  it("should accept valid token and password of min length 8", () => {
    const res = resetPasswordSchema.safeParse({
      token: "sometoken123",
      password: "securepassword",
    });
    expect(res.success).toBe(true);
  });

  it("should reject passwords shorter than 8 characters", () => {
    const res = resetPasswordSchema.safeParse({
      token: "sometoken123",
      password: "short",
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0].message).toBe(
        "Password must be at least 8 characters"
      );
    }
  });
});
