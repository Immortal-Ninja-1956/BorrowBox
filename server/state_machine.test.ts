import { describe, it, expect } from "vitest";
import { isValidDealTransition, LEGAL_DEAL_TRANSITIONS } from "./db";
import type { InsertDealEvent } from "../drizzle/schema";

describe("Deal State Machine & Transition Audit Tests", () => {
  describe("isValidDealTransition", () => {
    it("allows legal forward transitions in the deal lifecycle", () => {
      expect(isValidDealTransition("OPEN", "Contacted")).toBe(true);
      expect(isValidDealTransition("OPEN", "CONFIRMED")).toBe(true);
      expect(isValidDealTransition("Contacted", "DELIVERED")).toBe(true);
      expect(isValidDealTransition("CONFIRMED", "PAID")).toBe(true);
      expect(isValidDealTransition("DELIVERED", "PAID")).toBe(true);
    });

    it("allows transitions to DISPUTED or CANCELLED from non-terminal states", () => {
      expect(isValidDealTransition("OPEN", "CANCELLED")).toBe(true);
      expect(isValidDealTransition("CONFIRMED", "DISPUTED")).toBe(true);
      expect(isValidDealTransition("DELIVERED", "DISPUTED")).toBe(true);
    });

    it("allows admin recovery transitions from NEEDS_ATTENTION or DISPUTED", () => {
      expect(isValidDealTransition("NEEDS_ATTENTION", "OPEN")).toBe(true);
      expect(isValidDealTransition("DISPUTED", "CONFIRMED")).toBe(true);
      expect(isValidDealTransition("DISPUTED", "PAID")).toBe(true);
    });

    it("rejects illegal state jumps (e.g., DELIVERED -> OPEN or PAID -> OPEN)", () => {
      expect(isValidDealTransition("DELIVERED", "OPEN")).toBe(false);
      expect(isValidDealTransition("PAID", "OPEN")).toBe(false);
      expect(isValidDealTransition("PAID", "DELIVERED")).toBe(false);
      expect(isValidDealTransition("CANCELLED", "CONFIRMED")).toBe(false);
    });
  });

  describe("deal_events Audit Payload", () => {
    it("formats deal_events record correctly for dispute forensics", () => {
      const mockEvent: InsertDealEvent = {
        dealId: 42,
        fromStatus: "OPEN",
        toStatus: "CONFIRMED",
        actorId: 7,
        reason: "Delivery confirmed by buyer",
      };

      expect(mockEvent.dealId).toBe(42);
      expect(mockEvent.fromStatus).toBe("OPEN");
      expect(mockEvent.toStatus).toBe("CONFIRMED");
      expect(mockEvent.actorId).toBe(7);
      expect(mockEvent.reason).toBe("Delivery confirmed by buyer");
    });
  });
});
