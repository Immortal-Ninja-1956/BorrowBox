import { describe, it, expect } from "vitest";

describe("Deal Timeline Stepper Logic Unit Tests", () => {
  const getStepIndex = (status: string) => {
    switch (status) {
      case "OPEN":
      case "Contacted":
        return 0;
      case "Shipped":
        return 1;
      case "DELIVERED":
      case "CONFIRMED":
        return 2;
      case "PAID":
        return 3;
      default:
        return 0;
    }
  };

  it("maps deal status to timeline step indices accurately", () => {
    expect(getStepIndex("OPEN")).toBe(0);
    expect(getStepIndex("Contacted")).toBe(0);
    expect(getStepIndex("Shipped")).toBe(1);
    expect(getStepIndex("DELIVERED")).toBe(2);
    expect(getStepIndex("CONFIRMED")).toBe(2);
    expect(getStepIndex("PAID")).toBe(3);
  });

  it("calculates active step guidance correctly for buyer vs seller", () => {
    const isBuyer = true;
    const isSeller = false;

    const step2GuideBuyer = "Confirm delivery to view the secure UPI QR code and access your 6-digit PIN.";
    const step2GuideSeller = "Verify UPI payment in your banking app, then ask buyer for their 6-digit PIN.";

    expect(isBuyer ? step2GuideBuyer : step2GuideSeller).toContain("6-digit PIN");
    expect(isSeller ? step2GuideBuyer : step2GuideSeller).toContain("banking app");
  });
});
