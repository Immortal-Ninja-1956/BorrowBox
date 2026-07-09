import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";
import path from "path";

// Initialize config if env variables are present
if (process.env.CLOUDINARY_URL) {
  cloudinary.config();
} else if (
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

export function isCloudinaryConfigured(): boolean {
  return !!(
    process.env.CLOUDINARY_URL ||
    (process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET)
  );
}

export async function uploadFile(
  buffer: Buffer,
  filename: string
): Promise<string> {
  if (!isCloudinaryConfigured()) {
    throw new Error("Cloudinary credentials not configured.");
  }
  
  // Convert buffer to base64 data URI to prevent stream hanging issues
  const b64 = buffer.toString("base64");
  const dataURI = `data:image/jpeg;base64,${b64}`;

  const result = await cloudinary.uploader.upload(dataURI, {
    folder: "borrowbox",
    public_id: path.parse(filename).name,
  });

  return result.secure_url;
}
