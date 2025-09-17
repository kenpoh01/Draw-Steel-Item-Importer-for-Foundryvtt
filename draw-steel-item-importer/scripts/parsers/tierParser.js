import { classifyBlock } from "./blockClassifier.js";
import { getTierKey, potencyMap } from "./tierUtils.js";
import { formatBulletedBlock, formatNarrativeHTML } from "./formatters.js";
import { parseTierDamage } from "./tierDamageParser.js";
import { parseTierOther } from "./tierNarrativeParser.js";

export function parseTierBlock(lines = []) {
  console.log("🧩 Parsing tier block:", lines);

  // 🔧 Preprocess multi-line Effect blocks into a single line
  if (lines.some(line => line.trim().toLowerCase().startsWith("effect:"))) {
  const effectLines = lines.filter(line =>
    line.trim().toLowerCase().startsWith("effect:") || line.trim().startsWith("¥")
  );
  const joinedEffect = effectLines.join(" ");
  lines = [joinedEffect];

  console.log("🧪 Joined effect block:", joinedEffect);
}

  const blockType = classifyBlock(lines);
  const effects = {};

  if (blockType === "tiered") {
    const damageEffect = {
      _id: foundry.utils.randomID(),
      name: "",
      img: null,
      type: "damage",
      damage: {}
    };

    const otherEffect = {
      _id: foundry.utils.randomID(),
      name: "",
      img: null,
      type: "other",
      other: {}
    };

    for (const line of lines) {
      const symbol = line[0];
      const tierKey = getTierKey(symbol);
      if (!tierKey) continue;

      const [damagePartRaw, narrativePartRaw] = line.split(";").map(s => s.trim());

      const damage = parseTierDamage(damagePartRaw, symbol);
      const potencyCode = narrativePartRaw?.match(/p<([wvs])/i)?.[1]?.toLowerCase();
      const potencyValue = potencyMap[potencyCode] ?? "@potency.average";
      const narrativeText = narrativePartRaw?.replace(/p<[wvs],?\s*/i, "").trim();

      const other = {
        display: `<p>{{Potency}}, ${narrativeText}</p>`,
        potency: {
          value: potencyValue,
          characteristic: "presence"
        }
      };

      if (damage && damage.value && damage.types.length > 0) {
        damageEffect.damage[tierKey] = damage;
      }

      if (other && narrativeText) {
        otherEffect.other[tierKey] = other;
      }
    }

    if (Object.keys(damageEffect.damage).length > 0) {
      effects[damageEffect._id] = damageEffect;
    }

    if (Object.keys(otherEffect.other).length > 0) {
      effects[otherEffect._id] = otherEffect;
    }
  }

  else if (blockType === "bulleted" || blockType === "narrative") {
    const raw = lines.join(" ").replace(/^Effect:\s*/i, "").trim();
    console.log("📜 Raw narrative detected:", raw);

    const formatted = blockType === "bulleted"
      ? formatBulletedBlock(raw, false)
      : formatNarrativeHTML(raw);

    const effect = {
      _id: foundry.utils.randomID(),
      name: "",
      img: null,
      type: "other",
      other: {
        tier1: {
          display: formatted,
          potency: {
            value: "@potency.average",
            characteristic: "presence"
          }
        }
      }
    };

    effects[effect._id] = effect;
  }

  else {
    console.warn("⚠️ Unrecognized block type:", lines);
  }

  console.log("✅ Parsed effects:", effects);
  return effects;
}