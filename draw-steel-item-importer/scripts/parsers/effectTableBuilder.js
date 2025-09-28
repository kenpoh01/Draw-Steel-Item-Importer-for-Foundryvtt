// effectTableBuilder.js
import { enrichNarrative } from "./narrativeUtils.js";
import { parseDuration } from "./durationParser.js";



function convertTierLabel(tierChar) {
  switch (tierChar) {
    case "á": case "1": return "11 or less";
    case "é": case "2": return "12–16";
    case "í": case "3": return "17+";
    default: return tierChar;
  }
}

export function finalizeEffectTable(item, tierLines) {
  if (!tierLines.length) return;

  let table = `<table><tbody>`;
  const activeEffects = [];

  // Group multiline tier blocks
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

  // Render table and enrich effects
  grouped.forEach(({ tier, text }) => {
    let rawText = text;
    let effectText = "";

    const effectSplit = rawText.split(/Effect:/i);
    if (effectSplit.length === 2) {
      rawText = effectSplit[0].trim();
      effectText = effectSplit[1].trim();
    }

    const enriched = enrichNarrative(rawText);
    const label = convertTierLabel(tier);

    table += `<tr><td data-colwidth="98"><p>${label}</p></td><td><p>${enriched}</p></td></tr>`;

    if (effectText) {
      item.system.effect.after += `<p>${enrichNarrative(effectText)}</p>`;
    }

    const conditionMatch = enriched.match(/\b(weakened|restrained|frightened|bleeding|slowed|taunted|dazed)\b/i);
    if (conditionMatch) {
      const durationData = parseDuration(enriched);

      activeEffects.push({
        name: conditionMatch[1].charAt(0).toUpperCase() + conditionMatch[1].slice(1),
        img: "icons/svg/downgrade.svg",
        origin: null,
        transfer: false,
        type: "base",
        system: {
          end: { type: durationData.end, roll: durationData.roll }
        },
        changes: [],
        disabled: false,
        duration: { rounds: durationData.rounds },
        description: "",
        tint: "#ffffff",
        statuses: [conditionMatch[1].toLowerCase()],
        sort: 0,
        flags: {},
        _stats: {
          coreVersion: "13.347",
          systemId: "draw-steel",
          systemVersion: "0.8.0",
          lastModifiedBy: null
        }
      });
    }
  });

  table += `</tbody></table>`;
  item.system.effect.before += table;
  item.effects.push(...activeEffects);
}