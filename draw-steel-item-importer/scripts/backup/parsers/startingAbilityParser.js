import { parseTierBlock } from "./tierParser.js";
import { parseEffectBlock } from "./effectParser.js";
import { resolveIcon } from "./iconResolver.js";
import { normalizeKeywords, KNOWN_TYPES } from "./keywordParser.js";
import { parseDistanceAndTarget } from "./distanceParser.js";

/** Detects valid ability names */
function isAbilityName(line = "") {
  const trimmed = line.trim();

  // Normalize smart quotes and apostrophes
  const normalized = trimmed
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"');

  const lower = normalized.toLowerCase();

  const isShortTitle = /^[“"]?[A-Z][\w\s'",\-!?.]{2,40}[”"]?$/.test(normalized);
  const isExpressiveSingleWord = /^[A-Z][a-zA-Z'’\-!?.]{3,20}$/.test(normalized);

  if (!isShortTitle && !isExpressiveSingleWord) {
    console.log(`⛔ Not a valid ability name: "${line}"`);
  }

  const endsWithType = KNOWN_TYPES.some(type => lower.endsWith(type));
  return (isShortTitle || isExpressiveSingleWord) && !endsWithType;
}

/** Creates a blank ability block */
function createEmptyAbility(name = "") {
  return {
    name: name.trim(),
    resource: null,
    story: "",
    header: "",
    tierLines: [],
    effectBefore: "",
    effectAfter: "",
    powerRollLine: "",
    distanceLine: "",
    trigger: "",
    spend: { value: 0, text: "" }
  };
}

/** Converts raw multiline ability text into structured ability objects for costless (starting) abilities */
export function preprocessStartingAbilities(rawText = "") {
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const abilities = [];

  let current = createEmptyAbility();
  let mode = "name";

  for (const line of lines) {
    const isAbilityStart = isAbilityName(line);

    if (isAbilityStart) {
      if (current.name) abilities.push({ ...current });
      current = createEmptyAbility(line);
      mode = "story";
      continue;
    }

    if (/^trigger:/i.test(line)) {
      current.trigger = line.replace(/^trigger:\s*/i, "").trim();
      continue;
    }

    const spendMatch = line.match(/^Spend\s+(\d+)\s+(\w+):\s*(.+)$/i);
    if (spendMatch) {
      current.spend = {
        value: parseInt(spendMatch[1], 10),
        text: spendMatch[3].trim()
      };
      continue;
    }

    if (KNOWN_TYPES.some(type => new RegExp(`\\b${type}\\b`, "i").test(line))) {
      current.header = line.trim();
      continue;
    }

    if (/^power roll\s*\+\s*/i.test(line)) {
      current.powerRollLine = line.trim();
      mode = "tier";
      continue;
    }

    if (/^(effect:|special:)/i.test(line)) {
      const cleaned = line.replace(/^(effect:|special:)\s*/i, "").trim();
      mode = "effect";

      if (current.tierLines.length > 0) {
        current.effectAfter += cleaned + " ";
      } else {
        current.effectBefore += cleaned + " ";
      }
      continue;
    }

    if (/^strained:/i.test(line)) {
      const formatted = "<br><strong>Strained:</strong> " + line.replace(/^strained:\s*/i, "").trim();
      if (current.tierLines.length > 0) {
        current.effectAfter += formatted + " ";
      } else {
        current.effectBefore += formatted + " ";
      }
      mode = "effect";
      continue;
    }

    if (/^[áéí]/.test(line)) {
      mode = "tier";
      current.tierLines.push(line);
      continue;
    }

    if (mode === "tier") {
      const lastIndex = current.tierLines.length - 1;
      if (lastIndex >= 0) {
        current.tierLines[lastIndex] += " " + line;
      }
      continue;
    }

    if (/^e\s/i.test(line)) {
      current.distanceLine = line.trim();
      continue;
    }

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

  if (current.name) abilities.push({ ...current });

  return abilities.map(raw => {
    const { keywords, type } = normalizeKeywords(raw.header);
    const result = parseDistanceAndTarget(raw.distanceLine ?? raw.header);
    const distance = result?.distance ?? { type: "special" };
    const target = result?.target ?? { type: "special", value: null };

    const tierInput = raw.tierLines.length > 0 ? raw.tierLines : [];

    const { effects: tiers, effectAfter: extractedEffectAfter } = parseTierBlock(tierInput);
    const icon = resolveIcon({
      system: {
        story: raw.story,
        keywords,
        power: { effects: tiers },
        distance
      }
    });

    const formattedAfter = [raw.effectAfter?.trim(), extractedEffectAfter?.trim()]
      .filter(Boolean)
      .join(" ");

    const effect = parseEffectBlock(raw.effectBefore, formattedAfter);
	const hasTiers = raw.tierLines.length > 0;
	const power = hasTiers
		? {
			roll: { formula: "@chr", characteristics: [] },
			effects: tiers
			}
		: {};
  
    return {
      name: raw.name,
      type: "ability",
      img: icon,
      system: {
        _dsid: raw.name.toLowerCase().replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-"),
        story: raw.story.trim(),
        keywords,
        type,
        category: "heroic",
        resource: null,
        resourceType: "none",
        distance,
        target,
		power,
        effect,
        trigger: raw.trigger,
        spend: raw.spend,
        damageDisplay: "melee"
      },
      effects: [],
      flags: {}
    };
  });
}