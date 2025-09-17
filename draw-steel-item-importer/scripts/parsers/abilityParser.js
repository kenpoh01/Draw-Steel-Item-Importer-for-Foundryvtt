import { parseTierBlock } from "./tierParser.js";
import { parseEffectBlock } from "./effectParser.js";
import { resolveIcon } from "./iconResolver.js";
import { normalizeKeywords } from "./keywordParser.js";
import { parseDistanceAndTarget } from "./distanceParser.js";

/**
 * Generates a slug-style ID from an ability name.
 * Example: "Blessing of Fate and Destiny" → "blessing-of-fate-and-destiny"
 * @param {string} name
 * @returns {string}
 */
function generateDSID(name) {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

/**
 * Parses a raw ability object into Draw Steel schema format.
 * @param {object} raw - Raw ability input (text or preprocessed object)
 * @returns {object} - Parsed ability schema
 */
export function parseAbility(raw) {
  const {
    name,
    resource,
    story,
    header,
    tierLines,
    effectBefore,
    effectAfter
  } = raw;

  if (!name || !header) return null;

  const keywords = normalizeKeywords(header);

 const result = parseDistanceAndTarget(raw.distanceLine ?? header);
if (!result) {
  console.warn("⚠️ Failed to parse distance/target from:", raw.distanceLine ?? header);
}

  const distance = result?.distance ?? { type: "special" };
  const target = result?.target ?? { type: "special", value: null };

console.log(`📦 Tier lines for "${name}":`, tierLines);

  const tierInput = tierLines.length > 0 ? tierLines : [raw.effectBefore].filter(Boolean);
const tiers = parseTierBlock(tierInput);


  const icon = resolveIcon({
    system: {
      story,
      keywords,
      power: { effects: tiers },
      distance
    }
  });
  const effect = parseEffectBlock(effectBefore, effectAfter);

  return {
    name,
    type: "ability",
    img: icon,
    system: {
      _dsid: generateDSID(name),
      story,
      keywords,
      type: "main",
      category: "heroic",
      resource,
      distance,
      target,
      power: {
        roll: {
          formula: "@chr",
          characteristics: []
        },
        effects: tiers
      },
      effect,
      trigger: "",
      damageDisplay: "melee",
      spend: {
        text: "",
        value: null
      }
    },
    effects: [],
    flags: {}
  };
}

/**
 * Parses an array of raw ability objects into Draw Steel schema format.
 * Accepts either an array or a single object.
 * @param {object[]|object} rawAbilities
 * @returns {object[]} - Array of parsed ability schemas
 */
export function parseMultipleAbilities(rawAbilities) {
  const input = Array.isArray(rawAbilities)
    ? rawAbilities
    : typeof rawAbilities === "object" && rawAbilities !== null
      ? [rawAbilities]
      : [];

  return input.map(parseAbility).filter(Boolean);
}

/**
 * Converts raw multiline ability text into structured ability objects.
 * @param {string} rawText
 * @returns {object[]} - Array of parsed ability blocks
 */
export function preprocessRawAbilities(rawText = "") {
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const abilities = [];

  let current = {
    name: "",
    resource: 0,
    story: "",
    header: "",
    tierLines: [],
    effectBefore: "",
    effectAfter: ""
  };

  let mode = "name";

  for (const line of lines) {
    if (/^\w.*\(\d+\s+piety\)/i.test(line)) {
      if (current.name) abilities.push({ ...current });
      current = {
        name: line.replace(/\(\d+\s+piety\)/i, "").trim(),
        resource: parseInt(line.match(/\d+/)?.[0] ?? "0", 10),
        story: "",
        header: "",
        tierLines: [],
        effectBefore: "",
        effectAfter: ""
      };
      mode = "story";
    }

    // ✅ Refined header detection
    else if (/\b(main action|maneuver|triggered|free triggered)\s*$/i.test(line)) {
      current.header = line.trim();
    }

    else if (/^power roll\s*\+\s*/i.test(line)) {
      mode = "tier";
    }

    else if (/^effect:/i.test(line)) {
      mode = "effect";
      current.effectBefore += line.replace(/^effect:\s*/i, "") + " ";
    }

    else if (/^[áéí]/.test(line)) {
  mode = "tier";
  current.tierLines.push(line);
}
else if (mode === "tier") {
  // Append continuation lines to the last tier line
  const lastIndex = current.tierLines.length - 1;
  if (lastIndex >= 0) {
    current.tierLines[lastIndex] += " " + line;
  }
}

    else if (/^e\s/i.test(line)) {
      current.distanceLine = line.trim(); // optional future use
    }

    else {
      if (mode === "story") current.story += line + " ";
      else if (mode === "tier") current.tierLines.push(line);
      else if (mode === "effect") current.effectBefore += line + " ";
    }
  }

  if (current.name) abilities.push({ ...current });

  return abilities.map(a => ({
    ...a,
    story: a.story.trim(),
    effectBefore: a.effectBefore.trim(),
    effectAfter: a.effectAfter.trim()
  }));
}