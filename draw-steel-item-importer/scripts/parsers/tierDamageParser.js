import { mapCharacteristic } from "./tierUtils.js";

/**
 * Parses the damage portion of a tiered line.
 * Supports:
 * - "9 fire damage"
 * - "4 + Iholy damage"
 * - "14 + R fire damage"
 * - "14 + R damage"
 * - "19 damage"
 * - "14 + Idamage"
 * - "2 + Mholy" (missing "damage")
 */
export function parseTierDamage(raw = "", symbol = "") {
  if (!raw || typeof raw !== "string") return null;

  const cleaned = raw.trim();

  // 🔹 "9 fire damage"
  if (/^\d+\s+[a-z]+\s+damage$/i.test(cleaned)) {
    console.log("🧩 Matched: simple damage");
    return parseSimpleDamage(cleaned);
  }

  // 🔹 "4 + Rfire damage" or "4 + R fire damage"
  if (/^\d+\s*\+\s*([marip])\s*([a-z]+)\s+damage$/i.test(cleaned)) {
    console.log("🧩 Matched: stat-type spaced or fused damage");
    return parseStatTypeFlexible(cleaned);
  }

  // 🔹 "14 + R damage"
  if (/^\d+\s*\+\s*([marip])\s+damage$/i.test(cleaned)) {
    console.log("🧩 Matched: stat-only damage");
    return parseStatOnlyDamage(cleaned);
  }

  // 🔹 "14 + Idamage"
  if (/^\d+\s*\+\s*([marip])damage$/i.test(cleaned)) {
    console.log("🧩 Matched: stat-only fused damage");
    return parseStatOnlyFusedDamage(cleaned);
  }

  // 🔹 "19 damage"
  if (/^\d+\s+damage$/i.test(cleaned)) {
    console.log("🧩 Matched: bare damage");
    return parseBareDamage(cleaned);
  }

  // 🔹 "2 + Mholy" (missing "damage")
  const fusedMatch = cleaned.match(/^(\d+)\s*\+\s*([marip])([a-z]+)$/i);
  if (fusedMatch) {
    console.log("🧩 Fallback matched: fused stat-type without 'damage'");
    const [, base, statCode, type] = fusedMatch;
    return {
      value: `${base} + @chr`,
      types: [type.toLowerCase()],
      characteristic: mapCharacteristic(statCode)
    };
  }

  console.warn(`⚠️ Damage line did not match expected format: "${raw}"`);
  return null;
}

// 🔹 "9 fire damage"
function parseSimpleDamage(raw) {
  const match = raw.match(/^(\d+)\s+([a-z]+)\s+damage$/i);
  if (!match) return null;
  const [, base, type] = match;
  return {
    value: base,
    types: [type.toLowerCase()],
    characteristic: null
  };
}

// 🔹 "4 + Rfire damage", "4 + R fire damage", or "4 + Mholy damage"
function parseStatTypeFlexible(raw) {
  // Try spaced format: "4 + R fire damage"
  const match = raw.match(/^(\d+)\s*\+\s*([marip])\s*([a-z]+)\s+damage$/i);
  if (match) {
    const [, base, statCode, type] = match;
    return {
      value: `${base} + @chr`,
      types: [type.toLowerCase()],
      characteristic: mapCharacteristic(statCode)
    };
  }

  // Fallback for fused format: "4 + Mholy damage"
  const fusedMatch = raw.match(/^(\d+)\s*\+\s*([marip][a-z]+)\s+damage$/i);
  if (fusedMatch) {
    const [, base, token] = fusedMatch;
    const statCode = token[0].toLowerCase();
    const type = token.slice(1).toLowerCase();
    return {
      value: `${base} + @chr`,
      types: [type],
      characteristic: mapCharacteristic(statCode)
    };
  }

  return null;
}

// 🔹 "14 + R damage"
function parseStatOnlyDamage(raw) {
  const match = raw.match(/^(\d+)\s*\+\s*([marip])\s+damage$/i);
  if (!match) return null;
  const [, base, statCode] = match;
  return {
    value: `${base} + @chr`,
    types: [],
    characteristic: mapCharacteristic(statCode)
  };
}

// 🔹 "14 + Idamage"
function parseStatOnlyFusedDamage(raw) {
  const match = raw.match(/^(\d+)\s*\+\s*([marip])damage$/i);
  if (!match) return null;
  const [, base, statCode] = match;
  return {
    value: `${base} + @chr`,
    types: [],
    characteristic: mapCharacteristic(statCode)
  };
}

// 🔹 "19 damage"
function parseBareDamage(raw) {
  const match = raw.match(/^(\d+)\s+damage$/i);
  if (!match) return null;
  const [, base] = match;
  return {
    value: base,
    types: [],
    characteristic: null
  };
}
