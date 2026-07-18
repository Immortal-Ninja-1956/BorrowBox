import vision from "@google-cloud/vision";
import path from "path";
import fs from "fs";

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
  console.warn("[Vision API] Credentials missing. Uploads allowed (no moderation).");
}

// ── WHITELIST ─────────────────────────────────────────────────────────────────
// At least one of these must appear with >0.70 confidence.
// This is the strongest line of defense — require a valid item to be detected.
const ALLOWED_ITEM_LABELS = [
  // Electronics
  "electronics", "electronic device", "gadget", "laptop", "computer", "tablet",
  "smartphone", "mobile phone", "phone", "camera", "lens", "headphones", "earphone",
  "speaker", "microphone", "keyboard", "mouse", "charger", "cable", "adapter",
  "battery", "remote control", "game controller", "console", "joystick", "hard drive",
  "tripod", "projector", "router", "modem",
  // Books & stationery
  "book", "textbook", "novel", "magazine", "calculator", "stationery", "pen", "pencil",
  // Furniture
  "furniture", "chair", "table", "desk", "shelf", "cupboard", "wardrobe", "sofa", "mattress",
  // Bags & accessories
  "bag", "backpack", "luggage", "suitcase", "wallet", "watch", "clock", "glasses", "sunglasses",
  // Clothing & footwear
  "clothing", "jacket", "shirt", "jeans", "sneakers", "boots",
  // Sports & instruments
  "musical instrument", "guitar", "violin", "drum", "sports equipment", "racket", "bat",
  "helmet", "glove", "bicycle", "cycle", "tent", "sleeping bag",
  // Tools & appliances
  "tool", "drill", "hammer", "wrench", "screwdriver", "fan", "iron", "mixer", "heater",
  // Toys & games (real items)
  "board game", "chess", "playing card", "action figure", "doll", "toy",
  // Art supplies
  "art supply", "paint", "canvas", "brush",
];

// ── BLOCKLIST ─────────────────────────────────────────────────────────────────
const BANNED_LABELS = [
  // People & body parts
  "person", "human", "face", "selfie", "smile", "forehead", "nose", "eyebrow", "chin",
  "cheek", "hair", "beard", "moustache", "skin", "head", "hand", "finger", "thumb",
  "arm", "leg", "foot", "ear", "mouth", "tooth", "eye", "eyelash", "crowd", "audience",
  "people", "friendship", "gesture", "thumbs up", "middle finger", "portrait",
  // Animals
  "dog", "cat", "puppy", "kitten", "cow", "goat", "monkey", "pigeon", "bird", "squirrel",
  "rat", "mouse", "insect", "cockroach", "lizard", "snake", "fish", "animal", "mammal",
  "pet", "carnivore", "canidae", "felidae", "wildlife", "livestock", "fauna", "snout",
  "whiskers", "paw", "fur",
  // Memes / cartoons / non-real-photo content
  "meme", "cartoon", "animated cartoon", "animation", "anime", "manga", "comics",
  "illustration", "drawing", "sketch", "clip art", "clipart", "fictional character",
  "screenshot", "graffiti", "emoticon", "emoji", "sticker", "caricature", "digital art",
  "collage",
  // Lights & random ceiling/sky shots
  "light fixture", "fluorescent lamp", "tube light", "chandelier", "lens flare",
  "glare", "light bulb",
  // Blank/junk shots
  "darkness", "blur", "shadow",
  // Washrooms & gross content
  "toilet", "bathroom", "urinal", "plumbing fixture", "bidet", "toilet seat", "bathtub",
  "shower", "sink", "drain", "sewage", "tap", "restroom", "waste", "garbage", "trash",
  "litter", "dustbin", "pollution", "feces", "excrement", "manure", "dung",
  // Food & drinks
  "food", "dish", "cuisine", "meal", "snack", "drink", "beverage", "plate", "fast food",
  "recipe", "ingredient", "fruit", "vegetable", "dessert", "pizza", "noodle",
  // Dangerous / illegal
  "weapon", "gun", "firearm", "pistol", "rifle", "shotgun", "knife", "blade", "sword",
  "ammunition", "bullet", "explosive", "grenade", "bomb", "cigarette", "smoking",
  "tobacco", "alcohol", "beer", "wine", "liquor", "whisky", "vodka", "drug", "cocaine",
  "heroin", "methamphetamine", "cannabis", "marijuana", "syringe", "lighter", "blood",
  "injury", "fire", "flame", "firecracker", "nudity", "pornography", "adult content",
  // Creative trolls
  "currency", "money", "cash", "banknote", "coin", "credit card", "identity document",
  "passport",
  "car", "automobile", "motorcycle", "bus", "train", "aircraft",
  "mirror", "reflection", "computer screen", "display device", "television", "monitor",
  "tree", "grass", "leaf", "flower", "plant", "soil", "rock", "stone", "puddle",
  "crack", "stain", "spider web", "underwear", "undergarment", "slipper",
];

// If these are the TOP label at >0.85 confidence → instant reject
const TOP_INSTANT_REJECT = [
  "person", "human", "face", "animal", "food", "sky", "wall", "floor",
  "building", "light", "nature", "plant", "water",
];

// ── MAIN EXPORT ───────────────────────────────────────────────────────────────
export async function checkImageSafety(
  imageUrl: string | undefined
): Promise<{ safe: boolean; reason?: string }> {
  if (!imageUrl) return { safe: true };

  if (!client) {
    console.warn("[Vision API] Skipping check — client not initialized.");
    return { safe: true };
  }

  try {
    let imageBuffer: Buffer;
    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
      const res = await fetch(imageUrl);
      if (!res.ok) throw new Error(`Failed to download image: ${res.statusText}`);
      imageBuffer = Buffer.from(await res.arrayBuffer());
    } else {
      const localPath = path.join(process.cwd(), imageUrl.startsWith("/") ? imageUrl.slice(1) : imageUrl);
      if (!fs.existsSync(localPath)) return { safe: false, reason: "Image file not found on server." };
      imageBuffer = await fs.promises.readFile(localPath);
    }

    const [result] = await client.annotateImage({
      image: { content: imageBuffer },
      features: [
        { type: "SAFE_SEARCH_DETECTION" },
        { type: "LABEL_DETECTION", maxResults: 25 },
        { type: "IMAGE_PROPERTIES" },
        { type: "TEXT_DETECTION" },
        { type: "FACE_DETECTION", maxResults: 1 },
      ],
    });

    // ── CHECK 1: SafeSearch ──────────────────────────────────────────────────
    const ss = result.safeSearchAnnotation;
    if (ss) {
      const strictLevels = ["POSSIBLE", "LIKELY", "VERY_LIKELY"];
      const normalLevels = ["LIKELY", "VERY_LIKELY"];
      if (strictLevels.includes(ss.adult || "UNKNOWN")) {
        return { safe: false, reason: "Image contains adult or explicit content." };
      }
      if (
        normalLevels.includes(ss.violence || "UNKNOWN") ||
        normalLevels.includes(ss.racy || "UNKNOWN") ||
        normalLevels.includes(ss.medical || "UNKNOWN")
      ) {
        return { safe: false, reason: "Image contains inappropriate content." };
      }
    }

    // ── CHECK 2: Face Detection — any face = reject ──────────────────────────
    const faces = result.faceAnnotations;
    if (faces && faces.length > 0) {
      console.log(`[Vision API] Blocked: ${faces.length} face(s) detected.`);
      return {
        safe: false,
        reason: "Listing photos must show the item, not people. Please upload a photo without any faces.",
      };
    }

    // ── CHECK 3: Image Properties (blank / black / white) ───────────────────
    const colors = result.imagePropertiesAnnotation?.dominantColors?.colors;
    if (colors && colors.length > 0) {
      if ((colors[0].pixelFraction ?? 0) > 0.95) {
        return { safe: false, reason: "Image appears to be a solid color. Please upload a real photo of the item." };
      }
      let totalScore = 0, weightedLum = 0;
      for (const col of colors) {
        const c = col.color, s = col.score ?? 0;
        if (c) {
          weightedLum += (0.299 * (c.red ?? 0) + 0.587 * (c.green ?? 0) + 0.114 * (c.blue ?? 0)) * s;
          totalScore += s;
        }
      }
      if (totalScore > 0) {
        const lum = weightedLum / totalScore;
        if (lum < 8) return { safe: false, reason: "Image is too dark." };
        if (lum > 248) return { safe: false, reason: "Image is completely overexposed." };
      }
    }

    // ── CHECK 4: OCR — meme/screenshot detection & prohibited text ───────────
    const textAnnotations = result.textAnnotations;
    if (textAnnotations && textAnnotations.length > 0) {
      const extractedText = (textAnnotations[0].description ?? "").toLowerCase();
      const bannedWords = ["drug", "cocaine", "heroin", "cannabis", "weed", "meth", "weapon", "gun", "pistol", "rifle", "explosive"];
      if (bannedWords.some(w => extractedText.includes(w))) {
        return { safe: false, reason: "Image contains text related to a prohibited item." };
      }
      const wordCount = extractedText.split(/\s+/).filter(Boolean).length;
      if (wordCount > 25) {
        console.log(`[Vision API] Blocked: text-heavy image (${wordCount} words) — likely meme/screenshot.`);
        return { safe: false, reason: "This looks like a screenshot, meme, or document. Please upload a real photo of the item." };
      }
    }

    // ── CHECK 5: Label analysis ──────────────────────────────────────────────
    const labels = result.labelAnnotations ?? [];

    // 5a. Top-label instant reject
    if (labels.length > 0) {
      const top = labels[0];
      const topDesc = (top.description ?? "").toLowerCase();
      const topScore = top.score ?? 0;
      if (topScore > 0.85 && TOP_INSTANT_REJECT.some(kw => topDesc.includes(kw))) {
        console.log(`[Vision API] Blocked: top label "${top.description}" (${topScore})`);
        return {
          safe: false,
          reason: `This doesn't look like a marketplace item. Top detected content: ${top.description}.`,
        };
      }
    }

    // 5b. Blocklist check (threshold: 0.60)
    for (const label of labels) {
      const desc = (label.description ?? "").toLowerCase();
      const score = label.score ?? 0;
      if (score > 0.60) {
        const hit = BANNED_LABELS.find(kw => new RegExp(`\\b${kw}\\b`, "i").test(desc));
        if (hit) {
          console.log(`[Vision API] Blocked: label "${label.description}" (${score})`);
          return {
            safe: false,
            reason: `Image contains restricted content: ${label.description}. Please upload a real photo of the item you are listing.`,
          };
        }
      }
    }

    // ── CHECK 6: Whitelist — must have at least one valid marketplace item ───
    const hasValidItem = labels.some(label => {
      const desc = (label.description ?? "").toLowerCase();
      const score = label.score ?? 0;
      return score > 0.70 && ALLOWED_ITEM_LABELS.some(allowed => desc.includes(allowed));
    });

    if (!hasValidItem) {
      const topLabels = labels.slice(0, 3).map(l => l.description).join(", ");
      console.log(`[Vision API] Blocked: no valid item detected. Top labels: ${topLabels}`);
      return {
        safe: false,
        reason:
          "We couldn't detect a recognizable marketplace item in this photo. Please upload a clear, real photo of what you're listing (e.g. laptop, book, camera, bag, etc.).",
      };
    }

    return { safe: true };
  } catch (error: any) {
    console.error("[Vision API] Error during safety analysis:", error);
    // Fail open on transient errors (quota, network) — manual review handles edge cases
    console.warn("[Vision API] Failing open due to API error — image allowed.");
    return { safe: true };
  }
}
