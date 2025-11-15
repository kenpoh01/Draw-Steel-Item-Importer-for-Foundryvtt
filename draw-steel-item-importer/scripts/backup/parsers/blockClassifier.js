export function classifyBlock(lines = []) {
  if (lines.every(line => /^[áéí]/.test(line))) return "tiered";

  const joined = lines.join(" ");
  if (joined.trim().toLowerCase().startsWith("effect:")) {
    if (joined.includes("¥")) return "bulleted";
    return "narrative";
  }

  return "unknown";
}