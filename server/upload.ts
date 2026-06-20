import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { nanoid } from "nanoid";
import { uploadFile, isCloudinaryConfigured } from "./storage";
import { authenticateRequest } from "./_core/auth";

// Ensure uploads directory exists (fallback for local development)
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Strict MIME-type list
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

// Strict file extensions
const ALLOWED_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp)$/i;

// Use memory storage to upload buffers directly
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (_req, file, cb) => {
    // 1. Verify extension
    const extMatch = ALLOWED_EXTENSIONS.test(path.extname(file.originalname));
    // 2. Verify MIME type
    const mimeMatch = ALLOWED_MIME_TYPES.includes(file.mimetype);

    if (extMatch && mimeMatch) {
      cb(null, true);
    } else {
      cb(new Error("Only standard image files (jpg, png, gif, webp) are allowed. SVGs and other formats are forbidden."));
    }
  },
});

/**
 * Validates image file content against standard file signatures (magic bytes).
 * Ensures a renamed script or executable cannot bypass our validation.
 */
export function isValidImageMagicBytes(buffer: Buffer): boolean {
  if (!buffer || buffer.length < 12) return false;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return true;
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return true;
  }

  // GIF: GIF87a (47 49 46 38 37 61) or GIF89a (47 49 46 38 39 61)
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    return true;
  }

  // WEBP: RIFF (52 49 46 46) at 0..3 and WEBP (57 45 42 50) at 8..11
  const isRiff =
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46;
  const isWebp =
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50;
  if (isRiff && isWebp) {
    return true;
  }

  return false;
}

export const uploadRouter = Router();

// Endpoint authentication middleware + file handler
uploadRouter.post(
  "/api/upload",
  async (req, res, next) => {
    try {
      const user = await authenticateRequest(req);
      if (!user) {
        res.status(401).json({ error: "Unauthorized: Please log in to upload files." });
        return;
      }
      next();
    } catch (err) {
      console.error("[Upload Auth] Verification failed:", err);
      res.status(401).json({ error: "Unauthorized: Authentication verification failed." });
    }
  },
  upload.single("image"),
  async (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: "No image file provided" });
      return;
    }

    // Double check: Verify the magic bytes of the file buffer
    if (!isValidImageMagicBytes(req.file.buffer)) {
      res.status(400).json({ error: "File content validation failed: Invalid image signature." });
      return;
    }

    const ext = path.extname(req.file.originalname);
    const filename = `${nanoid(12)}${ext}`;

    try {
      if (isCloudinaryConfigured()) {
        const imageUrl = await uploadFile(req.file.buffer, filename);
        res.json({ imageUrl });
      } else {
        // Fallback to local storage on disk
        const filepath = path.join(uploadsDir, filename);
        await fs.promises.writeFile(filepath, req.file.buffer);
        const imageUrl = `/uploads/${filename}`;
        res.json({ imageUrl });
      }
    } catch (error: any) {
      console.error("[Upload] Error uploading image:", error);
      res.status(500).json({ error: error.message || "Failed to upload image" });
    }
  }
);
