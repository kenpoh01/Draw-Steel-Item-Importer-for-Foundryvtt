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

  if (!name || !header) {
    console.warn("⚠️ Skipping ability due to missing name or header:", name);
    return null;
  }

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

  const resourceValue = resource?.value ?? 0;
  const resourceType = resource?.type ?? "unknown";

  // ✅ Format "Strained:" clause in effectAfter
 let formattedAfter = [effectAfter?.trim(), extractedEffectAfter?.trim()]
  .filter(Boolean)
  .join(" ");

  const effect = parseEffectBlock(effectBefore, formattedAfter);

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
      resource: resourceValue,
      resourceType,
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
      damageDisplay: "melee"
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
    powerRollLine: "",
    distanceLine: ""
  };

  let mode = "name";

  for (const line of lines) {
    const resourceMatch = line.match(/\((\d+)\s+(\w+)\)/i);
    const rawType = resourceMatch?.[2] ?? "";
    const normalizedType = normalizeResourceType(rawType);

    const isAbilityStart = /^[A-Z][a-zA-Z\s'-]{2,40}(\(\d+\s+\w+\))?$/.test(line.trim());
	const isHeaderLike = /^(main action|maneuver|triggered|effect|move:|power roll)/i.test(line.trim());


if (isAbilityStart && !isHeaderLike) {

     if (current.name) abilities.push({ ...current });

      current = {
        name: line.replace(/\(\d+\s+\w+\)/i, "").trim(),
        resource: /^\w.*\(\d+\s+\w+\)/.test(line)
			? {
				value: parseInt(resourceMatch?.[1] ?? "0", 10),
				type: normalizedType ?? "unknown"
				}
			: {
				value: 0,
				type: "none"
				},
        story: "",
        header: "",
        tierLines: [],
        effectBefore: "",
        effectAfter: "",
        powerRollLine: "",
        distanceLine: ""
      };

      mode = "story";
    }

    else if (/\b(main action|maneuver|triggered|free triggered|free maneuver|no action|villain|move)\s*$/i.test(line)) {
      current.header = line.trim();
    }

    else if (/^power roll\s*\+\s*/i.test(line)) {
      current.powerRollLine = line.trim();
      mode = "tier";
    }

 else if (/^(effect:|special:)/i.test(line)) {
  const cleaned = line.replace(/^(effect:|special:)\s*/i, "").trim();
  mode = "effect";

  if (current.tierLines.length > 0) {
    current.effectAfter += cleaned + " ";
  } else {
    current.effectBefore += cleaned + " ";
  }
}

// ✅ Detect and route "Strained:" lines explicitly
else if (/^strained:/i.test(line)) {
  const formatted = "<br><strong>Strained:</strong> " + line.replace(/^strained:\s*/i, "").trim();
  if (current.tierLines.length > 0) {
    current.effectAfter += formatted + " ";
  } else {
    current.effectBefore += formatted + " ";
  }
  mode = "effect";
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
      if (mode === "story") {
        current.story += line + " ";
      } else if (mode === "tier") {
        current.tierLines.push(line);
      } else if (mode === "effect") {
        if (current.tierLines.length > 0) {
          current.effectAfter += line + " ";
        } else {
          current.effectBefore += line + " ";
        }
      }
    }
  }

  if (current.name) abilities.push({ ...current });

  return abilities.map(a => ({
    ...a,
    story: a.story.trim(),
    effectBefore: a.effectBefore.trim(),
    effectAfter: a.effectAfter.trim(),
    powerRollLine: a.powerRollLine?.trim() ?? "",
    distanceLine: a.distanceLine?.trim() ?? ""
  }));
}