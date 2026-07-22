import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";
import * as pinUtils from "./pin";
import { TRPCError } from "@trpc/server";

// Mock the DB layer
vi.mock("./db", async () => {
  const actual = await vi.importActual("./db");
  return {
    ...actual,
    getDealRawById: vi.fn(),
    setDealPinViewed: vi.fn(),
    incrementPinAttempts: vi.fn(),
    lockDealPin: vi.fn(),
    completeDealAtomically: vi.fn(),
    isDuplicateUtr: vi.fn(),
    setDealUtr: vi.fn(),
    setDealDisputed: vi.fn(),
    updateDealPinData: vi.fn(),
  };
});

// Mock pin crypto
vi.mock("./pin", async () => {
  const actual = await vi.importActual("./pin");
  return {
    ...actual,
    decryptPin: vi.fn(),
    verifyPin: vi.fn(),
    generatePin: vi.fn(),
  };
});

describe("PIN-Based Deal Completion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockDeal = {
    id: 100,
    itemId: 200,
    buyerId: 1,
    sellerId: 2,
    amount: "500",
    status: "DELIVERED",
    pinHash: "mock-hash",
    pinEncrypted: "mock-encrypted",
    pinAttempts: 0,
    pinLockedAt: null,
    pinViewedAt: null,
    utr: null,
  };

  describe("getMyDealPin", () => {
    it("should allow buyer to get pin and set pinViewedAt", async () => {
      vi.mocked(db.getDealRawById).mockResolvedValue(mockDeal as any);
      vi.mocked(pinUtils.decryptPin).mockReturnValue("123456");

      const caller = appRouter.createCaller({ req: {} as any, res: {} as any, user: { id: 1 } as any });
      const res = await caller.deals.getMyDealPin({ dealId: 100 });

      expect(res.pin).toBe("123456");
      expect(res.viewedBefore).toBe(false);
      expect(db.setDealPinViewed).toHaveBeenCalledWith(100);
    });

    it("should block non-buyer", async () => {
      vi.mocked(db.getDealRawById).mockResolvedValue(mockDeal as any);
      const caller = appRouter.createCaller({ req: {} as any, res: {} as any, user: { id: 2 } as any });

      await expect(caller.deals.getMyDealPin({ dealId: 100 })).rejects.toThrowError(
        /Only the buyer can view/
      );
    });
  });

  describe("confirmWithPin", () => {
    it("should complete deal atomically on correct pin", async () => {
      vi.mocked(db.getDealRawById).mockResolvedValue(mockDeal as any);
      vi.mocked(pinUtils.verifyPin).mockResolvedValue(true);

      const caller = appRouter.createCaller({ req: {} as any, res: {} as any, user: { id: 2 } as any });
      const res = await caller.deals.confirmWithPin({ dealId: 100, pin: "123456" });

      expect(res.success).toBe(true);
      expect(db.completeDealAtomically).toHaveBeenCalledWith(100, 200);
    });

    it("should increment attempts on wrong pin and lock at 5", async () => {
      vi.mocked(db.getDealRawById).mockResolvedValue({ ...mockDeal, pinAttempts: 4 } as any);
      vi.mocked(pinUtils.verifyPin).mockResolvedValue(false);

      const caller = appRouter.createCaller({ req: {} as any, res: {} as any, user: { id: 2 } as any });
      
      await expect(caller.deals.confirmWithPin({ dealId: 100, pin: "000000" })).rejects.toThrowError(/PIN is now locked/);
      
      expect(db.incrementPinAttempts).toHaveBeenCalledWith(100);
      expect(db.lockDealPin).toHaveBeenCalledWith(100);
    });

    it("should block if locked", async () => {
      vi.mocked(db.getDealRawById).mockResolvedValue({ ...mockDeal, pinLockedAt: new Date() } as any);

      const caller = appRouter.createCaller({ req: {} as any, res: {} as any, user: { id: 2 } as any });
      await expect(caller.deals.confirmWithPin({ dealId: 100, pin: "123456" })).rejects.toThrowError(/PIN entry is locked/);
    });

    it("should block wrong role", async () => {
      vi.mocked(db.getDealRawById).mockResolvedValue(mockDeal as any);
      const caller = appRouter.createCaller({ req: {} as any, res: {} as any, user: { id: 1 } as any });
      await expect(caller.deals.confirmWithPin({ dealId: 100, pin: "123456" })).rejects.toThrowError(/Only the seller can confirm/);
    });
  });

  describe("submitUtr", () => {
    it("should submit UTR for PAID deal", async () => {
      vi.mocked(db.getDealRawById).mockResolvedValue({ ...mockDeal, status: "PAID" } as any);
      vi.mocked(db.isDuplicateUtr).mockResolvedValue(false);

      const caller = appRouter.createCaller({ req: {} as any, res: {} as any, user: { id: 1 } as any });
      await caller.deals.submitUtr({ dealId: 100, utr: "123456789012" });

      expect(db.setDealUtr).toHaveBeenCalledWith(100, "123456789012");
    });

    it("should reject duplicate UTR", async () => {
      vi.mocked(db.getDealRawById).mockResolvedValue({ ...mockDeal, status: "PAID" } as any);
      vi.mocked(db.isDuplicateUtr).mockResolvedValue(true);

      const caller = appRouter.createCaller({ req: {} as any, res: {} as any, user: { id: 1 } as any });
      await expect(caller.deals.submitUtr({ dealId: 100, utr: "123456789012" })).rejects.toThrowError(/already been used/);
    });

    it("should reject if status is not PAID/DISPUTED", async () => {
      vi.mocked(db.getDealRawById).mockResolvedValue({ ...mockDeal, status: "DELIVERED" } as any);

      const caller = appRouter.createCaller({ req: {} as any, res: {} as any, user: { id: 1 } as any });
      await expect(caller.deals.submitUtr({ dealId: 100, utr: "123456789012" })).rejects.toThrowError(/only be submitted for completed or disputed/);
    });
  });

  describe("raiseDispute", () => {
    it("should set DISPUTED and regenerate pin", async () => {
      vi.mocked(db.getDealRawById).mockResolvedValue(mockDeal as any);
      vi.mocked(pinUtils.generatePin).mockResolvedValue({ hash: "newhash", encrypted: "newenc", plain: "000000" });

      const caller = appRouter.createCaller({ req: {} as any, res: {} as any, user: { id: 1 } as any });
      await caller.deals.raiseDispute({ dealId: 100 });

      expect(db.setDealDisputed).toHaveBeenCalledWith(100, 1);
      expect(db.updateDealPinData).toHaveBeenCalledWith(100, {
        pinHash: "newhash",
        pinEncrypted: "newenc",
        pinAttempts: 0,
        pinLockedAt: null,
      });
    });
  });
});
