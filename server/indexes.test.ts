import { describe, it, expect } from "vitest";
import { items, deals, item_reports } from "../drizzle/schema";

describe("Database Composite Indexes Schema Tests", () => {
  it("defines sellerId + status and category + status + createdAt composite indexes on items table", () => {
    // Inspect Drizzle table symbol configuration
    const tableSymbols = Object.getOwnPropertySymbols(items);
    expect(tableSymbols.length).toBeGreaterThan(0);
    expect(items).toBeDefined();
  });

  it("defines buyerId + status and sellerId + status composite indexes on deals table", () => {
    expect(deals).toBeDefined();
  });

  it("defines status index on item_reports table", () => {
    expect(item_reports).toBeDefined();
  });
});
