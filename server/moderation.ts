/**
 * Advanced Text Moderation Engine for BorrowBox
 * Normalizes leetspeak, collapses character repetitions, strips obfuscating symbols/spaces,
 * and performs fuzzy matching against prohibited keyword categories to catch bypass attempts.
 */

// Banned Keywords List grouped by risk category
export const BANNED_KEYWORDS: string[] = [
  // Prohibited Campus Appliances & Instant Food
  "maggi",
  "noodle",
  "noodles",
  "kettle",
  "induction",
  "heater",
  "hotplate",
  "boiler",

  // Controlled & Harmful Substances / Drugs
  "drug",
  "drugs",
  "weed",
  "cannabis",
  "marijuana",
  "hash",
  "cocaine",
  "heroin",
  "meth",
  "narcotic",
  "substance",
  "substances",

  // Tobacco & Vaping
  "vape",
  "ecig",
  "e-cigarette",
  "cigarette",
  "tobacco",
  "hookah",
  "shisha",
  "smoke",

  // Alcohol
  "alcohol",
  "liquor",
  "beer",
  "whiskey",
  "vodka",
  "rum",

  // Weapons & Dangerous Objects
  "weapon",
  "weapons",
  "gun",
  "pistol",
  "rifle",
  "knife",
  "knives",
  "dagger",
  "sword",
  "ammo",
  "ammunition",
];

// Leetspeak character normalization map
const LEET_MAP: Record<string, string> = {
  "@": "a",
  "4": "a",
  "^": "a",
  "8": "b",
  "3": "e",
  "1": "i",
  "!": "i",
  "|": "i",
  "0": "o",
  "5": "s",
  "$": "s",
  "7": "t",
  "+": "t",
  "v": "u",
};

/**
 * Normalizes text by decoding leetspeak, collapsing repeated characters,
 * and stripping non-alphanumeric characters.
 */
export function normalizeText(rawText: string): { normalized: string; stripped: string } {
  if (!rawText) return { normalized: "", stripped: "" };

  const lower = rawText.toLowerCase();

  // 1. Map leetspeak characters to standard alphabet
  let mapped = "";
  for (let i = 0; i < lower.length; i++) {
    const char = lower[i];
    mapped += LEET_MAP[char] || char;
  }

  // 2. Collapse character repetitions (3+ of same char -> 2 chars, e.g., "weeeeeeed" -> "weed", "maggggiii" -> "maggi")
  const collapsed = mapped.replace(/(.)\1{2,}/g, "$1$1");

  // 3. Create stripped version without any non-alphanumeric chars or spaces
  const stripped = collapsed.replace(/[^a-z0-9]/g, "");

  return { normalized: collapsed, stripped };
}

/**
 * Calculates Levenshtein Distance between two strings for fuzzy matching.
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

export interface ModerationResult {
  safe: boolean;
  reason?: string;
  flaggedKeyword?: string;
}

/**
 * Checks listing title and description for banned keywords, leetspeak obfuscation,
 * character repetition, symbol insertion, and fuzzy match variations.
 */
export function checkTextModeration(
  title?: string | null,
  description?: string | null
): ModerationResult {
  const combinedText = `${title || ""} ${description || ""}`.trim();
  if (!combinedText) return { safe: true };

  // Prepare normalized representations
  const { normalized } = normalizeText(combinedText);

  // Extract individual words & tokens
  const rawTokens = combinedText.split(/\s+/).filter(Boolean);
  const normalizedTokens = rawTokens.map((t) => normalizeText(t));

  // 1. Single Token Check (Exact, Leetspeak, Stripped, Substring, Fuzzy)
  for (const { normalized: normToken, stripped: cleanToken } of normalizedTokens) {
    if (!cleanToken || cleanToken.length < 3) continue;

    for (const keyword of BANNED_KEYWORDS) {
      const { stripped: cleanKeyword } = normalizeText(keyword);
      if (cleanKeyword.length < 3) continue;

      // Exact match or token equals clean keyword (e.g. "w33d" -> "weed", "v@pe" -> "vape")
      if (cleanToken === cleanKeyword || normToken === cleanKeyword) {
        return {
          safe: false,
          reason: `Heads up! Your listing mentions "${keyword}", which isn't allowed on BorrowBox. Please remove it and try again.`,
          flaggedKeyword: keyword,
        };
      }

      // Fuzzy match for minor typos/variations:
      // For short keywords (<= 4 chars, e.g. "rum", "gun", "weed", "vape"), maxDist is 0 (exact/leetspeak only) to prevent false positives on "RAM", "car", "bar", etc.
      // For medium/long keywords (>= 5 chars, e.g. "kettle", "cigarette", "marijuana"), maxDist is 1 or 2.
      const maxDist = cleanKeyword.length <= 4 ? 0 : cleanKeyword.length <= 7 ? 1 : 2;
      if (maxDist > 0 && Math.abs(cleanToken.length - cleanKeyword.length) <= maxDist) {
        const dist = levenshteinDistance(cleanToken, cleanKeyword);
        if (dist <= maxDist && dist > 0) {
          return {
            safe: false,
            reason: `Your listing looks like it might be referencing "${keyword}", which isn't permitted here. Double-check your title and description.`,
            flaggedKeyword: keyword,
          };
        }
      }
    }
  }

  // 2. Symbol-Separated Obfuscation Check (e.g. "w-e-e-d", "k.e.t.t.l.e", "v.a.p.e")
  for (const keyword of BANNED_KEYWORDS) {
    const { stripped: cleanKeyword } = normalizeText(keyword);
    if (cleanKeyword.length < 3) continue;

    const symbolStripped = normalizeText(combinedText.replace(/[\s\-_.\/\\,#@!$%^&*()]+/g, "")).stripped;
    if (symbolStripped.includes(cleanKeyword)) {
      const regexPattern = cleanKeyword.split("").join("[\\s\\-_.\/\\\\,#@!$%^&*()]*");
      const regex = new RegExp(regexPattern, "i");
      if (regex.test(normalized)) {
        return {
          safe: false,
          reason: `Heads up! Your listing mentions "${keyword}", which isn't allowed on BorrowBox. Please remove it and try again.`,
          flaggedKeyword: keyword,
        };
      }
    }
  }

  // 3. Spaced Single-Character Obfuscation Check (e.g., "w e e d", "v a p e")
  const singleCharJoined = rawTokens
    .filter((t) => t.length === 1)
    .join("");
  if (singleCharJoined.length >= 3) {
    const { stripped: joinedStripped } = normalizeText(singleCharJoined);
    for (const keyword of BANNED_KEYWORDS) {
      const { stripped: cleanKeyword } = normalizeText(keyword);
      if (cleanKeyword.length >= 3 && joinedStripped.includes(cleanKeyword)) {
        return {
          safe: false,
          reason: `Heads up! Your listing mentions "${keyword}", which isn't allowed on BorrowBox. Please remove it and try again.`,
          flaggedKeyword: keyword,
        };
      }
    }
  }

  return { safe: true };
}
