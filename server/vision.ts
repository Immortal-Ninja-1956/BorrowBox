import vision from "@google-cloud/vision";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { getVisionCacheByHash, saveVisionCacheByHash } from "./db";

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

// In-memory hash cache for ultra-fast deduplication
const visionMemoryCache = new Map<string, VisionSafetyResult>();

export interface VisionSafetyResult {
  safe: boolean;
  reason?: string;
  confidenceScores?: {
    labels?: Array<{ description: string; score: number }>;
    topLabel?: { description: string; score: number };
    safeSearch?: any;
  };
}

// ── WHITELIST ─────────────────────────────────────────────────────────────────
const ALLOWED_ITEM_LABELS = [
  // Generic product/object labels
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
  // Toys & games
  "board game", "chess", "playing card", "action figure", "doll", "toy", "puzzle",
  // Art supplies
  "art supply", "paint", "canvas", "brush", "drawing",
  // Food Containers / Kitchenware
  "lunch box", "bottle", "flask", "tiffin", "tupperware", "container", "box", "thermos",
  // Generic visual descriptors
  "still life photography", "indoor", "close-up", "macro photography",
  "fashion accessory", "office supplies", "personal protective equipment",
];

// ── BLOCKLIST ─────────────────────────────────────────────────────────────────
const BANNED_LABELS = [
  "person", "human", "face", "selfie", "smile", "forehead", "nose", "eyebrow", "chin",
  "cheek", "hair", "beard", "moustache", "skin", "head", "finger", "thumb",
  "crowd", "audience", "people", "friendship", "gesture", "thumbs up",
  "middle finger", "portrait",
  "dog", "cat", "puppy", "kitten", "cow", "goat", "monkey", "pigeon", "bird",
  "rat", "insect", "cockroach", "lizard", "snake", "animal", "mammal",
  "pet", "carnivore", "canidae", "felidae", "wildlife", "livestock",
  "meme", "cartoon", "animated cartoon", "animation", "anime", "manga", "comics",
  "illustration", "drawing", "sketch", "clip art", "clipart", "fictional character",
  "graffiti", "emoticon", "emoji", "sticker", "caricature", "digital art",
  "collage",
  "toilet", "bathroom", "urinal", "plumbing fixture", "bidet", "toilet seat", "bathtub",
  "sewage", "restroom", "waste", "garbage", "trash",
  "feces", "excrement", "manure", "dung",
  "weapon", "gun", "firearm", "pistol", "rifle", "shotgun", "knife", "blade", "sword",
  "ammunition", "bullet", "explosive", "grenade", "bomb", "cigarette", "smoking",
  "tobacco", "alcohol", "beer", "wine", "liquor", "whisky", "vodka", "drug", "cocaine",
  "heroin", "methamphetamine", "cannabis", "marijuana", "syringe", "blood",
  "injury", "fire", "flame", "firecracker", "nudity", "pornography", "adult content",
  "currency", "money", "cash", "banknote", "coin", "credit card", "identity document",
  "passport",
  "car", "automobile", "motorcycle", "bus", "train", "aircraft",
  "underwear", "undergarment",
];

const TOP_INSTANT_REJECT = [
  "person", "human", "face", "animal", "sky", "wall", "floor",
  "building", "light", "nature", "plant", "water",
];

// ── MAIN EXPORT ───────────────────────────────────────────────────────────────
export async function checkImageSafety(
  imageUrl: string | undefined
): Promise<VisionSafetyResult> {
  if (!imageUrl) return { safe: true };

  if (!client) {
    console.error("[Vision API] BLOCKED: Client not initialized — refusing upload. Check GOOGLE_* env vars.");
    return { safe: false, reason: "Our photo checker is taking a quick break. Give it a minute and try uploading again!" };
  }

  try {
    let imageBuffer: Buffer;
    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
      const res = await fetch(imageUrl);
      if (!res.ok) throw new Error(`Failed to download image: ${res.statusText}`);
      imageBuffer = Buffer.from(await res.arrayBuffer());
    } else {
      const localPath = path.join(process.cwd(), imageUrl.startsWith("/") ? imageUrl.slice(1) : imageUrl);
      if (!fs.existsSync(localPath)) return { safe: false, reason: "Hmm, we couldn't find that image on our server. Try uploading it again." };
      imageBuffer = await fs.promises.readFile(localPath);
    }

    // ── HASH DEDUPLICATION CACHE CHECK ───────────────────────────────────────
    const imageHash = crypto.createHash("sha256").update(imageBuffer).digest("hex");

    // 1. Check in-memory map cache
    if (visionMemoryCache.has(imageHash)) {
      console.log(`[Vision API] Cache HIT (in-memory) for image hash ${imageHash.slice(0, 10)}... (saved GCV API call)`);
      return visionMemoryCache.get(imageHash)!;
    }

    // 2. Check persistent DB cache
    try {
      const dbCached = await getVisionCacheByHash(imageHash);
      if (dbCached) {
        console.log(`[Vision API] Cache HIT (database) for image hash ${imageHash.slice(0, 10)}... (saved GCV API call)`);
        const result: VisionSafetyResult = {
          safe: dbCached.safe === 1,
          reason: dbCached.reason || undefined,
          confidenceScores: dbCached.confidenceScores ? JSON.parse(dbCached.confidenceScores) : undefined,
        };
        visionMemoryCache.set(imageHash, result);
        return result;
      }
    } catch (err) {
      console.warn("[Vision API] Failed to check database vision cache:", err);
    }

    // ── GCV API EXECUTION (Cache MISS) ───────────────────────────────────────
    console.log(`[Vision API] Cache MISS for image hash ${imageHash.slice(0, 10)}... Invoking GCV API.`);
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

    const labels = (result.labelAnnotations ?? []).map((l: any) => ({
      description: (l.description ?? "").toLowerCase(),
      score: Number((l.score ?? 0).toFixed(2)),
    }));

    const topLabel = labels.length > 0 ? labels[0] : undefined;
    const confidenceScores = {
      labels: labels.slice(0, 10),
      topLabel,
      safeSearch: result.safeSearchAnnotation || undefined,
    };

    const helperCacheAndReturn = async (verdict: { safe: boolean; reason?: string }) => {
      const fullResult: VisionSafetyResult = {
        ...verdict,
        confidenceScores,
      };

      // Store in memory
      visionMemoryCache.set(imageHash, fullResult);

      // Store in DB asynchronously
      try {
        await saveVisionCacheByHash({
          imageHash,
          safe: verdict.safe ? 1 : 0,
          reason: verdict.reason || null,
          confidenceScores: JSON.stringify(confidenceScores),
        });
      } catch (err) {
        console.warn("[Vision API] Failed to save DB vision cache:", err);
      }

      return fullResult;
    };

    // ── CHECK 1: SafeSearch ──────────────────────────────────────────────────
    const ss = result.safeSearchAnnotation;
    if (ss) {
      const strictLevels = ["POSSIBLE", "LIKELY", "VERY_LIKELY"];
      const normalLevels = ["LIKELY", "VERY_LIKELY"];
      if (strictLevels.includes(ss.adult || "UNKNOWN")) {
        return await helperCacheAndReturn({ safe: false, reason: "This photo isn't something we can display on campus. Please use a standard item photo." });
      }
      if (
        normalLevels.includes(ss.violence || "UNKNOWN") ||
        normalLevels.includes(ss.racy || "UNKNOWN") ||
        normalLevels.includes(ss.medical || "UNKNOWN")
      ) {
        return await helperCacheAndReturn({ safe: false, reason: "This photo isn't appropriate for our campus marketplace. Please upload a clean, clear photo of the item." });
      }
    }

    // ── CHECK 2: Face Detection ──────────────────────────────────────────────
    const faces = result.faceAnnotations;
    if (faces && faces.length > 0) {
      console.log(`[Vision API] Blocked: ${faces.length} face(s) detected.`);
      return await helperCacheAndReturn({
        safe: false,
        reason: "Your photo appears to have a person in it. Listing photos should show the item only — no faces please!",
      });
    }

    // ── CHECK 3: Image Properties ───────────────────────────────────────────
    const colors = result.imagePropertiesAnnotation?.dominantColors?.colors;
    if (colors && colors.length > 0) {
      if ((colors[0].pixelFraction ?? 0) > 0.95) {
        return await helperCacheAndReturn({ safe: false, reason: "That image looks blank or completely one color. Please snap an actual photo of what you're selling!" });
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
        if (lum < 8) return await helperCacheAndReturn({ safe: false, reason: "Your photo is too dark to see the item clearly. Try taking it in better lighting!" });
        if (lum > 248) return await helperCacheAndReturn({ safe: false, reason: "Your photo is way too bright — the item is barely visible. Try again away from direct light." });
      }
    }

    // ── CHECK 4: OCR ─────────────────────────────────────────────────────────
    const textAnnotations = result.textAnnotations;
    if (textAnnotations && textAnnotations.length > 0) {
      const extractedText = (textAnnotations[0].description ?? "").toLowerCase();
      const bannedWords = ["drug", "cocaine", "heroin", "cannabis", "weed", "meth", "weapon", "gun", "pistol", "rifle", "explosive"];
      if (bannedWords.some(w => extractedText.includes(w))) {
        return await helperCacheAndReturn({ safe: false, reason: "Your photo contains text mentioning something not allowed on campus. Please use a clean item photo with no banned words." });
      }
      const wordCount = extractedText.split(/\s+/).filter(Boolean).length;
      if (wordCount > 25) {
        console.log(`[Vision API] Blocked: text-heavy image (${wordCount} words) — likely meme/screenshot.`);
        return await helperCacheAndReturn({ safe: false, reason: "That looks like a screenshot or document, not an item photo. Please take an actual photo of what you're listing." });
      }
    }

    // ── CHECK 5: Label analysis ──────────────────────────────────────────────
    if (labels.length > 0) {
      console.log(`[Vision API] Labels for image: ${labels.map((l: any) => `"${l.description}" (${(l.score ?? 0).toFixed(2)})`).join(', ')}`);
    } else {
      console.log(`[Vision API] No labels detected for image.`);
    }

    // 5a. Top-label instant reject
    if (labels.length > 0) {
      const top = labels[0];
      if (top.score > 0.85 && TOP_INSTANT_REJECT.some(kw => top.description === kw)) {
        console.log(`[Vision API] Blocked: top label "${top.description}" (${top.score})`);
        return await helperCacheAndReturn({
          safe: false,
          reason: "That photo doesn't look like a campus marketplace item. Please upload a clear photo of what you're actually selling!",
        });
      }
    }

    // 5b. Blocklist check
    const top10 = labels.slice(0, 10);
    for (const label of top10) {
      if (label.score > 0.70) {
        const hit = BANNED_LABELS.find(kw => label.description === kw || new RegExp(`\\b${kw}\\b`, "i").test(label.description));
        if (hit) {
          console.log(`[Vision API] Blocked: banned label "${label.description}" (${label.score})`);
          return await helperCacheAndReturn({
            safe: false,
            reason: "We spotted something in your photo that isn't allowed here — like a banned item, selfie, or meme. Please upload a straightforward photo of the item you're listing.",
          });
        }
      }
    }

    // ── CHECK 6: Whitelist ───────────────────────────────────────────────────
    const hasValidItem = labels.some((label: any) => {
      return label.score > 0.60 && ALLOWED_ITEM_LABELS.some(allowed => label.description.includes(allowed));
    });

    if (!hasValidItem) {
      const labelSummary = labels.slice(0, 5).map((l: any) => `${l.description} (${l.score.toFixed(2)})`).join(", ");
      console.log(`[Vision API] Blocked: no valid item detected. Labels: ${labelSummary}`);
      return await helperCacheAndReturn({
        safe: false,
        reason:
          "We couldn't tell what item is in this photo — it might be blurry, too far away, or just not a product. Try a clearer shot of what you're selling (e.g. a laptop, book, bag, or gadget).",
      });
    }

    console.log(`[Vision API] Image PASSED all safety checks.`);
    return await helperCacheAndReturn({ safe: true });
  } catch (error: any) {
    console.error("[Vision API] Error during safety analysis:", error?.message || error);
    
    if (error?.message?.includes("billing to be enabled")) {
      console.error("[Vision API] CRITICAL SECURITY ALERT: Google Cloud Vision billing is disabled. Failing CLOSED to prevent unmoderated uploads.");
      return { safe: false, reason: "Our photo checker is temporarily offline. We've been notified and are looking into it. Please try again in a little while." };
    }

    console.error("[Vision API] Failing CLOSED due to API error — image BLOCKED.");
    return { safe: false, reason: "Something went wrong while checking your photo. It's likely temporary — please try again in a moment." };
  }
}
