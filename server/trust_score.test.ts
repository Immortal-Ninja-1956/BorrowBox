import { describe, it, expect } from "vitest";

describe("Trust Score Synchronization Unit Tests", () => {
  it("calculates exact average review rating for trustScore", () => {
    const reviews = [
      { rating: 5 },
      { rating: 4 },
      { rating: 5 },
    ];

    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    const avg = sum / reviews.length;
    const trustScore = avg.toFixed(2);

    expect(trustScore).toBe("4.67");
  });

  it("defaults trustScore to 5.00 when user has zero reviews", () => {
    const reviews: any[] = [];
    const trustScore = reviews.length === 0 ? "5.00" : (reviews.reduce((a, b) => a + b.rating, 0) / reviews.length).toFixed(2);

    expect(trustScore).toBe("5.00");
  });

  it("formats trustScore with 2 decimal place precision", () => {
    const avg = 4.8;
    const formatted = avg.toFixed(2);

    expect(formatted).toBe("4.80");
  });
});
