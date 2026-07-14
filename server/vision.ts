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

    // Run safe search, label detection, and image properties analysis in parallel
    const [safeSearchRes, labelRes, propertiesRes] = await Promise.all([
      client.safeSearchDetection(imageInput),
      client.labelDetection(imageInput),
      client.imageProperties(imageInput),
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

    // 2. Evaluate Image Properties (Solid colors, extreme darkness/brightness)
    const properties = propertiesRes[0]?.imagePropertiesAnnotation;
    if (properties && properties.dominantColors && properties.dominantColors.colors) {
      const colors = properties.dominantColors.colors;
      if (colors.length > 0) {
        // Check for solid color (empty tile or flat image)
        const primaryColor = colors[0];
        if (primaryColor.pixelFraction && primaryColor.pixelFraction > 0.85) {
          return {
            safe: false,
            reason: "This image looks like a solid color or empty tile. Please upload a clear photo of the item.",
          };
        }

        // Check for extreme brightness/darkness (weighted average luminance)
        let totalScore = 0;
        let weightedLuminance = 0;

        for (const col of colors) {
          const colorObj = col.color;
          const score = col.score || 0;
          if (colorObj) {
            const r = colorObj.red || 0;
            const g = colorObj.green || 0;
            const b = colorObj.blue || 0;
            // Standard relative luminance formula
            const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
            weightedLuminance += luminance * score;
            totalScore += score;
          }
        }

        if (totalScore > 0) {
          const avgLuminance = weightedLuminance / totalScore;
          if (avgLuminance < 15) {
            return {
              safe: false,
              reason: "This image is too dark. Please upload a brighter, clearer photo.",
            };
          }
          if (avgLuminance > 240) {
            return {
              safe: false,
              reason: "This image is too bright or overexposed. Please upload a clearer photo.",
            };
          }
        }
      }
    }

    // 3. Evaluate Labels
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
      "knife",
      // Human & Face restrictions
      "human",
      "person",
      "people",
      "face",
      "faces",
      "selfie",
      "portrait",
      "avatar",
      // Animal restrictions
      "animal",
      "animals",
      "dog",
      "dogs",
      "cat",
      "cats",
      "pet",
      "pets",
      // Waste/Offensive restrictions
      "poop",
      "poops",
      "feces",
      "manure",
      "dung",
      "shit",
      "trash",
      "garbage",
      "waste",
      "junk",
      "rubbish",
      // Random/Unwanted categories (Vehicles, Buildings, lighting)
      "car",
      "cars",
      "bike",
      "bikes",
      "bicycle",
      "bicycles",
      "motorcycle",
      "motorcycles",
      "scooter",
      "scooters",
      "vehicle",
      "vehicles",
      "building",
      "buildings",
      "house",
      "houses",
      "architecture",
      "tubelight",
      "fluorescent lamp",
      "light bulb",
      "neon sign",
      // Image Quality Checks
      "blur",
      "blurry",
      "lens flare",
      "bokeh",
      "out of focus",
      "glare",
      "light source",
      "overexposure",
      "underexposure"
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
