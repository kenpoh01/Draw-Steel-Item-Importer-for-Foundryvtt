import { parseTarget } from "./targetParser.js";
/**
 * Parses a distance/target line like "e Ranged 10 x One creature"
 * Returns structured distance and target objects.
 * @param {string} line
 * @returns {{ distance: object, target: object }}
 */
export function parseDistanceLine(line = "") {
  if (!line.startsWith("e ")) return null;

  // ✅ Strip trailing notes like "; see below"
  const raw = line.slice(2).split(";")[0].trim();
  const lowerRaw = raw.toLowerCase();

  // Split on the LAST occurrence of " x " or " × "
  const splitMatch = lowerRaw.match(/^(.*)\s+[x×]\s+(.*)$/i);
  const distancePart = splitMatch ? splitMatch[1].trim() : raw.trim();
  const targetPart = splitMatch ? splitMatch[2].trim() : "";

  let distance = {};
  const target = parseTarget(targetPart);

  // ✅ Match "10 × 1 line within 1"
  const lineMatch = distancePart.match(/(\d+)\s*[×x]\s*(\d+)\s+(\w+)\s+within\s+(\d+)/i);
  if (lineMatch) {
    const [, primary, secondary, shape, range] = lineMatch;
    distance = {
      type: shape.toLowerCase(),
      primary: parseInt(primary),
      secondary: parseInt(secondary),
      tertiary: parseInt(range)
    };
  }

  // ✅ Match "2 cube within 2"
  else if (/^\d+\s+cube\s+within\s+\d+$/i.test(distancePart)) {
    const cubeMatch = distancePart.match(/^(\d+)\s+cube\s+within\s+(\d+)$/i);
    const [, size, range] = cubeMatch;
    distance = {
      type: "cube",
      primary: parseInt(size),
      secondary: parseInt(range)
    };
  }

  // ✅ Match "5 burst"
  else if (/^\d+\s+burst$/i.test(distancePart)) {
    const burstMatch = distancePart.match(/^(\d+)\s+burst$/i);
    const [, size] = burstMatch;
    distance = {
      type: "burst",
      primary: parseInt(size)
    };
  }

  // ✅ Match "3 aura" or "Aura 3"
  else if (/^(\d+)\s+aura$|^aura\s+(\d+)$/i.test(distancePart)) {
    const auraMatch = distancePart.match(/^(\d+)\s+aura$|^aura\s+(\d+)$/i);
    const size = parseInt(auraMatch[1] || auraMatch[2]);
    distance = {
      type: "aura",
      primary: size
    };
  }

  // ✅ Match "Melee 1" or "Ranged 10"
  else if (/^(melee|ranged)\s+\d+$/i.test(distancePart)) {
    const typedRangeMatch = distancePart.match(/^(melee|ranged)\s+(\d+)$/i);
    const [, type, range] = typedRangeMatch;
    distance = {
      type: type.toLowerCase(),
      primary: parseInt(range)
    };
  }

  // ✅ Match "Self"
  else if (/^self$/i.test(distancePart)) {
    distance = {
      type: "self",
      primary: 0
    };
  }

  // ✅ Match "Melee" or "Ranged" with no number
  else if (/^(melee|ranged)$/i.test(distancePart)) {
    const simpleMatch = distancePart.match(/^(melee|ranged)$/i);
    distance = {
      type: simpleMatch[1].toLowerCase(),
      primary: 0
    };
  }

  // ✅ Fallback
  else {
    distance = { type: "special" };
  }

  return { distance, target };
}

// 🔹 Alias for abilityParser.js compatibility
export const parseDistanceAndTarget = parseDistanceLine;