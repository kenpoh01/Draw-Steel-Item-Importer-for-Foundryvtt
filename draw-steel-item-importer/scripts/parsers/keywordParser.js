/**
 * Parses a keyword/action line from a Malice ability block.
 * Extracts known action types and filters out keywords.
 */
export function parseKeywordLine(line) {
  let type = "special";
  const keywords = [];

  // Split on comma OR space followed by capital letter
  const tokens = line.split(/(?:,\s*|\s+)(?=[A-Z])/).map(t => t.trim());

  for (const token of tokens) {
    const lowered = token.toLowerCase();

    if (lowered.includes("main action")) type = "main";
    else if (lowered.includes("maneuver")) type = "maneuver";
    else if (lowered.includes("reaction")) type = "reaction";
    else if (lowered.includes("triggered action") || lowered.includes("triggered")) type = "triggered";
    else if (lowered.includes("free maneuver")) type = "maneuver";
    else keywords.push(token);
  }

  return { type, keywords };
}

/**
 * Extracts and normalizes keywords from a header string.
 * Used by abilityParser.js to populate system.keywords.
 * @param {string} header
 * @returns {string[]} - Array of lowercase keywords
 */
export function normalizeKeywords(header = "") {
  return header
    .split(/[,;]/)
    .map(k => k.trim().toLowerCase())
    .filter(k =>
      k.length > 0 &&
      !k.includes("main action") &&
      !k.includes("maneuver") &&
      !k.includes("reaction") &&
      !k.includes("triggered")
    );
}

export const VALID_DAMAGE_TYPES = [
  "acid", "cold", "corruption", "fire", "holy",
  "lightning", "poison", "psychic", "sonic", ""
];

/**
 * Heuristically determines whether a line is likely a keyword/action line.
 * Prevents misclassification of narrative lines like "They can..." as keywords.
 */
export function isLikelyKeywordLine(line) {
  const tokens = line.split(/(?:,\s*|\s+)(?=[A-Z])/).map(t => t.trim());
  const capitalized = tokens.filter(t => /^[A-Z]/.test(t));
  return capitalized.length >= 2 || /main action|maneuver|reaction|triggered|free maneuver/i.test(line);
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