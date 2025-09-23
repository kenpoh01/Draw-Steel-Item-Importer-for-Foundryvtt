/** 
 * Parses a keyword/action line from a Malice ability block.
 * Extracts known action types and filters out keywords.
 */

export const HEROIC_RESOURCE_TYPES = [
  "wrath", "ferocity", "focus", "insight", "piety", 
  "essence", "discipline", "clarity", "drama"
];

export function normalizeResourceType(raw = "") {
  const lower = raw.toLowerCase().trim();
  return HEROIC_RESOURCE_TYPES.includes(lower) ? lower : null;
}

export const SUPPORTED_CONDITIONS = [
  "bleeding", "dazed", "grabbed", "frightened", "prone",
  "restrained", "slowed", "taunted", "weakened", "banished"
];

export function detectConditions(text = "") {
  const normalized = text.toLowerCase();
  return SUPPORTED_CONDITIONS.filter(cond => normalized.includes(cond));
}

export function parseKeywordLine(line) {
  let type = "none";
  const keywords = [];

  // Split on comma OR space followed by capital letter
  const tokens = line.split(/(?:,\s*|\s+)(?=[A-Z])/).map(t => t.trim());

  for (const token of tokens) {
    const lowered = token.toLowerCase();

    if (lowered.includes("main action")) type = "main";
    else if (lowered.includes("free maneuver")) type = "freeManeuver";
    else if (lowered.includes("maneuver")) type = "maneuver";
    else if (lowered.includes("free triggered")) type = "freeTriggered";
    else if (lowered.includes("triggered")) type = "triggered";
    else if (lowered.includes("no action")) type = "none";
    else if (lowered.includes("villain")) type = "villain";
    else if (lowered.includes("move")) type = "none"; // ✅ Explicitly treat "move" as no action
    else keywords.push(token);
  }

  return { type, keywords };
}

/**
 * Extracts and normalizes keywords from a header string.
 * Used by abilityParser.js to populate system.keywords and system.type.
 * @param {string} header
 * @returns {{ keywords: string[], type: string }}
 */
export function normalizeKeywords(header = "") {
  const types = {
    "main action": "main",
    "maneuver": "maneuver",
    "free maneuver": "freeManeuver",
    "triggered": "triggered",
    "free triggered": "freeTriggered",
    "no action": "none",
    "villain": "villain",
    "move": "none" // ✅ Explicitly treat "move" as no action
  };

  const lower = header.toLowerCase().trim();
  const typeEntry = Object.entries(types).find(([suffix]) => lower.endsWith(suffix));
  const type = typeEntry ? typeEntry[1] : "none"; // ✅ Default to "none" if no match

  const keywordPart = typeEntry ? header.slice(0, -typeEntry[0].length).trim() : header;
  const keywords = keywordPart
    .split(/[,;]/)
    .map(k => k.trim().toLowerCase())
    .filter(Boolean);

  const conditions = detectConditions(header);

  return { keywords, type, conditions };
}

export const VALID_DAMAGE_TYPES = [
  "acid", "cold", "corruption", "fire", "holy", "lightning", "poison", "psychic", "sonic", ""
];

/**
 * Heuristically determines whether a line is likely a keyword/action line.
 * Prevents misclassification of narrative lines like "They can..." as keywords.
 */
export function isLikelyKeywordLine(line) {
  const tokens = line.split(/(?:,\s*|\s+)(?=[A-Z])/).map(t => t.trim());
  const capitalized = tokens.filter(t => /^[A-Z]/.test(t));
  return capitalized.length >= 2 || /main action|maneuver|triggered|free maneuver|free triggered|no action|villain|move/i.test(line);
}

export function isNarrativeLine(line) {
  if (!line || line.length < 2) return false;

  const trimmed = line.trim();

  if (/^[123áéí]\s+\d+/.test(trimmed)) return false;
  if (/^[A-Z][a-z]+(,\s*[A-Z][a-z]+)*\s+(Main|Triggered|Reaction|Maneuver) action$/i.test(trimmed)) return false;
  if (/^Effect:/i.test(trimmed)) return false;
  if (/[.,!?;:"'()]/.test(trimmed)) return true;

  return false;
}