import { describe, it, expect } from "vitest";
import { isValidImageMagicBytes } from "./upload";

describe("Image Magic Bytes Validation", () => {
  it("accepts a valid JPEG buffer", () => {
    const buffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
    expect(isValidImageMagicBytes(buffer)).toBe(true);
  });

  it("accepts a valid PNG buffer", () => {
    const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
    expect(isValidImageMagicBytes(buffer)).toBe(true);
  });

  it("accepts a valid GIF buffer", () => {
    const buffer = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00]);
    expect(isValidImageMagicBytes(buffer)).toBe(true);
  });

  it("accepts a valid WEBP buffer", () => {
    const buffer = Buffer.from([
      0x52, 0x49, 0x46, 0x46, // RIFF
      0x00, 0x00, 0x00, 0x00, // file size placeholder
      0x57, 0x45, 0x42, 0x50  // WEBP
    ]);
    expect(isValidImageMagicBytes(buffer)).toBe(true);
  });

  it("rejects a text file disguised as a JPEG", () => {
    const buffer = Buffer.from("Hello world, this is a plain text file disguised as an image.");
    expect(isValidImageMagicBytes(buffer)).toBe(false);
  });

  it("rejects an executable file", () => {
    const buffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00]); // MZ header
    expect(isValidImageMagicBytes(buffer)).toBe(false);
  });

  it("rejects an SVG file containing scripts", () => {
    const buffer = Buffer.from("<svg onload='alert(1)'></svg>");
    expect(isValidImageMagicBytes(buffer)).toBe(false);
  });
});
