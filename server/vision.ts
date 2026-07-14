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
    let imageBuffer: Buffer;

    // Fetch the image as a Buffer to guarantee Google Vision can read it.
    // Passing URLs directly often fails if Google's bots are blocked by CDNs.
    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to download remote image: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
    } else {
      // Local path on disk (e.g. /uploads/filename.jpg)
      const localPath = path.join(process.cwd(), imageUrl.startsWith("/") ? imageUrl.slice(1) : imageUrl);
      if (!fs.existsSync(localPath)) {
        console.warn(`[Vision API] Local image file not found at ${localPath}`);
        return { safe: true };
      }
      imageBuffer = await fs.promises.readFile(localPath);
    }

    // Run safe search, label detection, image properties, and text detection (OCR) in parallel
    const [safeSearchRes, labelRes, propertiesRes, textRes] = await Promise.all([
      client.safeSearchDetection(imageBuffer),
      client.labelDetection(imageBuffer),
      client.imageProperties(imageBuffer),
      client.textDetection(imageBuffer), // NEW: OCR to catch text written on images
    ]);

    // 1. Evaluate SafeSearch (Explicit, Violence, etc.)
    const safeSearch = safeSearchRes[0]?.safeSearchAnnotation;
    if (safeSearch) {
      const adult = safeSearch.adult || "UNKNOWN";
      const violence = safeSearch.violence || "UNKNOWN";
      const racy = safeSearch.racy || "UNKNOWN";
      const medical = safeSearch.medical || "UNKNOWN";

      // Make it stricter: block POSSIBLE as well for explicit content
      if (
        SAFETY_LEVELS.includes(adult) || 
        SAFETY_LEVELS.includes(violence) || 
        SAFETY_LEVELS.includes(racy) ||
        adult === "POSSIBLE" || 
        violence === "POSSIBLE"
      ) {
        return { safe: false, reason: "Image contains inappropriate or explicit content." };
      }
    }

    // 2. Evaluate Image Properties (Solid colors, extreme darkness/brightness)
    const properties = propertiesRes[0]?.imagePropertiesAnnotation;
    if (properties && properties.dominantColors && properties.dominantColors.colors) {
      const colors = properties.dominantColors.colors;
      if (colors.length > 0) {
        const primaryColor = colors[0];
        // Empty tile / solid color block
        if (primaryColor.pixelFraction && primaryColor.pixelFraction > 0.85) {
          return { safe: false, reason: "This image looks like a solid color or empty tile. Please upload a clear photo." };
        }

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
          if (avgLuminance < 15) return { safe: false, reason: "Image is too dark." };
          if (avgLuminance > 240) return { safe: false, reason: "Image is overexposed or too bright." };
        }
      }
    }

    // 3. Optical Character Recognition (OCR) Check
    // If an engineering student writes "cigs" or "vape" on the image to bypass labels!
    const textAnnotations = textRes[0]?.textAnnotations;
    if (textAnnotations && textAnnotations.length > 0) {
      const extractedText = textAnnotations[0].description?.toLowerCase() || "";
      const textBannedWords = ["maggi", "noodle", "kettle", "drug", "cigar", "vape", "gun", "knife", "weapon", "smoke", "weed"];
      const containsBannedText = textBannedWords.some(w => extractedText.includes(w));
      if (containsBannedText) {
        console.log(`[Vision API] Blocked due to OCR text: ${extractedText.replace(/\n/g, " ")}`);
        return { safe: false, reason: "The image contains restricted text." };
      }
    }

    // 4. Evaluate Labels
    const labels = labelRes[0]?.labelAnnotations || [];
    const BANNED_KEYWORDS = [
      // Prohibited Items
      "maggi", "noodle", "noodles", "kettle", "harmful", "substance", "substances",
      "weapon", "drug", "drugs", "cigarette", "cigarettes", "tobacco", "alcohol",
      "liquor", "vape", "gun", "knife",
      
      // Human & Face restrictions (expanded)
      "human", "person", "people", "face", "faces", "selfie", "portrait", "avatar",
      "skin", "smile", "head", "nose", "chin", "forehead", "cheek", // Catches partial faces like Travis Scott
      
      // Animal restrictions
      "animal", "animals", "dog", "dogs", "cat", "cats", "pet", "pets",
      
      // Waste/Offensive restrictions
      "poop", "poops", "feces", "manure", "dung", "shit", "trash", "garbage", "waste", "junk", "rubbish",
      
      // Random/Unwanted categories
      "car", "cars", "bike", "bikes", "bicycle", "bicycles", "motorcycle", "motorcycles",
      "scooter", "scooters", "vehicle", "vehicles", "building", "buildings", "house", "houses",
      "architecture", "tubelight", "fluorescent lamp", "light bulb", "neon sign",
      
      // Fake/Digital Images (Force them to upload real photos)
      "illustration", "clip art", "drawing", "cartoon", "animation", "anime", "sketch",
      "vector graphics", "screenshot", "meme", "collage", "poster", "graphics", 
      "fictional character", "mascot", "logo", "font", "design", "stuffed toy", "toy",
      
      // Image Quality Checks
      "blur", "blurry", "lens flare", "bokeh", "out of focus", "glare", "light source"
    ];

    for (const label of labels) {
      const labelDesc = label.description?.toLowerCase() || "";
      const score = label.score || 0;

      // Threshold at 0.60 to balance accuracy and catching hidden items
      if (score > 0.60) {
        const isBanned = BANNED_KEYWORDS.some(keyword => {
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
    
    const errMsg = error?.message?.toLowerCase() || "";
    
    // If it's a quota/auth error, fail-safe (allow it) so the site doesn't break
    if (errMsg.includes("quota") || errMsg.includes("authentication") || errMsg.includes("permission_denied")) {
      return { safe: true };
    }

    // Clean, user-friendly error message
    return { safe: false, reason: "Image verification failed: The uploaded file is corrupt or unreadable. Please try another photo." };
  }
}
