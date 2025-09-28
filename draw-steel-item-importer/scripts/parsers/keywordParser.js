/** Core stat keywords used in Power Roll lines */
export const MARIP = [
  "might", "agility", "reason", "intuition", "presence"
];

/** Known ability/malice keywords */
export const KNOWN_KEYWORDS = [
  "animal", "animapathy", "area", "charge", "chronopathy", "cryokinesis",
  "earth", "fire", "green", "magic", "melee", "metamorphosis", "performance",
  "psionic", "pyrokinesis", "ranged", "resopathy", "rot", "strike",
  "telekinesis", "telepathy", "void", "weapon"
];

/** Valid heroic resource types */
export const HEROIC_RESOURCE_TYPES = [
  "wrath", "ferocity", "focus", "insight", "piety",
  "essence", "discipline", "clarity", "drama"
];

export function normalizeResourceType(raw = "") {
  const lower = raw.toLowerCase().trim();
  return HEROIC_RESOURCE_TYPES.includes(lower) ? lower : null;
}

/** Supported conditions for effect parsing */
export const SUPPORTED_CONDITIONS = [
  "bleeding", "dazed", "grabbed", "frightened", "prone",
  "restrained", "slowed", "taunted", "weakened", "banished"
];

export function detectConditions(text = "") {
  const normalized = text.toLowerCase();
  return SUPPORTED_CONDITIONS.filter(cond => normalized.includes(cond));
}

/** Known action types */
export const KNOWN_TYPES = [
  "main action", "maneuver", "triggered", "free triggered",
  "free maneuver", "no action", "villain", "move"
];

/** Maps action type strings to schema values */
const TYPE_MAP = {
  "main action": "main",
  "maneuver": "maneuver",
  "free maneuver": "freeManeuver",
  "triggered": "triggered",
  "free triggered": "freeTriggered",
  "no action": "none",
  "villain": "villain",
  "move": "none"
};

/** Parses a keyword/action line from a Malice ability block */
export function parseKeywordLine(line) {
  let type = "none";
  const keywords = [];

  const tokens = line.split(/(?:,\s*|\s+)(?=[A-Z])/).map(t => t.trim());

  for (const token of tokens) {
    const lowered = token.toLowerCase();

    if (KNOWN_TYPES.includes(lowered)) {
      type = TYPE_MAP[lowered] ?? "none";
    } else if (KNOWN_KEYWORDS.includes(lowered)) {
      keywords.push(lowered);
    }
  }

  return { type, keywords };
}

/** Extracts and normalizes keywords from a header string */
export function normalizeKeywords(header = "") {
  const lower = header.toLowerCase().trim();
  const matchedType = KNOWN_TYPES.find(t => lower.endsWith(t));
  const type = matchedType ? TYPE_MAP[matchedType] : "none";

  const keywordPart = matchedType
    ? header.replace(new RegExp(`${matchedType}$`, "i"), "").trim()
    : header;

  const rawKeywords = keywordPart.split(/[,;]/).map(k => k.trim().toLowerCase()).filter(Boolean);
  const keywords = rawKeywords.filter(k => KNOWN_KEYWORDS.includes(k));

  const conditions = detectConditions(header);

  return { keywords, type, conditions };
}

/** Valid damage types for tier parsing */
export const VALID_DAMAGE_TYPES = [
  "acid", "cold", "corruption", "fire", "holy",
  "lightning", "poison", "psychic", "sonic", ""
];

/** Heuristically determines whether a line is likely a keyword/action line */
export function isLikelyKeywordLine(line) {
  const tokens = line.split(/(?:,\s*|\s+)(?=[A-Z])/).map(t => t.trim());
  const capitalized = tokens.filter(t => /^[A-Z]/.test(t));
  return capitalized.length >= 2 || /main action|maneuver|triggered|free maneuver|free triggered|no action|villain|move/i.test(line);
}

/** Detects narrative lines to avoid misclassification */
export function isNarrativeLine(line) {
  if (!line || line.length < 2) return false;

  const trimmed = line.trim();

  if (/^[123áéí]\s+\d+/.test(trimmed)) return false;
  if (/^[A-Z][a-z]+(,\s*[A-Z][a-z]+)*\s+(Main|Triggered|Reaction|Maneuver) action$/i.test(trimmed)) return false;
  if (/^Effect:/i.test(trimmed)) return false;
  if (/[.,!?;:"'()]/.test(trimmed)) return true;

  return false;
}