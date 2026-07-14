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

  // If Vision API is not configured, strictly reject!
  if (!client) {
    return { safe: false, reason: "VISION API NOT CONFIGURED: Please check Render environment variables." };
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

    // Run safe search, label detection, image properties, and text detection (OCR) optimally
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

    // 1. Evaluate SafeSearch
    const safeSearch = result.safeSearchAnnotation;
    if (safeSearch) {
      const adult = safeSearch.adult || "UNKNOWN";
      const violence = safeSearch.violence || "UNKNOWN";
      const racy = safeSearch.racy || "UNKNOWN";

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
    const properties = result.imagePropertiesAnnotation;
    if (properties && properties.dominantColors && properties.dominantColors.colors) {
      const colors = properties.dominantColors.colors;
      if (colors.length > 0) {
        const primaryColor = colors[0];
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
    const textAnnotations = result.textAnnotations;
    if (textAnnotations && textAnnotations.length > 0) {
      const extractedText = textAnnotations[0].description?.toLowerCase() || "";
      const textBannedWords = ["maggi", "noodle", "kettle", "drug", "cigar", "vape", "gun", "knife", "weapon", "smoke", "weed", "nword"];
      const containsBannedText = textBannedWords.some(w => extractedText.includes(w));
      if (containsBannedText) {
        console.log(`[Vision API] Blocked due to OCR text: ${extractedText.replace(/\n/g, " ")}`);
        return { safe: false, reason: "The image contains restricted text." };
      }
    }

    // 4. Evaluate Labels
    const labels = result.labelAnnotations || [];
    const BANNED_KEYWORDS = [
      "maggi", "noodle", "noodles", "kettle", "harmful", "substance", "substances",
      "weapon", "drug", "drugs", "cigarette", "cigarettes", "tobacco", "alcohol",
      "liquor", "vape", "gun", "knife",
      
      "human", "person", "people", "face", "faces", "selfie", "portrait", "avatar",
      "skin", "smile", "head", "nose", "chin", "forehead", "cheek",
      
      "animal", "animals", "dog", "dogs", "cat", "cats", "pet", "pets", "hello kitty", "feline",
      
      "poop", "poops", "feces", "manure", "dung", "shit", "trash", "garbage", "waste", "junk", "rubbish",
      
      "car", "cars", "bike", "bikes", "bicycle", "bicycles", "motorcycle", "motorcycles",
      "scooter", "scooters", "vehicle", "vehicles", "building", "buildings", "house", "houses",
      "architecture", "tubelight", "fluorescent lamp", "light bulb", "neon sign",
      
      "illustration", "clip art", "drawing", "cartoon", "animation", "anime", "sketch",
      "vector graphics", "screenshot", "meme", "collage", "poster", "graphics", 
      "fictional character", "mascot", "logo", "font", "design", "stuffed toy", "toy",
      
      "blur", "blurry", "lens flare", "bokeh", "out of focus", "glare", "light source"
    ];

    for (const label of labels) {
      const labelDesc = label.description?.toLowerCase() || "";
      const score = label.score || 0;

      // Aggressive check: 40% threshold for specifically blocked items
      if (score > 0.40) {
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
    
    // We are no longer failing safe. If the API errors out for ANY reason (quota, auth, invalid args),
    // we block the image and return the EXACT error message so it can be fixed.
    return { safe: false, reason: `VISION API FAILED: ${error?.message || "Unknown error"}` };
  }
}
