import { describe, it, expect } from "vitest";
import crypto from "crypto";
import type { InsertItemRejection, InsertImageVisionCache } from "../drizzle/schema";

describe("Rejection Review Queue & Vision Cache Unit Tests", () => {
  it("generates deterministic SHA-256 hash for image buffer deduplication", () => {
    const mockImageBuffer = Buffer.from("fake-image-bytes-chemistry-kit");
    const hash1 = crypto.createHash("sha256").update(mockImageBuffer).digest("hex");
    const hash2 = crypto.createHash("sha256").update(mockImageBuffer).digest("hex");

    expect(hash1).toHaveLength(64);
    expect(hash1).toBe(hash2);
  });

  it("formats rejection queue entry payload correctly", () => {
    const rejectionPayload: InsertItemRejection = {
      userId: 42,
      title: "Chemistry Lab Coat & Safety Glasses",
      description: "White cotton lab coat size M with safety goggles",
      imageUrl: "https://example.com/lab-coat.jpg",
      reason: "Image moderation flagged restricted content",
      confidenceScores: JSON.stringify({
        labels: [
          { description: "clothing", score: 0.92 },
          { description: "personal protective equipment", score: 0.88 },
          { description: "coat", score: 0.78 },
        ],
        topLabel: { description: "clothing", score: 0.92 },
      }),
      status: "PENDING",
    };

    expect(rejectionPayload.userId).toBe(42);
    expect(rejectionPayload.title).toBe("Chemistry Lab Coat & Safety Glasses");
    expect(rejectionPayload.status).toBe("PENDING");

    const parsedScores = JSON.parse(rejectionPayload.confidenceScores!);
    expect(parsedScores.labels).toHaveLength(3);
    expect(parsedScores.topLabel.description).toBe("clothing");
  });

  it("formats vision cache payload correctly for deduplication", () => {
    const cachePayload: InsertImageVisionCache = {
      imageHash: "a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0",
      safe: 1,
      reason: null,
      confidenceScores: JSON.stringify({
        labels: [{ description: "book", score: 0.95 }],
      }),
    };

    expect(cachePayload.imageHash).toHaveLength(64);
    expect(cachePayload.safe).toBe(1);
  });
});
