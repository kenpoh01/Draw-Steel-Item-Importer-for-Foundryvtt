// effectTableBuilder.js
import { enrichNarrative } from "./narrativeUtils.js";

// Optional: if you ever re-enable duration parsing
// import { parseDuration } from "./durationParser.js";

function convertTierLabel(tierChar) {
  switch (tierChar) {
    case "á":
    case "1":
      return "11 or less";
    case "é":
    case "2":
      return "12–16";
    case "í":
    case "3":
      return "17+";
    default:
      return tierChar;
  }
}

export function finalizeEffectTable(item, tierLines) {
  if (!tierLines.length) return;

  const glyphMap = {
    "á": "!",
    "1": "!",
    "é": "@",
    "2": "@",
    "í": "#",
    "3": "#"
  };

  const grouped = [];
  let currentTier = null;
  let currentText = [];

  for (const line of tierLines) {
    const match = line.match(/^([123áéí])\s+(.*)/);
    if (match) {
      if (currentTier) {
        grouped.push({ tier: currentTier, text: currentText.join(" ") });
      }
      currentTier = match[1];
      currentText = [match[2].trim()];
    } else if (currentTier) {
      currentText.push(line.trim());
    }
  }
  if (currentTier) {
    grouped.push({ tier: currentTier, text: currentText.join(" ") });
  }

  let html = `<dl class="power-roll-display">`;

  grouped.forEach(({ tier, text }) => {
    let rawText = text;
    let effectText = "";

    const effectSplit = rawText.split(/Effect:/i);
    if (effectSplit.length === 2) {
      rawText = effectSplit[0].trim();
      effectText = effectSplit[1].trim();
    }

    const enriched = enrichNarrative(rawText);
    const glyph = glyphMap[tier] || tier;
    const cssClass =
      glyph === "!" ? "tier1" :
      glyph === "@" ? "tier2" :
      glyph === "#" ? "tier3" :
      "tierX";

    html += `
      <dt class="${cssClass}">
        <p>${glyph}</p>
      </dt>
      <dd>
        <p>${enrichNarrative(rawText)}</p>
      </dd>`;

    if (effectText) {
      item.system.effect.after += `<p>${enrichNarrative(effectText)}</p>`;
    }

    // Effect schema generation has been removed per module creator request
  });

  html += `</dl>`;
  item.system.effect.before += html;
}