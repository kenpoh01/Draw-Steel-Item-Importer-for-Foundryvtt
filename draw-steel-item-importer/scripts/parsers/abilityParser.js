import { parseTierBlock } from "./tierParser.js";
import { parseEffectBlock } from "./effectParser.js";
import { resolveIcon } from "./iconResolver.js";
import { normalizeKeywords, normalizeResourceType } from "./keywordParser.js";
import { parseDistanceAndTarget } from "./distanceParser.js";

/** Generates a slug-style ID from an ability name. */
function generateDSID(name) {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

/** Extracts stat from "Power Roll + [Stat]" line */
function extractPowerRollStat(line = "") {
  const match = line.match(/Power Roll\s*\+\s*(Might|Agility|Reason|Intuition|Presence)/i);
  return match ? match[1].toLowerCase() : null;
}

/** Checks if effects contain tiered structure */
function hasTieredEffects(effects = {}) {
  return Object.values(effects).some(eff =>
    eff.damage && Object.keys(eff.damage).length > 0 ||
    eff.other && ["tier1", "tier2", "tier3"].some(k => k in eff.other)
  );
}

/** Parses a raw ability object into Draw Steel schema format */
export function parseAbility(raw) {
  const {
    name,
    resource,
    story,
    header,
    tierLines,
    effectBefore,
    effectAfter,
    powerRollLine
  } = raw;

  if (!name || !header) return null;

  const { keywords, type } = normalizeKeywords(header);
  const result = parseDistanceAndTarget(raw.distanceLine ?? header);

  if (!result) {
    console.warn("⚠️ Failed to parse distance/target from:", raw.distanceLine ?? header);
  }

  const distance = result?.distance ?? { type: "special" };
  const target = result?.target ?? { type: "special", value: null };

  console.log(`📦 Tier lines for "${name}":`, tierLines);

  const tierInput = tierLines.length > 0
    ? tierLines
    : effectBefore
      ? [`Effect: ${effectBefore}`]
      : [];

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
  const stat = extractPowerRollStat(powerRollLine ?? "");
  const characteristic = stat ? [stat] : [];

  return {
    name,
    type: "ability",
    img: icon,
    system: {
      _dsid: generateDSID(name),
      story,
      keywords,
      type,
      category: "heroic",
      resource,
      distance,
      target,
      power: {
        roll: {
          formula: "@chr",
          characteristics: characteristic
        },
        effects: hasTieredEffects(tiers) ? tiers : {}
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

/** Parses an array of raw ability objects into Draw Steel schema format */
export function parseMultipleAbilities(rawAbilities) {
  const input = Array.isArray(rawAbilities)
    ? rawAbilities
    : typeof rawAbilities === "object" && rawAbilities !== null
      ? [rawAbilities]
      : [];

  return input.map(parseAbility).filter(Boolean);
}

/** Converts raw multiline ability text into structured ability objects */
export function preprocessRawAbilities(rawText = "") {
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const abilities = [];

  let current = {
    name: "",
    resource: { value: 0, type: "unknown" },
    story: "",
    header: "",
    tierLines: [],
    effectBefore: "",
    effectAfter: "",
    powerRollLine: ""
  };

  let mode = "name";

  for (const line of lines) {
    const resourceMatch = line.match(/\((\d+)\s+(\w+)\)/i);
    const rawType = resourceMatch?.[2] ?? "";
    const normalizedType = normalizeResourceType(rawType);

    if (/^\w.*\(\d+\s+\w+\)/i.test(line)) {
      if (current.name) abilities.push({ ...current });

      current = {
        name: line.replace(/\(\d+\s+\w+\)/i, "").trim(),
        resource: {
          value: parseInt(resourceMatch?.[1] ?? "0", 10),
          type: normalizedType ?? "unknown"
        },
        story: "",
        header: "",
        tierLines: [],
        effectBefore: "",
        effectAfter: "",
        powerRollLine: ""
      };

      mode = "story";
    }

    else if (/\b(main action|maneuver|triggered|free triggered|free maneuver|no action|villain)\s*$/i.test(line)) {
      current.header = line.trim();
    }

    else if (/^power roll\s*\+\s*/i.test(line)) {
      current.powerRollLine = line.trim();
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
      const lastIndex = current.tierLines.length - 1;
      if (lastIndex >= 0) {
        current.tierLines[lastIndex] += " " + line;
      }
    }

    else if (/^e\s/i.test(line)) {
      current.distanceLine = line.trim();
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
    effectAfter: a.effectAfter.trim(),
    powerRollLine: a.powerRollLine?.trim() ?? ""
  }));
}