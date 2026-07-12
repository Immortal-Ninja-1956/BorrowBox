import { describe, it, expect } from "vitest";

interface MockDeal {
  id: number;
  itemId: number;
  buyerId: number;
  sellerId: number;
  amount: string;
  status: string;
}

interface MockItem {
  id: number;
  sellerId: number;
}

const mockDeal: MockDeal = {
  id: 100,
  itemId: 200,
  buyerId: 1, // User 1 is buyer
  sellerId: 2, // User 2 is seller
  amount: "500",
  status: "OPEN",
};

const mockItem: MockItem = {
  id: 200,
  sellerId: 2,
};

const allDealsForItem: MockDeal[] = [
  { id: 100, itemId: 200, buyerId: 1, sellerId: 2, amount: "500", status: "OPEN" },
  { id: 101, itemId: 200, buyerId: 3, sellerId: 2, amount: "400", status: "OPEN" },
];

// Replicates deals.getById checking logic
function handleGetById(ctx: { user?: { id: number } }, deal: MockDeal | null) {
  if (!ctx.user) {
    throw new Error("UNAUTHORIZED");
  }
  if (!deal) {
    throw new Error("NOT_FOUND");
  }
  if (ctx.user.id !== deal.buyerId && ctx.user.id !== deal.sellerId) {
    throw new Error("FORBIDDEN");
  }
  return deal;
}

// Replicates deals.getByItem filtering logic
function handleGetByItem(ctx: { user?: { id: number } }, item: MockItem | null, deals: MockDeal[]) {
  if (!ctx.user) {
    throw new Error("UNAUTHORIZED");
  }
  const user = ctx.user;
  if (!item) {
    throw new Error("NOT_FOUND");
  }
  if (user.id === item.sellerId) {
    return deals;
  }
  return deals.filter(d => d.buyerId === user.id);
}

describe("Deals API Security & Access Controls", () => {
  describe("getById", () => {
    it("should allow the buyer of the deal to view it", () => {
      const res = handleGetById({ user: { id: 1 } }, mockDeal);
      expect(res).toEqual(mockDeal);
    });

    it("should allow the seller of the deal to view it", () => {
      const res = handleGetById({ user: { id: 2 } }, mockDeal);
      expect(res).toEqual(mockDeal);
    });

    it("should throw FORBIDDEN for any other logged-in user", () => {
      expect(() => handleGetById({ user: { id: 3 } }, mockDeal)).toThrow("FORBIDDEN");
    });

    it("should throw UNAUTHORIZED for guest users", () => {
      expect(() => handleGetById({}, mockDeal)).toThrow("UNAUTHORIZED");
    });
  });

  describe("getByItem", () => {
    it("should allow the seller of the item to view all active deals", () => {
      const res = handleGetByItem({ user: { id: 2 } }, mockItem, allDealsForItem);
      expect(res.length).toBe(2);
      expect(res).toEqual(allDealsForItem);
    });

    it("should allow a buyer to view only their own deal interest", () => {
      const res = handleGetByItem({ user: { id: 1 } }, mockItem, allDealsForItem);
      expect(res.length).toBe(1);
      expect(res[0].buyerId).toBe(1);
    });

    it("should return empty list for a logged-in user with no active deal on the item", () => {
      const res = handleGetByItem({ user: { id: 99 } }, mockItem, allDealsForItem);
      expect(res.length).toBe(0);
    });

    it("should throw UNAUTHORIZED for guest users", () => {
      expect(() => handleGetByItem({}, mockItem, allDealsForItem)).toThrow("UNAUTHORIZED");
    });
  });
});
