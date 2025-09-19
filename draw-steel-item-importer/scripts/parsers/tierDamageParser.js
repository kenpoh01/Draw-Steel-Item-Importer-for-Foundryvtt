import { mapCharacteristic } from "./tierUtils.js";

/**
 * Parses the damage portion of a tiered line.
 * Supports:
 * - "9 fire damage"
 * - "4 + Iholy damage"
 * - "14 + R damage"
 * - "19 damage"
 * - "14 + Idamage"
 * @param {string} raw - Raw damage string
 * @param {string} symbol - Tier symbol (á, é, í)
 * @returns {object|null}
 */
export function parseTierDamage(raw = "", symbol = "") {
  if (!raw || typeof raw !== "string") return null;

  const cleaned = raw.trim();

  if (/^\d+\s+\w+\s+damage$/i.test(cleaned)) {
    return parseSimpleDamage(cleaned);
  }

  if (/^\d+\s*\+\s*[marip][a-z]+\s+damage$/i.test(cleaned)) {
    return parseStatTypeDamage(cleaned);
  }

  if (/^\d+\s*\+\s*[marip]\s+damage$/i.test(cleaned)) {
    return parseStatOnlyDamage(cleaned);
  }

  if (/^\d+\s*\+\s*[marip]damage$/i.test(cleaned)) {
    return parseStatOnlyFusedDamage(cleaned);
  }

  if (/^\d+\s+damage$/i.test(cleaned)) {
    return parseBareDamage(cleaned);
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

// 🔹 "4 + Iholy damage"
function parseStatTypeDamage(raw) {
  const match = raw.match(/^(\d+)\s*\+\s*([marip])([a-z]+)\s+damage$/i);
  if (!match) return null;
  const [, base, statCode, type] = match;
  return {
    value: `${base} + @chr`,
    types: [type.toLowerCase()],
    characteristic: mapCharacteristic(statCode)
  };
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