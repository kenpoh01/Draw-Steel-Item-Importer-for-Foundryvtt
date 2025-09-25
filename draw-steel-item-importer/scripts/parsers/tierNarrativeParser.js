import { potencyMap, mapCharacteristic } from "./tierUtils.js";

/**
 * Parses the narrative portion of a tiered line.
 * Example: "a<w, dazed (save ends)" → { display, potency, condition }
 * @param {string} raw - Raw narrative string
 * @returns {object|null}
 */
export function parseTierOther(raw = "") {
  if (!raw || typeof raw !== "string") return null;

  // Match first stat-potency pair like "a<w"
  const match = raw.match(/\b([marip])<([wvs])\b/i);
  const statCode = match?.[1]?.toLowerCase();
  const potencyCode = match?.[2]?.toLowerCase();

  const potencyValue = potencyMap[potencyCode] ?? "@potency.average";
  const characteristic = mapCharacteristic(statCode);

  // Match known conditions
  const conditionMatch = raw.match(/\b(dazed|restrained|banished|stunned|blinded|silenced|confused)\b/i);
  const condition = conditionMatch?.[1]?.toLowerCase();

  // Remove stat-potency tags from the narrative
  const cleaned = raw.replace(/\b[marip]<[wvs],?\s*/gi, "").trim();

  console.log("🧾 Parsed tier narrative:");
  console.log("• Raw:", raw);
  console.log("• Stat code:", statCode);
  console.log("• Potency code:", potencyCode);
  console.log("• Condition:", condition);
  console.log("• Cleaned text:", cleaned);

  // If condition is present, return applied effect block
  if (condition) {
    return {
      display: match ? `{{Potency}}, ${condition} (save ends)` : `${condition} (save ends)`,
      potency: {
        value: potencyValue,
        characteristic
      }
    };
  }

  // Otherwise return generic other effect block
  return {
    display: match ? `{{Potency}}, ${cleaned}` : cleaned,
    potency: {
      value: potencyValue,
      characteristic
    }
  };
}