import { classifyBlock } from "./blockClassifier.js";
import { getTierKey, mapCharacteristic, potencyMap } from "./tierUtils.js";
import { formatBulletedBlock, formatNarrativeHTML } from "./formatters.js";
import { parseTierDamage } from "./tierDamageParser.js";
import { parseTierOther } from "./tierNarrativeParser.js";
import { detectConditions } from "./appliedEffectsBuilder.js";

export function parseTierBlock(lines = []) {
  console.log("🧩 Parsing tier block:", lines);

  // 🔧 Preprocess multi-line Effect blocks into a single line
  if (lines.some(line => line.trim().toLowerCase().startsWith("effect:"))) {
    const effectLines = lines.filter(line =>
      line.trim().toLowerCase().startsWith("effect:") || line.trim().startsWith("¥")
    );
    const joinedEffect = effectLines.join(" ");
    lines = [joinedEffect];
  }

  const blockType = classifyBlock(lines);
  const effects = {};
  let effectAfter = ""; // ✅ Top-level effect.after output

  const clauseMap = {
    strained: "Strained",
    persistent: "Persistent"
    // Add more here as needed: aura, passive, field, etc.
  };

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

    const conditionEffects = {};

   // 🧾 Clause extractor
const extractClause = (text) => {
  for (const key in clauseMap) {
    const label = clauseMap[key];
    const regex = new RegExp(`\\b${key}\\s*\\d*:\\s*.*$`, "i");
    const match = text.match(regex);
    if (match) {
      const cleanedText = match[0].replace(/^.*?:\s*/, "").trim();
      if (cleanedText) {
        effectAfter += `<strong>${match[0].split(":")[0]}:</strong> ${cleanedText}`;
        console.log(`🧾 Routed "${label}" clause to system.effect.after`);
      }
      return text.replace(regex, "").trim(); // ✅ return cleaned damage string
    }
  }
  return text; // ✅ fallback if no clause matched
};

    const tierLines = lines.filter(line => /^[áéí]/.test(line.trim()));
    const extraLines = lines.filter(line => !/^[áéí]/.test(line.trim()));

    for (const line of tierLines) {
      console.log(`🔍 Processing tier line: "${line}"`);

      const symbol = line[0];
      const tierKey = getTierKey(symbol);
      if (!tierKey) continue;

      const hasSemicolon = line.includes(";");
      let damagePartRaw = null;
      let narrativePartRaw = null;

      const cleanedLine = line.replace(/^[áéí]\s*/, "").trim();

      if (hasSemicolon) {
		damagePartRaw = cleanedLine.split(";")[0].trim();
		narrativePartRaw = cleanedLine.split(";")[1]?.trim();
	  } else {
		damagePartRaw = cleanedLine;
		narrativePartRaw = cleanedLine; // ✅ fallback for narrative-only tiers
	  }

      // 🧹 Extract clause from damage line
      damagePartRaw = extractClause(damagePartRaw);

      if (damagePartRaw) {
        console.log(`🧪 Damage part: "${damagePartRaw}"`);
        const cleanedDamagePart = damagePartRaw.trim();
        console.log(`🧪 Cleaned damage part: "${cleanedDamagePart}"`);

        const damage = parseTierDamage(cleanedDamagePart, symbol);
        console.log("💥 Parsed damage:", damage);

        if (damage && damage.value) {
          damageEffect.damage[tierKey] = damage;
          console.log(`✅ Assigned to damageEffect.damage["${tierKey}"]`);
        }
      }

      if (narrativePartRaw) {
        console.log(`🧾 Narrative part: "${narrativePartRaw}"`);
        const parsedNarrative = parseTierOther(narrativePartRaw);
        const condition = parsedNarrative?.display?.match(/\b(dazed|restrained|banished|stunned|blinded|silenced|confused|bleeding|grabbed|frightened|prone|slowed|taunted|weakened)\b/i)?.[0]?.toLowerCase();

        if (condition) {
          if (!conditionEffects[condition]) {
            conditionEffects[condition] = {
              name: condition,
              img: null,
              type: "applied",
              _id: foundry.utils.randomID(),
              applied: {}
            };
          }

          conditionEffects[condition].applied[tierKey] = {
            display: parsedNarrative.display,
            potency: parsedNarrative.potency,
            effects: {
              [condition]: {
                condition: "failure",
                end: "save",
                properties: []
              }
            }
          };

          console.log(`🧬 Assigned to applied effect for "${condition}"`);
        } else if (parsedNarrative?.display?.trim()) {
          otherEffect.other[tierKey] = parsedNarrative;
          console.log(`📝 Assigned to otherEffect.other["${tierKey}"]`);
        }
      }
    }

    // 🧾 Handle post-tier clause lines
    for (const line of extraLines) {
      extractClause(line);
    }

    if (Object.keys(damageEffect.damage).length > 0) {
      effects[damageEffect._id] = damageEffect;
      console.log("📦 Final damageEffect:", damageEffect);
    }

    if (
      Object.keys(otherEffect.other).length > 0 ||
      (otherEffect.effect && (otherEffect.effect.before || otherEffect.effect.after))
    ) {
      effects[otherEffect._id] = otherEffect;
      console.log("📦 Final otherEffect:", otherEffect);
    }

    for (const effect of Object.values(conditionEffects)) {
      effects[effect._id] = effect;
      console.log(`🧬 Final applied effect for "${effect.name}":`, effect);
    }

    return {
      effects,
      effectAfter: effectAfter.trim()
    };
  }

  else if (blockType === "bulleted" || blockType === "narrative") {
    let raw = lines.join(" ").replace(/^Effect:\s*/i, "").trim();
    console.log("📜 Raw narrative detected:", raw);

    for (const key in clauseMap) {
      const label = clauseMap[key];
      const regex = new RegExp(`^${key}\\s*\\d*:\\s*`, "i");

      if (regex.test(raw)) {
        raw = `<br><strong>${label}:</strong> ${raw.replace(regex, "").trim()}`;
      } else if (new RegExp(`${key}:`, "i").test(raw)) {
        raw = raw.replace(new RegExp(`(${key}:)`, "i"), `<br><strong>${label}:</strong>`);
      }
    }

    const formatted = blockType === "bulleted"
      ? formatBulletedBlock(raw, false)
      : formatNarrativeHTML(raw);

    const statMatch = raw.match(/\b(might|agility|reason|intuition|presence)\b/i);
    const stat = statMatch ? statMatch[1].toLowerCase() : "none";

    const effect = {
      _id: foundry.utils.randomID(),
      name: "",
      img: null,
      type: "other",
      other: {
        base: {
          display: formatted,
          potency: {
            value: "@potency.average",
            characteristic: stat
          }
        }
      }
    };

    effects[effect._id] = effect;

    return {
      effects,
      effectAfter: ""
    };
  }

  else {
    console.warn("⚠️ Unrecognized block type:", lines);
return {
  effects,
  effectAfter: effectAfter.trim()
};
  }
}