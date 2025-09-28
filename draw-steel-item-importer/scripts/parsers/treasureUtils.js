import { formatBulletedBlock, formatEffectText, formatNarrativeHTML } from "./formatters.js";
import { finalizeEffectTable } from "./effectTableBuilder.js";


export function formatTreasureEffect(text) {
  if (text.includes("¥")) return formatBulletedBlock(text);
  if (/^[-•]/m.test(text)) return formatEffectText(text);
  return formatNarrativeHTML(text);
}

export function extractField(lines, label) {
  const knownLabels = [
    "Keywords:",
    "Item Prerequisite:",
    "Project Source:",
    "Project Roll Characteristic:",
    "Project Goal:"
  ];

  const startIndex = lines.findIndex(line => line.startsWith(label));
  if (startIndex === -1) return "";

  const fieldLines = [];
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    if (i !== startIndex && knownLabels.some(l => line.startsWith(l))) break;
    fieldLines.push(i === startIndex ? line.replace(label, "").trim() : line.trim());
  }

  return fieldLines.join(" ").trim();
}

export function extractTierLines(lines) {
  return lines.filter(line => /^[áéí]/.test(line.trim()));
}

export function formatTierTable(item, tierLines) {
  return finalizeEffectTable(item, tierLines);
}


export function parseRollCharacteristic(line = "") {
  return line
    .split(/\s*(?:or|and|\/|,)\s*/i)
    .map(c => c.toLowerCase().trim())
    .filter(Boolean);
}