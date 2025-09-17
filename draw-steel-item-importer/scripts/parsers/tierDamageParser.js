import { potencyMap, mapCharacteristic } from "./tierUtils.js";
import { VALID_DAMAGE_TYPES } from "./keywordParser.js";

export function parseTierDamage(damagePart, tierSymbol) {
  const match = damagePart?.match(/(\d+)\s*\+\s*([A-Z]?)(\w+)?/i);
  const value = match?.[1];
  const prefix = match?.[2] ?? "";
  let type = match?.[3]?.toLowerCase() ?? "";

  if (!VALID_DAMAGE_TYPES.includes(type)) type = "";

  return value ? {
    value: `${value} + @chr`,
    types: type ? [type] : [],
    properties: [],
    potency: {
      value: potencyMap[tierSymbol],
      characteristic: mapCharacteristic(prefix)
    }
  } : null;
}