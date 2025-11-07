import {
  formatTierTable,
  extractField,
  parseRollCharacteristic
} from "./treasureUtils.js";

import {
  formatBulletedBlock,
  formatEffectText,
  formatNarrativeHTML
} from "./formatters.js";

import { normalizeTreasureKeywords } from "./keywordParser.js";

export function preprocessTreasureBlocks(rawText, options = {}) {
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const blocks = [];
  let currentBlock = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1] || "";

    const isLikelyTitle =
      line.length < 40 &&
      !line.includes(":") &&
      !line.endsWith(".") &&
      nextLine.length > 0 &&
      !nextLine.includes(":") &&
      !/^[A-Z][a-z]+:/.test(nextLine);

    if (isLikelyTitle && currentBlock.length > 0) {
      blocks.push(currentBlock.join("\n"));
      currentBlock = [line];
    } else {
      currentBlock.push(line);
    }
  }

  if (currentBlock.length > 0) {
    blocks.push(currentBlock.join("\n"));
  }

  return blocks.map(text => parseTreasureBlock(text, options)).filter(Boolean);
}

export function parseTreasureBlock(text, { category = null, echelon = 1 } = {}) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const name = lines[0];
  const knownLabels = [
  "Keywords:",
  "Item Prerequisite:",
  "Project Source:",
  "Project Roll Characteristic:",
  "Project Goal:",
  "Effect:"
];

const descriptionLines = [];
for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (knownLabels.some(label => line.startsWith(label))) break;
  descriptionLines.push(line);
}
const description = `<em>${descriptionLines.join(" ").trim()}</em>`;

  const rawKeywordLine = extractField(lines, "Keywords:");
  const keywords = normalizeTreasureKeywords(rawKeywordLine);

  const prerequisite = extractField(lines, "Item Prerequisite:");
  const source = extractField(lines, "Project Source:");
  const rollCharacteristic = parseRollCharacteristic(
    extractField(lines, "Project Roll Characteristic:")
  );

  const rawGoal = extractField(lines, "Project Goal:");
  const goal = parseInt(rawGoal.match(/\d+/)?.[0] ?? "0", 10);

  const effectStartIndex = lines.findIndex(l => l.startsWith("Effect:"));
  const effectLines = effectStartIndex >= 0 ? lines.slice(effectStartIndex) : [];
  
const tierLines = [];
const nonTierLines = [];

let inTierBlock = false;

for (const line of effectLines) {
  const isTierStart = /^[áéí]/.test(line.trim());
  if (isTierStart) {
    inTierBlock = true;
    tierLines.push(line);
  } else if (inTierBlock && line.trim() !== "") {
    tierLines.push(line);
  } else {
    inTierBlock = false;
    nonTierLines.push(line);
  }
}

const effectText = nonTierLines.join(" ");
  
  
  const hasTierLines = effectLines.some(l => /^[áéí]/.test(l.trim()));

  // ✅ Construct item first
  const item = {
    name,
    type: "treasure",
    img: "icons/svg/chest.svg",
    system: {
      kind: "other",
      category,
      echelon,
      description: { value: "" }, // placeholder
      keywords,
      project: {
        prerequisites: prerequisite,
        source,
        rollCharacteristic,
        goal: isFinite(goal) ? goal : 0
      },
      effect: {
        before: "",
        after: ""
      }
    },
    effects: []
  };

if (hasTierLines) {
  formatTierTable(item, effectLines); // mutates item.system.effect.before
  item.system.description.value = `${description}<br><br>${formatEffectText(effectText)}${item.system.effect.before}`;
} else {
  item.system.description.value = `${description}<br><br>${formatNarrativeHTML(effectText)}`;
}

  return item;
}