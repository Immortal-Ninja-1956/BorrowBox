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
        client_email: process.env.GOOGLE_CLIENT_EMAIL?.replace(/^["']|["']$/g, ""),
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/^["']|["']$/g, "")?.replace(/\\n/g, "\n"),
      },
      projectId: process.env.GOOGLE_PROJECT_ID?.replace(/^["']|["']$/g, ""),
    });
    console.log("[Vision API] Initialized successfully.");
  } catch (error) {
    console.error("[Vision API] Failed to initialize ImageAnnotatorClient:", error);
  }
} else {
  console.warn("[Vision API] Credentials missing. Image safety checks will be skipped (uploads allowed).");
}

// Only flag things at LIKELY or VERY_LIKELY for explicit content
const SAFETY_LEVELS = ["LIKELY", "VERY_LIKELY"];

/**
 * Returns false if the image contains restricted items or explicit content.
 * Returns true if the image is safe (or if GCV is not configured).
 *
 * GRACEFUL DEGRADATION: If Vision API is not configured, uploads are ALLOWED.
 * This prevents a misconfigured env from completely breaking the platform.
 * To enforce strict moderation on production, ensure all GOOGLE_* env vars are set.
 */
export async function checkImageSafety(imageUrl: string | undefined): Promise<{ safe: boolean; reason?: string }> {
  if (!imageUrl) {
    return { safe: true };
  }

  // If Vision API is not configured, allow the upload — don't block the whole platform.
  if (!client) {
    console.warn("[Vision API] Skipping safety check — client not initialized.");
    return { safe: true };
  }

  try {
    let imageBuffer: Buffer;

    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to download remote image: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
    } else {
      const localPath = path.join(process.cwd(), imageUrl.startsWith("/") ? imageUrl.slice(1) : imageUrl);
      if (!fs.existsSync(localPath)) {
        return { safe: false, reason: "Local image file not found on server." };
      }
      imageBuffer = await fs.promises.readFile(localPath);
    }

    // Run safe search, label detection, image properties, and text detection (OCR) in one request
    const request = {
      image: { content: imageBuffer },
      features: [
        { type: "SAFE_SEARCH_DETECTION" },
        { type: "LABEL_DETECTION" },
        { type: "IMAGE_PROPERTIES" },
        { type: "TEXT_DETECTION" }
      ]
    };

    const [result] = await client.annotateImage(request);

    // ── 1. SafeSearch: block explicit adult/violent content ──────────────────
    const safeSearch = result.safeSearchAnnotation;
    if (safeSearch) {
      const adult = safeSearch.adult || "UNKNOWN";
      const violence = safeSearch.violence || "UNKNOWN";
      const racy = safeSearch.racy || "UNKNOWN";

      if (
        SAFETY_LEVELS.includes(adult) ||
        SAFETY_LEVELS.includes(violence) ||
        SAFETY_LEVELS.includes(racy)
      ) {
        return { safe: false, reason: "Image contains inappropriate or explicit content." };
      }
    }

    // ── 2. Image Properties: block solid-color blanks and completely black images ──
    const properties = result.imagePropertiesAnnotation;
    if (properties?.dominantColors?.colors) {
      const colors = properties.dominantColors.colors;
      if (colors.length > 0) {
        const primaryColor = colors[0];
        // Raised threshold: 0.95+ means almost the entire image is a single flat color (blank tile)
        if (primaryColor.pixelFraction && primaryColor.pixelFraction > 0.95) {
          return { safe: false, reason: "This image looks like a solid color or blank tile. Please upload a clear photo of the item." };
        }

        // Check for completely black / completely white images
        let totalScore = 0;
        let weightedLuminance = 0;
        for (const col of colors) {
          const colorObj = col.color;
          const score = col.score || 0;
          if (colorObj) {
            const r = colorObj.red || 0;
            const g = colorObj.green || 0;
            const b = colorObj.blue || 0;
            const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
            weightedLuminance += luminance * score;
            totalScore += score;
          }
        }
        if (totalScore > 0) {
          const avgLuminance = weightedLuminance / totalScore;
          if (avgLuminance < 8) return { safe: false, reason: "Image is too dark to be a valid listing photo." };
          if (avgLuminance > 248) return { safe: false, reason: "Image is overexposed or completely white." };
        }
      }
    }

    // ── 3. OCR: block images with explicitly prohibited text ─────────────────
    const textAnnotations = result.textAnnotations;
    if (textAnnotations && textAnnotations.length > 0) {
      const extractedText = textAnnotations[0].description?.toLowerCase() || "";
      // Only the most clearly prohibited text patterns
      const textBannedWords = ["drug", "cocaine", "heroin", "cannabis", "weed", "meth", "weapon", "gun", "pistol", "rifle", "ammo", "explosive"];
      const containsBannedText = textBannedWords.some(w => extractedText.includes(w));
      if (containsBannedText) {
        console.log(`[Vision API] Blocked due to OCR text: ${extractedText.replace(/\n/g, " ")}`);
        return { safe: false, reason: "The image contains text related to a prohibited item." };
      }
    }

    // ── 4. Labels: block genuinely prohibited item categories ────────────────
    // IMPORTANT: Keep this list FOCUSED. Over-broad lists cause false positives on
    // perfectly normal marketplace photos (e.g. a camera, laptop, sports gear).
    const BANNED_LABELS = [
      // Weapons
      "gun", "firearm", "pistol", "rifle", "shotgun", "revolver", "ammunition", "bullet",
      "knife", "dagger", "sword", "weapon", "explosive", "grenade", "bomb",
      // Drugs & substances
      "drug", "cocaine", "heroin", "methamphetamine", "cannabis", "marijuana", "tobacco",
      "cigarette", "cigar", "vape", "e-cigarette", "hookah",
      // Explicit / adult content
      "nudity", "pornography", "adult content",
      // Bodily waste
      "feces", "excrement", "manure", "dung",
    ];

    const labels = result.labelAnnotations || [];
    for (const label of labels) {
      const labelDesc = label.description?.toLowerCase() || "";
      const score = label.score || 0;

      // Only block at high confidence (60%+) to avoid false positives on ambiguous labels
      if (score > 0.60) {
        const isBanned = BANNED_LABELS.some(keyword => {
          const regex = new RegExp(`\\b${keyword}\\b`, "i");
          return regex.test(labelDesc);
        });

        if (isBanned) {
          console.log(`[Vision API] Blocked image due to label: "${label.description}" (score: ${score})`);
          return { safe: false, reason: `This image appears to contain a restricted item: ${label.description}.` };
        }
      }
    }

    return { safe: true };
  } catch (error: any) {
    console.error("[Vision API] Error during safety analysis:", error);

    // On API error (quota exceeded, network issue, etc.) — FAIL OPEN so users
    // aren't permanently blocked by a transient API problem.
    // The image will be allowed through and can be manually reviewed if needed.
    console.warn("[Vision API] Failing open due to API error — image allowed.");
    return { safe: true };
  }
}
