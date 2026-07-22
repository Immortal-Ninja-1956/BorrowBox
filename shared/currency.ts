/**
 * Currency Precision Utility for BorrowBox
 * Guarantees exact fixed-point DECIMAL(10,2) currency representation and integer paise arithmetic,
 * completely eliminating floating-point precision loss.
 */

/**
 * Checks whether a string is a valid positive fixed-point currency amount with up to 2 decimal places.
 * Examples: "150", "150.5", "150.99" -> true; "150.123", "-10", "abc" -> false.
 */
export function isValidCurrencyFormat(val: string | null | undefined): boolean {
  if (!val) return false;
  const trimmed = val.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return false;
  const num = Number(trimmed);
  return !isNaN(num) && num > 0 && num <= 99999999.99;
}

/**
 * Converts a currency amount (string or number) to exact integer paise (1 Rupee = 100 Paise).
 * Example: "19.99" -> 1999 paise; 150 -> 15000 paise.
 */
export function toPaise(val: string | number): number {
  const num = typeof val === "number" ? val : Number(String(val).trim());
  if (isNaN(num) || !isFinite(num) || num < 0) return 0;
  return Math.round(num * 100);
}

/**
 * Formats integer paise back to an exact 2-decimal scale string.
 * Example: 1999 -> "19.99"; 15000 -> "150.00".
 */
export function fromPaise(paise: number): string {
  if (isNaN(paise) || !isFinite(paise) || paise < 0) return "0.00";
  return (Math.round(paise) / 100).toFixed(2);
}

/**
 * Normalizes any valid currency input into a clean DECIMAL(10,2) fixed-point string representation.
 * Prevents float rounding artifacts by calculating via integer paise.
 * Throws Error if input is invalid or <= 0.
 */
export function parseCurrencyAmount(val: string | number): string {
  if (typeof val === "string" && !isValidCurrencyFormat(val)) {
    throw new Error("Invalid currency format. Must be a positive amount up to 2 decimal places (e.g. 150 or 150.50).");
  }
  const paise = toPaise(val);
  if (paise <= 0) {
    throw new Error("Currency amount must be a positive value greater than zero.");
  }
  return fromPaise(paise);
}
