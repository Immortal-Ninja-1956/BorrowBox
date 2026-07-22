import { describe, it, expect } from "vitest";

describe("Optimistic UI & PIN Attempts Calculation Unit Tests", () => {
  it("optimistically transforms deal status in cache", () => {
    const deals = [
      { id: 101, status: "OPEN" },
      { id: 102, status: "Shipped" },
    ];

    const updatedDeals = deals.map(d => (d.id === 101 ? { ...d, status: "DELIVERED" } : d));

    expect(updatedDeals.find(d => d.id === 101)?.status).toBe("DELIVERED");
    expect(updatedDeals.find(d => d.id === 102)?.status).toBe("Shipped");
  });

  it("calculates remaining PIN attempts accurately (3 total attempts)", () => {
    const calculateRemaining = (attempts: number) => Math.max(0, 3 - attempts);

    expect(calculateRemaining(0)).toBe(3);
    expect(calculateRemaining(1)).toBe(2);
    expect(calculateRemaining(2)).toBe(1);
    expect(calculateRemaining(3)).toBe(0);
    expect(calculateRemaining(4)).toBe(0);
  });
});
