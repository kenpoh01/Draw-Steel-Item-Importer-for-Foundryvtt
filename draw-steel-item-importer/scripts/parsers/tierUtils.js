export const potencyMap = {
  "á": "@potency.weak",
  "é": "@potency.average",
  "í": "@potency.strong"
};

export function getTierKey(symbol) {
  return symbol === "á" ? "tier1"
       : symbol === "é" ? "tier2"
       : symbol === "í" ? "tier3"
       : null;
}

export function mapCharacteristic(letter) {
  const map = {
    m: "might",
    a: "agility",
    r: "reason",
    i: "intuition",
    p: "presence"
  };
  return map[letter?.toLowerCase()] || "none";
}