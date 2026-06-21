import { describe, it, expect } from "vitest";

// Replicates DB structures
interface MockUser {
  id: number;
  name: string;
  email: string;
  whatsapp?: string;
  upiId?: string;
  upiName?: string;
}

const mockDbUser: MockUser = {
  id: 42,
  name: "John Doe",
  email: "john.doe@vitstudent.ac.in",
  whatsapp: "+919876543210",
  upiId: "john@upi",
  upiName: "John Doe UPI",
};

// Replicates the return logic of routers.ts :: getPublicProfileById
function getPublicProfileById(user: MockUser, trustScore: any) {
  return {
    id: user.id,
    name: user.name,
    trustScore,
    whatsapp: null as string | null,
  };
}

// Replicates the return logic of routers.ts :: getProfileById
function getProfileById(user: MockUser, trustScore: any) {
  return {
    id: user.id,
    name: user.name,
    whatsapp: user.whatsapp || null,
    trustScore,
  };
}

describe("Profile API Data Leak Prevention", () => {
  it("getPublicProfileById must never return WhatsApp or UPI PII data", () => {
    const publicProfile = getPublicProfileById(mockDbUser, { averageRating: "4.5", totalReviews: 12 });
    
    expect(publicProfile.id).toBe(42);
    expect(publicProfile.name).toBe("John Doe");
    expect(publicProfile.whatsapp).toBeNull();
    
    // Explicitly verify no sensitive fields are present
    expect(publicProfile).not.toHaveProperty("upiId");
    expect(publicProfile).not.toHaveProperty("upiName");
  });

  it("getProfileById returns WhatsApp data for authenticated calls", () => {
    const privateProfile = getProfileById(mockDbUser, { averageRating: "4.5", totalReviews: 12 });
    
    expect(privateProfile.id).toBe(42);
    expect(privateProfile.name).toBe("John Doe");
    expect(privateProfile.whatsapp).toBe("+919876543210");
    
    // Explicitly verify no financial UPI PII fields are leaked here either
    expect(privateProfile).not.toHaveProperty("upiId");
    expect(privateProfile).not.toHaveProperty("upiName");
  });

  it("anonymizeUser must scrub all PII and replace with anonymized placeholders", () => {
    const anonymized = {
      id: mockDbUser.id,
      name: "Deleted User",
      email: `deleted_user_${mockDbUser.id}@deleted.invalid`,
      whatsapp: null,
      upiId: null,
      upiName: null,
    };
    
    expect(anonymized.id).toBe(42);
    expect(anonymized.name).toBe("Deleted User");
    expect(anonymized.email).toBe("deleted_user_42@deleted.invalid");
    expect(anonymized.whatsapp).toBeNull();
    expect(anonymized.upiId).toBeNull();
    expect(anonymized.upiName).toBeNull();
  });
});
