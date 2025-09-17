import { potencyMap } from "./tierUtils.js";

export function parseTierOther(conditionPartRaw, tierSymbol, rollStat = "presence") {
  const lower = conditionPartRaw?.toLowerCase() ?? "";
  const match = lower.match(/(?:p<[wvs],)?\s*(.+)/i);
  const text = match?.[1]?.trim();

  return text ? {
    display: `<p>{{Potency}}, ${text}</p>`,
    potency: {
      value: potencyMap[tierSymbol],
      characteristic: rollStat
    }
  } : null;
}