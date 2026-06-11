import { describe, it, expect } from "vitest";
import { z } from "zod";

const whatsappSchema = z
  .string()
  .optional()
  .refine(val => {
    if (!val) return true;
    return /^\+\d{10,15}$/.test(val.replace(/\s+/g, ""));
  }, "WhatsApp number must be in international format (e.g., +91XXXXXXXXXX)");

describe("WhatsApp Validation Schema", () => {
  it("should accept a valid international phone number", () => {
    const res = whatsappSchema.safeParse("+919876543210");
    expect(res.success).toBe(true);
  });

  it("should accept a valid international phone number with spaces", () => {
    const res = whatsappSchema.safeParse("+91 98765 43210");
    expect(res.success).toBe(true);
  });

  it("should accept undefined or empty string as valid optional values", () => {
    expect(whatsappSchema.safeParse(undefined).success).toBe(true);
    expect(whatsappSchema.safeParse("").success).toBe(true);
  });

  it("should reject numbers without country code '+' prefix", () => {
    const res = whatsappSchema.safeParse("919876543210");
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0].message).toBe(
        "WhatsApp number must be in international format (e.g., +91XXXXXXXXXX)"
      );
    }
  });

  it("should reject numbers that are too short", () => {
    const res = whatsappSchema.safeParse("+9198");
    expect(res.success).toBe(false);
  });

  it("should reject numbers that are too long", () => {
    const res = whatsappSchema.safeParse("+919876543210123456");
    expect(res.success).toBe(false);
  });

  it("should reject non-numeric characters", () => {
    const res = whatsappSchema.safeParse("+919876543210a");
    expect(res.success).toBe(false);
  });
});
