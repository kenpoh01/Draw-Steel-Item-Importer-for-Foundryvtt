import { potencyMap, mapCharacteristic } from "./tierUtils.js";

/**
 * Parses the narrative portion of a tiered line.
 * Example: "m<w, before taking damage..." → { display, potency }
 * @param {string} raw - Raw narrative string
 * @returns {object|null}
 */
export function parseTierOther(raw = "") {
  if (!raw || typeof raw !== "string") return null;

  // Match first stat-potency pair like "m<w" or "a<v"
  const match = raw.match(/\b([marip])<([wvs])\b/i);
  const statCode = match?.[1]?.toLowerCase();
  const potencyCode = match?.[2]?.toLowerCase();

  const potencyValue = potencyMap[potencyCode] ?? "@potency.average";
  const characteristic = mapCharacteristic(statCode);

  // Remove all stat-potency tags from the narrative
  const cleaned = raw.replace(/\b[marip]<[wvs],?\s*/gi, "").trim();

  console.log("🧾 Parsed tier narrative:");
  console.log("• Raw:", raw);
  console.log("• Stat code:", statCode);
  console.log("• Potency code:", potencyCode);
  console.log("• Cleaned text:", cleaned);

  return {
    display: `{{Potency}}, ${cleaned}`,
    potency: {
      value: potencyValue,
      characteristic
    }
  };
}