import { parseKeywordLine, isLikelyKeywordLine } from "./keywordParser.js";
import { parseTarget, mapCharacteristic } from "./tierParser.js";

/**
 * Parses a single ability block into a structured Foundry item object.
 */
export function parseAbilityCore(rawText = "") {
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  const result = {
    name: "",
    type: "ability",
    img: "",
    system: {
      source: {
        book: "Heroes",
        page: "", // ✅ Page left blank
        license: "Draw Steel Creator License",
        revision: 1
      },
      _dsid: "",
      story: "",
      keywords: [],
      type: "main",
      category: "",
      resource: 0,
      trigger: "",
      distance: {},
      damageDisplay: "melee",
      target: { type: "enemy", value: null },
      power: {
        roll: { formula: "@chr", characteristics: [] },
        effects: {}
      },
      effect: { before: "", after: "" },
      spend: { text: "", value: null }
    },
    effects: [],
    flags: {},
    ownership: { default: 0 }
  };

  let lineIndex = 0;

  const headerMatch = lines[lineIndex]?.match(/^(.+?)\s*\((\d+)\s+(\w+)\)$/);
  if (headerMatch) {
    result.name = headerMatch[1].trim();
    result.system.resource = Number(headerMatch[2]);
    result.system.category = headerMatch[3].toLowerCase();
    result.system._dsid = result.name.toLowerCase().replace(/\s+/g, "-");
    lineIndex++;
  }

  const keywordIndex = lines.findIndex((line, i) => i > lineIndex && isLikelyKeywordLine(line));
  const storyLines = lines.slice(lineIndex, keywordIndex);
  result.system.story = storyLines.join(" ").trim();

  const keywordData = parseKeywordLine(lines[keywordIndex] ?? "");
  result.system.type = keywordData.type;
  result.system.keywords = keywordData.keywords.map(k => k.toLowerCase());

  const rangeLine = lines[keywordIndex + 1] ?? "";
  const rangeMatch = rangeLine.match(/e\s+(\d+)\s+(\w+)(?:\s+within\s+(\d+))?\s+x\s+(.+)/i);
  if (rangeMatch) {
    result.system.distance = {
      type: rangeMatch[2].toLowerCase(),
      primary: Number(rangeMatch[1]),
      ...(rangeMatch[3] && { secondary: Number(rangeMatch[3]) })
    };
    result.system.target = parseTarget(rangeMatch[4]);
  }

  const rollLine = lines[keywordIndex + 2] ?? "";
  const rollMatch = rollLine.match(/Power Roll\s*\+?\s*(\w+)/i);
  const rollStat = rollMatch?.[1]?.toLowerCase() ?? "intuition";
  result.system.power.roll.formula = "@chr";
  result.system.power.roll.characteristics = [rollStat];

  const potencyMap = {
    "á": "@potency.weak",
    "é": "@potency.average",
    "í": "@potency.strong"
  };

  const damageEffectId = foundry.utils.randomID();
  const conditionEffectId = foundry.utils.randomID();

  const damageEffect = {
    name: "",
    img: null,
    type: "damage",
    _id: damageEffectId,
    damage: {}
  };

  const conditionEffect = {
    name: "frightened",
    img: null,
    type: "applied",
    _id: conditionEffectId,
    applied: {}
  };

  const tierLines = lines.filter(line => /^[áéí]/.test(line));
  for (const line of tierLines) {
    const tier = line[0];
    const tierKey = tier === "á" ? "tier1" : tier === "é" ? "tier2" : "tier3";
    const content = line.slice(1).trim();

    const [damagePart, conditionPartRaw] = content.split(";");
    const damageMatch = damagePart?.match(/(\d+)\s+(\w+)/);
    const damageValue = damageMatch?.[1];
    const damageType = damageMatch?.[2];

    if (damageValue && damageType) {
      damageEffect.damage[tierKey] = {
        value: damageValue,
        types: [damageType],
        properties: []
      };
    }

    if (conditionPartRaw?.toLowerCase().includes("frightened")) {
      conditionEffect.applied[tierKey] = {
        display: tier === "á" ? "{{potency}}, frightened (save ends)" : "",
        potency: {
          value: potencyMap[tier],
          characteristic: tier === "á" ? rollStat : ""
        },
        effects: {
          frightened: {
            condition: "failure",
            end: "save",
            properties: []
          }
        }
      };
    }
  }

  const hasDamage = Object.values(damageEffect.damage).some(tier => tier?.types?.[0]);
  if (hasDamage) {
    result.system.power.effects[damageEffectId] = damageEffect;
  }

  const hasCondition = Object.keys(conditionEffect.applied).length > 0;
  if (hasCondition) {
    result.system.power.effects[conditionEffectId] = conditionEffect;
  }

  const effectIndex = lines.findIndex(line => /^Effect:/i.test(line));
  if (effectIndex !== -1) {
    const effectLines = lines.slice(effectIndex);
    const effectText = effectLines.map(l => l.replace(/^Effect:\s*/i, "")).join(" ").trim();
    result.system.effect.after = `<p>${effectText}</p>`;
  }

  return result;
}

/**
 * Splits and parses multiple abilities from a single raw input block.
 */
export function parseMultipleAbilities(rawText = "") {
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const blocks = [];
  let currentBlock = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isHeader = /^(.+?)\s*\((\d+)\s+\w+\)$/.test(line);

    if (isHeader && currentBlock.length > 0) {
      blocks.push(currentBlock);
      currentBlock = [];
    }

    currentBlock.push(line);
  }

  if (currentBlock.length > 0) {
    blocks.push(currentBlock);
  }

  const abilities = blocks.map(blockLines => {
    const blockText = blockLines.join("\n");
    return parseAbilityCore(blockText);
  });

  return abilities;
}