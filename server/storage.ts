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
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "borrowbox",
        public_id: path.parse(filename).name,
      },
      (error, result) => {
        if (error) return reject(error);
        if (!result)
          return reject(new Error("Cloudinary upload returned no result"));
        resolve(result.secure_url);
      }
    );
    Readable.from(buffer).pipe(stream);
  });
}
