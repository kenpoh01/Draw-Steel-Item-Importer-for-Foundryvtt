import { parseKeywordLine, isLikelyKeywordLine } from "./keywordParser.js";
import { parseDistanceLine } from "./distanceParser.js";
import {
  getTierKey,
  parseTierDamage,
  parseTierOther
} from "./tierParser.js";
import { resolveIcon } from "./iconResolver.js";

export function parseAbilityCore(rawText = "") {
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  const result = {
    name: "",
    type: "ability",
    img: "",
    system: {
      source: {
        book: "Heroes",
        page: "",
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
  const parsedRange = parseDistanceLine(rangeLine);
  if (parsedRange) {
    result.system.distance = parsedRange.distance;
    result.system.target = parsedRange.target;
  }

  const rollLine = lines[keywordIndex + 2] ?? "";
  const rollMatch = rollLine.match(/Power Roll\s*\+?\s*(\w+)/i);
  const rollStat = rollMatch?.[1]?.toLowerCase() ?? "intuition";
  result.system.power.roll.formula = "@chr";
  result.system.power.roll.characteristics = [rollStat];

  const damageEffectId = foundry.utils.randomID();
  const otherEffectId = foundry.utils.randomID();

  const damageEffect = {
    name: "",
    img: null,
    type: "damage",
    _id: damageEffectId,
    damage: {}
  };

  const otherEffect = {
    name: "",
    img: null,
    type: "other",
    _id: otherEffectId,
    other: {}
  };

  const tierLines = lines.filter(line => /^[áéí]/.test(line));
  for (const line of tierLines) {
    const tierSymbol = line[0];
    const tierKey = getTierKey(tierSymbol);
    const content = line.slice(1).trim();

    const [damagePart, conditionPartRaw] = content.split(";");

    const damage = parseTierDamage(damagePart, tierSymbol);
    if (damage) {
      damageEffect.damage[tierKey] = damage;
    }

    const other = parseTierOther(conditionPartRaw, tierSymbol, "presence");
    if (other) {
      otherEffect.other[tierKey] = other;
    }
  }

  if (Object.values(damageEffect.damage).some(tier => tier?.value)) {
    result.system.power.effects[damageEffectId] = damageEffect;
  }

  if (Object.keys(otherEffect.other).length > 0) {
    result.system.power.effects[otherEffectId] = otherEffect;
  }

  const effectIndex = lines.findIndex(line => /^Effect:/i.test(line));
  if (effectIndex !== -1) {
    const effectLines = lines.slice(effectIndex);
    const effectText = effectLines.map(l => l.replace(/^Effect:\s*/i, "")).join(" ").trim();
    result.system.effect.after = `<p>${effectText}</p>`;
  }

  result.img = resolveIcon(result);

  return result;
}

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

  return blocks.map(blockLines => {
    const blockText = blockLines.join("\n");
    return parseAbilityCore(blockText);
  });
}