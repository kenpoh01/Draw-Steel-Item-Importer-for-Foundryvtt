import { iconMap } from "./iconMap.js";

/**
 * Resolves an icon path based on damage types, keywords, and distance type.
 * Supports alias normalization and randomized selection.
 * @param {object} ability - Parsed ability object
 * @returns {string} - Relative icon path
 */
export function resolveIcon(ability = {}) {
  const keywordAliases = {
    blessing: "holy",
    faith: "holy",
    divine: "holy",
    undead: "death",
    decay: "corruption",
    shock: "lightning",
    electric: "lightning",
    projectile: "ranged",
    attack: "strike",
    healing: "heal",
    aura: "aura",
    burst: "burst",
    cone: "movement",
    line: "beam",
    shadow: "unholy" 
  };

  // 🔹 Priority 1: Damage type-based matching
  const damageTypes = Object.values(ability.system?.power?.effects ?? {})
    .filter(e => e.type === "damage")
    .flatMap(e => Object.values(e.damage ?? {}))
    .flatMap(tier => tier.types ?? []);

  for (const type of damageTypes) {
    const normalized = keywordAliases[type.toLowerCase()] ?? type.toLowerCase();
    if (iconMap[normalized]) {
      const options = iconMap[normalized];
      const chosen = options[Math.floor(Math.random() * options.length)];
      return `icons/${chosen}`;
    }
  }

  // 🔹 Priority 2: Keyword-based matching
  const content = [
    ability.name ?? "",
    ability.system?.story ?? "",
    ability.system?.effect?.after ?? "",
    ...(ability.system?.keywords ?? [])
  ].join(" ").toLowerCase();


  // 🔹 Priority 3: Fuzzy matching of ability names
  const tokens = content.split(/\W+/); // split by non-word characters

for (const [rawKeyword, filenames] of Object.entries(iconMap)) {
  const keyword = keywordAliases[rawKeyword] ?? rawKeyword;
  if (tokens.some(t => t.includes(keyword))) { 
    const chosen = filenames[Math.floor(Math.random() * filenames.length)];
    return `icons/${chosen}`;
  }
}

  // 🔹 Priority 4: Distance type matching
  const distanceType = ability.system?.distance?.type?.toLowerCase();
  const normalizedDistance = keywordAliases[distanceType] ?? distanceType;

  if (normalizedDistance && iconMap[normalizedDistance]) {
    const options = iconMap[normalizedDistance];
    const chosen = options[Math.floor(Math.random() * options.length)];
    return `icons/${chosen}`;
  }

  // 🔹 Final fallback
  return "icons/svg/item-bag.svg";
}