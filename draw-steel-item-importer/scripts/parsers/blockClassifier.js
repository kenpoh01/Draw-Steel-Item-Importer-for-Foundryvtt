export function classifyBlock(lines = []) {
  if (lines.every(line => /^[áéí]/.test(line))) return "tiered";

  const joined = lines.join(" ");
  if (joined.startsWith("Effect:")) {
    if (joined.includes("¥")) return "bulleted";
    return "narrative";
  }

  return "unknown";
}