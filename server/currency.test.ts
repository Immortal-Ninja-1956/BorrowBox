import { describe, it, expect } from "vitest";
import {
  isValidCurrencyFormat,
  toPaise,
  fromPaise,
  parseCurrencyAmount,
} from "../shared/currency";

describe("Currency Precision Utility Unit Tests", () => {
  describe("isValidCurrencyFormat", () => {
    it("accepts valid positive currency strings with up to 2 decimal places", () => {
      expect(isValidCurrencyFormat("150")).toBe(true);
      expect(isValidCurrencyFormat("150.5")).toBe(true);
      expect(isValidCurrencyFormat("150.50")).toBe(true);
      expect(isValidCurrencyFormat("0.99")).toBe(true);
      expect(isValidCurrencyFormat("99999.99")).toBe(true);
    });

    it("rejects invalid formats, negative numbers, zero, or excess decimal places", () => {
      expect(isValidCurrencyFormat("150.123")).toBe(false);
      expect(isValidCurrencyFormat("-10")).toBe(false);
      expect(isValidCurrencyFormat("0")).toBe(false);
      expect(isValidCurrencyFormat("0.00")).toBe(false);
      expect(isValidCurrencyFormat("abc")).toBe(false);
      expect(isValidCurrencyFormat("12.3.4")).toBe(false);
      expect(isValidCurrencyFormat(null)).toBe(false);
      expect(isValidCurrencyFormat(undefined)).toBe(false);
    });
  });

  describe("toPaise & fromPaise", () => {
    it("converts currency string and number to exact integer paise", () => {
      expect(toPaise("19.99")).toBe(1999);
      expect(toPaise(150.5)).toBe(15050);
      expect(toPaise("0.01")).toBe(1);
      expect(toPaise("100")).toBe(10000);
    });

    it("formats integer paise back to DECIMAL(10,2) string", () => {
      expect(fromPaise(1999)).toBe("19.99");
      expect(fromPaise(15050)).toBe("150.50");
      expect(fromPaise(10000)).toBe("100.00");
      expect(fromPaise(1)).toBe("0.01");
    });

    it("prevents floating-point precision loss on roundtrip conversions", () => {
      const val = "19.99";
      const paise = toPaise(val); // 1999 integer
      const formatted = fromPaise(paise); // "19.99"
      expect(paise).toBe(1999);
      expect(formatted).toBe("19.99");
    });
  });

  describe("parseCurrencyAmount", () => {
    it("normalizes valid input to DECIMAL(10,2) string", () => {
      expect(parseCurrencyAmount("150")).toBe("150.00");
      expect(parseCurrencyAmount("150.5")).toBe("150.50");
      expect(parseCurrencyAmount("150.99")).toBe("150.99");
      expect(parseCurrencyAmount(299.9)).toBe("299.90");
    });

    it("throws error for invalid currency inputs", () => {
      expect(() => parseCurrencyAmount("150.123")).toThrow();
      expect(() => parseCurrencyAmount("-50")).toThrow();
      expect(() => parseCurrencyAmount("0")).toThrow();
      expect(() => parseCurrencyAmount("invalid")).toThrow();
    });
  });
});
