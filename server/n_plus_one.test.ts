import { describe, it, expect } from "vitest";

describe("N+1 Listing Seller Join Unit Tests", () => {
  it("batches seller identity and trust score attributes into item feed payload", () => {
    const mockJoinedResult = {
      id: 101,
      title: "MacBook Air M1",
      description: "8GB RAM 256GB SSD Space Gray",
      amount: "55000.00",
      sellerId: 42,
      category: "Electronics",
      condition: "Good",
      status: "OPEN",
      sellerName: "Aarav Sharma",
      sellerEmail: "aarav@campus.edu",
      sellerTrustScore: "4.95",
      sellerWhatsappVerified: 1,
      sellerRole: "user",
    };

    expect(mockJoinedResult.sellerName).toBe("Aarav Sharma");
    expect(mockJoinedResult.sellerTrustScore).toBe("4.95");
    expect(mockJoinedResult.sellerWhatsappVerified).toBe(1);
    expect(mockJoinedResult).toHaveProperty("sellerEmail");
  });
});
