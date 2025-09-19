export function parseTarget(targetText) {
  if (!targetText || typeof targetText !== "string") {
    return { type: "special", value: null };
  }

  const numberWords = {
    one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10
  };

  const lower = targetText.toLowerCase().trim();
  let value = null;
  let type = "special";

  // ✅ Detect number word at start of phrase
  const numberMatch = lower.match(/^(one|two|three|four|five|six|seven|eight|nine|ten)\b/);
  if (numberMatch) {
    value = numberWords[numberMatch[1]];
  }

  // ✅ Nullify value for "all", "each", "every"
  if (/\b(all|each|every)\b/.test(lower)) {
    value = null;
  }

  // ✅ Detect target type
  if (lower.includes("creatures or objects")) type = "creatureObject";
else if (lower.includes("self or ally")) type = "selfOrAlly";
else if (lower.includes("self or creature")) type = "selfOrCreature";
else if (lower.includes("self ally")) type = "selfAlly";
else if (lower.includes("creature") || lower.includes("creatures")) type = "creature";
else if (lower.includes("object") || lower.includes("objects")) type = "object";
else if (lower.includes("enemy") || lower.includes("enemies")) type = "enemy";
else if (lower.includes("ally") || lower.includes("allies")) type = "ally";
else if (lower.includes("self")) type = "self";

  return { type, value };
}