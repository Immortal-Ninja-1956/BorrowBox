import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { nanoid } from "nanoid";
import { uploadFile, isCloudinaryConfigured } from "./storage";

// Ensure uploads directory exists (fallback for local development)
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Use memory storage to upload buffers directly
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error("Only image files (jpg, png, gif, webp) are allowed"));
    }
  },
});

export const uploadRouter = Router();

uploadRouter.post("/api/upload", upload.single("image"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No image file provided" });
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
});
