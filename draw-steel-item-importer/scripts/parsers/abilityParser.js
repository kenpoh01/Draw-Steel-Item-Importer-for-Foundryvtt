import { parseTierBlock } from "./tierParser.js";
import { parseEffectBlock } from "./effectParser.js";
import { resolveIcon } from "./iconResolver.js";
import {
  normalizeKeywords,
  normalizeResourceType,
  MARIP,
  KNOWN_TYPES
} from "./keywordParser.js";
import { parseDistanceAndTarget } from "./distanceParser.js";
import { parseAbilityLine } from "./lineParser.js";

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
  const statPattern = new RegExp(`Power Roll\\s*\\+\\s*(${MARIP.join("|")})`, "i");
  const match = line.match(statPattern);
  return match ? match[1].toLowerCase() : null;
}

/** Checks if effects contain tiered structure */
function hasTieredEffects(effects = {}) {
  return Object.values(effects).some(eff =>
    eff.damage && Object.keys(eff.damage).length > 0 ||
    eff.other && ["tier1", "tier2", "tier3"].some(k => k in eff.other)
  );
}

export function parseAbility(raw) {
  const {
    name,
    resource,
    story,
    header,
    tierLines,
    effectBefore,
    effectAfter,
    powerRollLine,
    distanceLine,
    trigger
  } = raw;

  if (!name || !header) {
    console.warn("⚠️ Skipping ability due to missing name or header:", name);
    return null;
  }

  const { keywords, type } = normalizeKeywords(header);
  const result = parseDistanceAndTarget(distanceLine ?? header);

  const distance = result?.distance ?? { type: "special" };
  const target = result?.target ?? { type: "special", value: null };

  const tierInput = tierLines.length > 0
    ? tierLines
    : effectBefore
      ? [`Effect: ${effectBefore}`]
      : [];

  const { effects: tiers, effectAfter: extractedEffectAfter } = parseTierBlock(tierInput);
  const icon = resolveIcon({
    system: {
      story,
      keywords,
      power: { effects: tiers },
      distance
    }
  });

  const stat = extractPowerRollStat(powerRollLine ?? "");
  const characteristic = stat ? [stat] : [];

  const safeValue = Number.isInteger(parseInt(resource?.value, 10))
    ? parseInt(resource.value, 10)
    : 0;

  const resourceValue = resource ? safeValue : null;

  const formattedAfter = [effectAfter?.trim(), extractedEffectAfter?.trim()]
    .filter(Boolean)
    .join(" ");

  const effect = parseEffectBlock(effectBefore, formattedAfter);

  return {
    name,
    type: "ability",
    img: icon,
    system: {
      story,
      keywords,
      type,
      category: "heroic",
      resource: resourceValue,
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
      trigger: trigger?.trim() ?? "",
      damageDisplay: "melee"
    },
    effects: [],
    flags: {}
  };
}

export function parseMultipleAbilities(rawAbilities) {
  const input = Array.isArray(rawAbilities)
    ? rawAbilities
    : typeof rawAbilities === "object" && rawAbilities !== null
      ? [rawAbilities]
      : [];

  return input.map(parseAbility).filter(Boolean);
}

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
    effectAfter: "",
    powerRollLine: "",
    distanceLine: "",
    trigger: ""
  };

  let mode = "name";

  for (const line of lines) {
    const resourceMatch = line.match(/\((\d+)\s+(\w+)\)/i);
    const rawType = resourceMatch?.[2] ?? "";
    const normalizedType = normalizeResourceType(rawType);

    if (/^\w.*\(\d+\s+\w+\)/i.test(line)) {
      if (current.name) abilities.push({ ...current });

      const rawValue = parseInt(resourceMatch?.[1], 10);
      const safeValue = Number.isInteger(rawValue) ? rawValue : 0;

      current = {
        name: line.replace(/\(\d+\s+\w+\)/i, "").trim(),
        resource: {
          value: safeValue,
          type: normalizedType ?? "unknown"
        },
        story: "",
        header: "",
        tierLines: [],
        effectBefore: "",
        effectAfter: "",
        powerRollLine: "",
        distanceLine: "",
        trigger: ""
      };

      mode = "story";
      continue;
    }

    ({ current, mode } = parseAbilityLine(line, current, mode));
  }

  if (current.name) abilities.push({ ...current });

  return abilities.map(a => ({
    ...a,
    story: a.story.trim(),
    effectBefore: a.effectBefore.trim(),
    effectAfter: a.effectAfter.trim(),
    powerRollLine: a.powerRollLine?.trim() ?? "",
    distanceLine: a.distanceLine?.trim() ?? "",
    trigger: a.trigger?.trim() ?? ""
  }));
}