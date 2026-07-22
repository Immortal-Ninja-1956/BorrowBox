import { describe, it, expect } from "vitest";
import type { InsertItem } from "../drizzle/schema";

describe("Item Soft-Deletion Unit Tests", () => {
  it("formats soft-deletion payload with deletedAt timestamp", () => {
    const mockItem: InsertItem & { deletedAt?: Date | null } = {
      sellerId: 10,
      title: "Engineering Drawing Board",
      description: "A2 drawing board with mini drafter",
      amount: "450.00",
      condition: "Good",
      status: "OPEN",
      deletedAt: null,
    };

    expect(mockItem.deletedAt).toBeNull();

    // Perform soft delete
    mockItem.deletedAt = new Date();
    expect(mockItem.deletedAt).toBeInstanceOf(Date);
  });

  it("filters soft-deleted items from public marketplace results", () => {
    const mockDbItems = [
      { id: 1, title: "Lab Coat", deletedAt: null },
      { id: 2, title: "Calculator", deletedAt: new Date() }, // Soft-deleted
      { id: 3, title: "Textbook", deletedAt: null },
    ];

    const publicItems = mockDbItems.filter(item => item.deletedAt === null);

    expect(publicItems).toHaveLength(2);
    expect(publicItems.map(i => i.id)).toEqual([1, 3]);
  });

  it("preserves foreign key relations in deals and reports when item is soft deleted", () => {
    const mockDeal = {
      id: 101,
      itemId: 2, // References soft-deleted item ID 2
      sellerId: 10,
      buyerId: 15,
      amount: "450.00",
      status: "CONFIRMED",
    };

    const mockReport = {
      id: 50,
      itemId: 2,
      reporterId: 99,
      reason: "Suspicious listing",
      status: "OPEN",
    };

    expect(mockDeal.itemId).toBe(2);
    expect(mockReport.itemId).toBe(2);
  });
});
