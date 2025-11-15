import { enrichNarrative } from "./narrativeUtils.js";
import { LEVELED_KEYWORDS, UNIVERSAL_KEYWORDS } from "./keywordParser.js";
import { MARIP } from "./keywordParser.js";


export function parseLeveledTreasureBlock(rawText, { leveledType = "other", echelon = 1 }) {
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const item = {
    name: lines[0],
    type: "treasure",
    img: "icons/svg/item-bag.svg",
    folder: null,
    effects: [],
    flags: {},
    system: {
      description: {
        value: "",
        director: ""
      },
      source: {
        book: "Heroes",
        page: "",
        license: "Draw Steel Creator License"
      },
      _dsid: "treasure",
      kind: leveledType,
      category: "leveled",
      echelon,
      keywords: [],
      quantity: 1,
      project: {
        prerequisites: "",
        source: "",
        rollCharacteristic: [],
        yield: {
          amount: "1",
          display: ""
        },
        goal: 0
      }
    }
  };

  const flavorLines = [];
  const levelBlocks = {};
  let currentLevel = null;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];

    if (/^Keywords:/i.test(line)) {
      const keywordLine = line.replace(/^Keywords:/i, "").trim();
      const rawKeywords = keywordLine
        .split(/[,;]/)
        .flatMap(k => k.trim().toLowerCase().split(/\s+/))
        .filter(Boolean);

      const valid = [...(LEVELED_KEYWORDS[leveledType] || []), ...UNIVERSAL_KEYWORDS];
      item.system.keywords = rawKeywords.filter(k => valid.includes(k));
    } else if (/^Item Prerequisite:/i.test(line)) {
      item.system.project.prerequisites = line.replace(/^Item Prerequisite:/i, "").trim();
    } else if (/^Project Source:/i.test(line)) {
      item.system.project.source = line.replace(/^Project Source:/i, "").trim();
    } else if (/^Project Roll Characteristic:/i.test(line)) {
      const chars = line.replace(/^Project Roll Characteristic:/i, "").trim();
      item.system.project.rollCharacteristic = chars
		.split(/or|,/i)
		.map(c => c.trim().toLowerCase())
		.filter(c => MARIP.includes(c));

    } else if (/^Project Goal:/i.test(line)) {
      const goalMatch = line.match(/(\d+)/);
      if (goalMatch) item.system.project.goal = parseInt(goalMatch[1], 10);
    } else if (/^(\d+)(st|nd|rd|th) Level:/i.test(line)) {
      const match = line.match(/^(\d+)(st|nd|rd|th) Level:\s*(.*)/);
      currentLevel = parseInt(match[1]);
      levelBlocks[currentLevel] = [match[3].trim()];
    } else if (currentLevel) {
      levelBlocks[currentLevel].push(line.trim());
    } else {
      flavorLines.push(line.trim());
    }
  }

  const flavorHTML = `<p><em>${flavorLines.join(" ")}</em></p>`;
  let levelHTML = "";

  function ordinal(level) {
    if (level === 1) return "1st";
    if (level === 2) return "2nd";
    if (level === 3) return "3rd";
    return `${level}th`;
  }

  for (const level of [1, 5, 9]) {
    if (!levelBlocks[level]) continue;
    const enriched = enrichNarrative(levelBlocks[level].join(" "));
    levelHTML += `<p><strong>${ordinal(level)} Level:</strong> ${enriched}</p>`;
  }

  item.system.description.value = flavorHTML + levelHTML;
  return [item];
}

export function parseMultipleLeveledTreasures(rawText, options) {
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const blocks = [];
  let currentBlock = [];

  const connectorWords = new Set([
    "of", "and", "the", "in", "on", "at", "to", "for", "with", "by"
  ]);

  const normalize = s => s.replace(/[’‘]/g, "'").replace(/[“”]/g, '"');

  const isTitleLine = line => {
    if (!line || line.endsWith(".")) return false;

    const words = line.split(/\s+/);
    if (words.length === 1) return /^[A-Z][a-zA-Z'’]+$/.test(words[0]);

    const capitalized = words.filter(w =>
      /^[A-Z]/.test(w) || connectorWords.has(w.toLowerCase())
    );

    return capitalized.length >= Math.max(2, Math.floor(words.length * 0.6));
  };

  let readyForNewBlock = true;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (isTitleLine(line) && readyForNewBlock) {
      if (currentBlock.length) {
        blocks.push(currentBlock);
        currentBlock = [];
      }
      readyForNewBlock = false;
    }

    currentBlock.push(line);

    if (/^9th Level:/i.test(line)) {
      readyForNewBlock = true;
    }
  }

  if (currentBlock.length) blocks.push(currentBlock);

  const parsedItems = [];

  for (const block of blocks) {
    const blockText = block.join("\n");

    const titleLine = normalize(block[0]);
    const flavorLine = block[1] || "";

    const hasTitle = /^[A-Z][a-zA-Z0-9\s\-']+$/.test(titleLine);
    const hasFlavor = !/^Keywords:|^Item Prerequisite:/i.test(flavorLine);

    if (!hasTitle || !hasFlavor) {
      console.warn("⚠️ Skipping malformed block: missing title or flavor before metadata.");
      continue;
    }

    const parsed = parseLeveledTreasureBlock(blockText, options);
    parsedItems.push(...parsed);
  }

  return parsedItems;
}