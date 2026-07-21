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
  console.warn("[Vision API] Credentials missing. Image uploads will be BLOCKED until GOOGLE_* env vars are configured.");
}

// ── WHITELIST ─────────────────────────────────────────────────────────────────
// At least one of these must appear with >0.70 confidence.
// This is the strongest line of defense — require a valid item to be detected.
const ALLOWED_ITEM_LABELS = [
  // Generic product/object labels (Google Vision frequently returns these for items)
  "product", "gadget", "technology", "device", "equipment", "appliance",
  "material", "hardware", "accessory", "object", "box", "package", "container",
  "rectangle", "plastic", "metal", "leather", "fabric", "wood",
  // Electronics
  "electronics", "electronic device", "laptop", "computer", "tablet",
  "smartphone", "mobile phone", "phone", "camera", "lens", "headphones", "earphone",
  "speaker", "microphone", "keyboard", "mouse", "charger", "cable", "adapter",
  "battery", "remote control", "game controller", "console", "joystick", "hard drive",
  "tripod", "projector", "router", "modem", "usb", "wire", "circuit",
  // Books & stationery
  "book", "textbook", "novel", "magazine", "calculator", "stationery", "pen", "pencil",
  "paper", "notebook", "document", "page", "text", "publication", "font",
  // Furniture
  "furniture", "chair", "table", "desk", "shelf", "cupboard", "wardrobe", "sofa", "mattress",
  "lamp", "cushion", "pillow",
  // Bags & accessories
  "bag", "backpack", "luggage", "suitcase", "wallet", "watch", "clock", "glasses", "sunglasses",
  "handbag", "purse", "pouch", "strap",
  // Clothing & footwear
  "clothing", "jacket", "shirt", "jeans", "sneakers", "boots", "shoe", "footwear",
  "textile", "denim", "cotton", "jersey", "hoodie", "coat", "dress", "pants", "shorts",
  // Sports & instruments
  "musical instrument", "guitar", "violin", "drum", "sports equipment", "racket", "bat",
  "helmet", "glove", "bicycle", "cycle", "tent", "sleeping bag", "ball", "net",
  // Tools & appliances
  "tool", "drill", "hammer", "wrench", "screwdriver", "fan", "iron", "mixer", "heater",
  // Toys & games (real items)
  "board game", "chess", "playing card", "action figure", "doll", "toy", "puzzle",
  // Art supplies
  "art supply", "paint", "canvas", "brush", "drawing",
  // Food Containers / Kitchenware
  "lunch box", "bottle", "flask", "tiffin", "tupperware", "container", "box", "thermos",
  // Generic visual descriptors Vision often returns for item photos
  "still life photography", "indoor", "close-up", "macro photography",
  "fashion accessory", "office supplies", "personal protective equipment",
];

// ── BLOCKLIST ─────────────────────────────────────────────────────────────────
// Only ban labels that are STRONG signals of prohibited content.
// Do NOT ban generic background elements (tree, plant, reflection, etc.) as
// they appear in the background of many legitimate item photos.
const BANNED_LABELS = [
  // People & body parts — strong selfie/portrait signals
  "person", "human", "face", "selfie", "smile", "forehead", "nose", "eyebrow", "chin",
  "cheek", "hair", "beard", "moustache", "skin", "head", "finger", "thumb",
  "crowd", "audience", "people", "friendship", "gesture", "thumbs up",
  "middle finger", "portrait",
  // Animals
  "dog", "cat", "puppy", "kitten", "cow", "goat", "monkey", "pigeon", "bird",
  "rat", "insect", "cockroach", "lizard", "snake", "animal", "mammal",
  "pet", "carnivore", "canidae", "felidae", "wildlife", "livestock",
  // Memes / cartoons / non-real-photo content
  "meme", "cartoon", "animated cartoon", "animation", "anime", "manga", "comics",
  "illustration", "drawing", "sketch", "clip art", "clipart", "fictional character",
  "graffiti", "emoticon", "emoji", "sticker", "caricature", "digital art",
  "collage",
  // Washrooms & gross content
  "toilet", "bathroom", "urinal", "plumbing fixture", "bidet", "toilet seat", "bathtub",
  "sewage", "restroom", "waste", "garbage", "trash",
  "feces", "excrement", "manure", "dung",
  // Dangerous / illegal
  "weapon", "gun", "firearm", "pistol", "rifle", "shotgun", "knife", "blade", "sword",
  "ammunition", "bullet", "explosive", "grenade", "bomb", "cigarette", "smoking",
  "tobacco", "alcohol", "beer", "wine", "liquor", "whisky", "vodka", "drug", "cocaine",
  "heroin", "methamphetamine", "cannabis", "marijuana", "syringe", "blood",
  "injury", "fire", "flame", "firecracker", "nudity", "pornography", "adult content",
  // Financial / identity trolls
  "currency", "money", "cash", "banknote", "coin", "credit card", "identity document",
  "passport",
  // Vehicles (not marketplace items)
  "car", "automobile", "motorcycle", "bus", "train", "aircraft",
  // Undergarments
  "underwear", "undergarment",
];

// If these are the TOP label at >0.85 confidence → instant reject
const TOP_INSTANT_REJECT = [
  "person", "human", "face", "animal", "sky", "wall", "floor",
  "building", "light", "nature", "plant", "water",
];

// ── MAIN EXPORT ───────────────────────────────────────────────────────────────
export async function checkImageSafety(
  imageUrl: string | undefined
): Promise<{ safe: boolean; reason?: string }> {
  if (!imageUrl) return { safe: true };

  if (!client) {
    console.error("[Vision API] BLOCKED: Client not initialized — refusing upload. Check GOOGLE_* env vars.");
    return { safe: false, reason: "Image moderation service is unavailable. Please try again later or contact support." };
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

    // Debug: log all detected labels so we can diagnose issues
    if (labels.length > 0) {
      console.log(`[Vision API] Labels for image: ${labels.map(l => `"${l.description}" (${(l.score ?? 0).toFixed(2)})`).join(', ')}`);
    } else {
      console.log(`[Vision API] No labels detected for image.`);
    }

    // 5a. Top-label instant reject — only if the TOP label is clearly non-item content
    if (labels.length > 0) {
      const top = labels[0];
      const topDesc = (top.description ?? "").toLowerCase();
      const topScore = top.score ?? 0;
      if (topScore > 0.85 && TOP_INSTANT_REJECT.some(kw => topDesc === kw)) {
        console.log(`[Vision API] Blocked: top label "${top.description}" (${topScore})`);
        return {
          safe: false,
          reason: "Please upload a clear, real photo of the item you want to sell. Landscapes, buildings, and abstract photos are not allowed.",
        };
      }
    }

    // 5b. Blocklist check — only flag if a banned label is HIGHLY confident (>0.70)
    // and appears in the top 10 labels (not a faint background detection)
    const topLabels = labels.slice(0, 10);
    for (const label of topLabels) {
      const desc = (label.description ?? "").toLowerCase();
      const score = label.score ?? 0;
      if (score > 0.70) {
        const hit = BANNED_LABELS.find(kw => desc === kw || new RegExp(`\\b${kw}\\b`, "i").test(desc));
        if (hit) {
          console.log(`[Vision API] Blocked: banned label "${label.description}" (${score})`);
          return {
            safe: false,
            reason: "This photo contains content that isn't allowed (such as memes, screenshots, selfies, or prohibited items). Please upload a clear photo of your item.",
          };
        }
      }
    }

    // ── CHECK 6: Whitelist — must have at least one valid marketplace item ───
    // Lowered threshold to 0.60 and added generic product/object labels that
    // Google Vision commonly returns for valid items.
    const hasValidItem = labels.some(label => {
      const desc = (label.description ?? "").toLowerCase();
      const score = label.score ?? 0;
      return score > 0.60 && ALLOWED_ITEM_LABELS.some(allowed => desc.includes(allowed));
    });

    if (!hasValidItem) {
      const labelSummary = labels.slice(0, 5).map(l => `${l.description} (${(l.score ?? 0).toFixed(2)})`).join(", ");
      console.log(`[Vision API] Blocked: no valid item detected. Labels: ${labelSummary}`);
      return {
        safe: false,
        reason:
          "We couldn't detect a recognizable marketplace item in this photo. Please upload a clear, real photo of what you're listing (e.g. laptop, book, camera, bag, etc.).",
      };
    }

    console.log(`[Vision API] Image PASSED all safety checks.`);
    return { safe: true };
  } catch (error: any) {
    console.error("[Vision API] Error during safety analysis:", error?.message || error);
    
    // If it's the billing error, fail OPEN so development isn't blocked
    if (error?.message?.includes("billing to be enabled")) {
      console.warn("[Vision API] Google Cloud billing is disabled. Bypassing moderation and allowing image to upload.");
      return { safe: true };
    }

    // Fail CLOSED on all other unexpected errors
    console.error("[Vision API] Failing CLOSED due to API error — image BLOCKED.");
    return { safe: false, reason: "Image moderation service encountered an error. Please try again in a few moments." };
  }
}
