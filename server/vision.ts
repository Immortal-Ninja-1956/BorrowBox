import vision from "@google-cloud/vision";
import path from "path";
import fs from "fs";

// Initialize the client
// To be extremely deployment-friendly, we try to construct it using inline credentials
// from environment variables if present.
let client: any = null;

const hasCredentials = 
  process.env.GOOGLE_CLIENT_EMAIL && 
  process.env.GOOGLE_PRIVATE_KEY && 
  process.env.GOOGLE_PROJECT_ID;

if (hasCredentials) {
  try {
    client = new vision.ImageAnnotatorClient({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      },
      projectId: process.env.GOOGLE_PROJECT_ID,
    });
    console.log("[Vision API] Initialized successfully.");
  } catch (error) {
    console.error("[Vision API] Failed to initialize ImageAnnotatorClient:", error);
  }
} else {
  console.warn("[Vision API] Credentials missing. Image safety checks will be skipped.");
}

const SAFETY_LEVELS = ["LIKELY", "VERY_LIKELY"];

/**
 * Returns false if the image contains restricted items or explicit content.
 * Returns true if the image is safe (or if GCV is not configured).
 */
export async function checkImageSafety(imageUrl: string | undefined): Promise<{ safe: boolean; reason?: string }> {
  if (!imageUrl) {
    return { safe: true };
  }

  // If Vision API is not configured, we pass the image as safe
  if (!client) {
    console.log("[Vision API] Bypassing check: client not initialized.");
    return { safe: true };
  }

  try {
    let imageInput: any;

    // Check if it's a local file or a remote URL
    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
      imageInput = { source: { imageUri: imageUrl } };
    } else {
      // Local path on disk (e.g. /uploads/filename.jpg)
      const localPath = path.join(process.cwd(), imageUrl.startsWith("/") ? imageUrl.slice(1) : imageUrl);
      if (!fs.existsSync(localPath)) {
        console.warn(`[Vision API] Local image file not found at ${localPath}`);
        return { safe: true };
      }
      imageInput = localPath;
    }

    // Run safe search and label detection in parallel
    const [safeSearchRes, labelRes] = await Promise.all([
      client.safeSearchDetection(imageInput),
      client.labelDetection(imageInput),
    ]);

    // 1. Evaluate SafeSearch
    const safeSearch = safeSearchRes[0]?.safeSearchAnnotation;
    if (safeSearch) {
      const adult = safeSearch.adult || "UNKNOWN";
      const violence = safeSearch.violence || "UNKNOWN";
      const racy = safeSearch.racy || "UNKNOWN";

      if (SAFETY_LEVELS.includes(adult) || SAFETY_LEVELS.includes(violence)) {
        return { safe: false, reason: "Image contains inappropriate or explicit content." };
      }
    }

    // 2. Evaluate Labels
    const labels = labelRes[0]?.labelAnnotations || [];
    // Banned keywords for visual detection (matching labels)
    const BANNED_KEYWORDS = [
      "maggi",
      "noodle",
      "noodles",
      "kettle",
      "harmful",
      "substance",
      "substances",
      "weapon",
      "drug",
      "drugs",
      "cigarette",
      "cigarettes",
      "tobacco",
      "alcohol",
      "liquor",
      "vape",
      "gun",
      "knife"
    ];

    for (const label of labels) {
      const labelDesc = label.description?.toLowerCase() || "";
      const score = label.score || 0;

      // Only reject if it's a high confidence match (e.g. > 65% match)
      if (score > 0.65) {
        const isBanned = BANNED_KEYWORDS.some(keyword => {
          const regex = new RegExp(`\\b${keyword}\\b`, "i");
          return regex.test(labelDesc);
        });

        if (isBanned) {
          console.log(`[Vision API] Blocked image due to label: "${label.description}" (score: ${score})`);
          return {
            safe: false,
            reason: `This image appears to contain a restricted item: ${label.description}.`,
          };
        }
      }
    }

    return { safe: true };
  } catch (error) {
    console.error("[Vision API] Error during safety analysis:", error);
    // Fail-safe: if the API fails, we allow listing so we don't block users if there's a quota issue
    return { safe: true };
  }
}
