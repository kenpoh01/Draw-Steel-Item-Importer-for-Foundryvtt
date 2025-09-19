import { mapCharacteristic, potencyMap } from "./tierUtils.js";
import { generateID } from "./tierUtils.js"; // or use foundry.utils.randomID()

export const SUPPORTED_CONDITIONS = [
  "bleeding", "dazed", "grabbed", "frightened", "prone",
  "restrained", "slowed", "taunted", "weakened"
];

/**
 * Detects supported conditions in a narrative string.
 * @param {string} text
 * @returns {string[]} Array of matched condition names
 */
export function detectConditions(text = "") {
  if (!text || typeof text !== "string") return [];
  const normalized = text.toLowerCase();
  return SUPPORTED_CONDITIONS.filter(cond => normalized.includes(cond));
}

/**
 * Builds a schema-compliant applied effect object for a condition.
 * Includes full tier1 metadata and minimal tier2/tier3 stubs.
 * @param {string} condition - e.g. "restrained"
 * @param {object} potencyByTier - { tier1, tier2, tier3 }
 * @param {object} characteristicByTier - { tier1, tier2, tier3 }
 * @returns {object} Applied effect object
 */
export function buildAppliedEffect(condition, potencyByTier, characteristicByTier) {
  const _id = foundry.utils.randomID();

  const buildTier = (tier, label) => ({
    display: label === "tier1" ? `{{potency}}, ${condition} (save ends)` : "",
    potency: {
      value: potencyByTier[tier] ?? "@potency.average",
      characteristic: characteristicByTier[tier] ?? ""
    },
    effects: {
      [condition]: {
        condition: "failure",
        end: "save",
        properties: []
      }
    }
  });

  return {
    name: condition,
    img: null,
    type: "applied",
    _id,
    applied: {
      tier1: buildTier("tier1", "tier1"),
      tier2: buildTier("tier2", "tier2"),
      tier3: buildTier("tier3", "tier3")
    }
  };
}