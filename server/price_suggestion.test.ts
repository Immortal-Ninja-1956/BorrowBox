import { describe, it, expect } from "vitest";

function calculateMedian(prices: number[]) {
  if (!prices || prices.length === 0) {
    return { suggestedPrice: null, sampleCount: 0 };
  }
  const sorted = [...prices].sort((a, b) => a - b);
  const n = sorted.length;
  let median: number;
  if (n % 2 === 1) {
    median = sorted[Math.floor(n / 2)];
  } else {
    median = (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  }
  return {
    suggestedPrice: median.toFixed(2),
    sampleCount: n,
    minPrice: sorted[0].toFixed(2),
    maxPrice: sorted[n - 1].toFixed(2),
  };
}

describe("Price Suggestion Median Calculation Unit Tests", () => {
  it("calculates exact median for an odd number of sold prices", () => {
    const prices = [100, 500, 250];
    const result = calculateMedian(prices);

    expect(result.suggestedPrice).toBe("250.00");
    expect(result.sampleCount).toBe(3);
    expect(result.minPrice).toBe("100.00");
    expect(result.maxPrice).toBe("500.00");
  });

  it("calculates exact median (average of middle pair) for an even number of sold prices", () => {
    const prices = [100, 200, 300, 400];
    const result = calculateMedian(prices);

    expect(result.suggestedPrice).toBe("250.00");
    expect(result.sampleCount).toBe(4);
    expect(result.minPrice).toBe("100.00");
    expect(result.maxPrice).toBe("400.00");
  });

  it("handles a single sold price sample", () => {
    const prices = [350];
    const result = calculateMedian(prices);

    expect(result.suggestedPrice).toBe("350.00");
    expect(result.sampleCount).toBe(1);
    expect(result.minPrice).toBe("350.00");
    expect(result.maxPrice).toBe("350.00");
  });

  it("returns null when no sold prices exist", () => {
    const prices: number[] = [];
    const result = calculateMedian(prices);

    expect(result.suggestedPrice).toBeNull();
    expect(result.sampleCount).toBe(0);
  });
});
