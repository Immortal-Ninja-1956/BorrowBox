import { describe, it, expect } from "vitest";
import { checkTextModeration, normalizeText, levenshteinDistance } from "./moderation";

describe("Text Moderation Engine", () => {
  describe("normalizeText Helper", () => {
    it("converts leetspeak numbers and symbols to alphabet", () => {
      const { normalized, stripped } = normalizeText("w33d");
      expect(normalized).toBe("weed");
      expect(stripped).toBe("weed");
    });

    it("collapses character repetitions", () => {
      const { normalized, stripped } = normalizeText("weeeeeeed");
      expect(normalized).toBe("weed");
      expect(stripped).toBe("weed");
    });

    it("strips punctuation and whitespace in stripped version", () => {
      const { stripped } = normalizeText("k-e-t-t-l-e");
      expect(stripped).toBe("kettle");
    });
  });

  describe("levenshteinDistance Calculation", () => {
    it("calculates correct distance between strings", () => {
      expect(levenshteinDistance("weed", "weed")).toBe(0);
      expect(levenshteinDistance("weeeed", "weed")).toBe(2);
      expect(levenshteinDistance("ketle", "kettle")).toBe(1);
    });
  });

  describe("checkTextModeration - Detection Tests", () => {
    it("blocks exact banned keywords", () => {
      expect(checkTextModeration("Electric Kettle", "Used kettle").safe).toBe(false);
      expect(checkTextModeration("Maggi packet", "Selling 2 packets").safe).toBe(false);
      expect(checkTextModeration("Vape Pen", "Flavored vape").safe).toBe(false);
    });

    it("blocks leetspeak bypass attempts ('w33d', 'm@ggi', 'k3ttl3')", () => {
      expect(checkTextModeration("Selling w33d for cheap", null).safe).toBe(false);
      expect(checkTextModeration("m@ggi noodles", null).safe).toBe(false);
      expect(checkTextModeration("Electric k3ttl3", null).safe).toBe(false);
      expect(checkTextModeration("Mint v@pe pod", null).safe).toBe(false);
    });

    it("blocks symbol-separated bypass attempts ('w-e-e-d', 'k.e.t.t.l.e')", () => {
      expect(checkTextModeration("Fresh w-e-e-d", null).safe).toBe(false);
      expect(checkTextModeration("Stainless k.e.t.t.l.e", null).safe).toBe(false);
      expect(checkTextModeration("v a p e for sale", null).safe).toBe(false);
    });

    it("blocks character repetition bypass attempts ('weeeeed', 'maggggiii')", () => {
      expect(checkTextModeration("Selling weeeeed", null).safe).toBe(false);
      expect(checkTextModeration("Extra maggggiii packets", null).safe).toBe(false);
    });

    it("blocks fuzzy/typosquat variations of banned items ('ketle')", () => {
      expect(checkTextModeration("Electric ketle 1.5L", null).safe).toBe(false);
    });

    it("allows safe marketplace items", () => {
      expect(checkTextModeration("Engineering Graphics Drawing Kit", "Includes T-scale and set squares").safe).toBe(true);
      expect(checkTextModeration("Dell Core i5 Laptop", "8GB RAM, 256GB SSD in good condition").safe).toBe(true);
      expect(checkTextModeration("Scientific Calculator FX-991ES", "Ideal for semester exams").safe).toBe(true);
      expect(checkTextModeration("Study Table Lamp", "LED desk lamp with dimming").safe).toBe(true);
    });
  });
});
