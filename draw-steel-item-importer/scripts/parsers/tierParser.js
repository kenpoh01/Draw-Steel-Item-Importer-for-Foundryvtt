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

    const conditionEffects = {}; // Track one applied effect per condition

    for (const line of lines) {
      console.log(`🔍 Processing tier line: "${line}"`);

      const symbol = line[0];
      const tierKey = getTierKey(symbol);
      console.log(`🔑 Tier symbol "${symbol}" → key "${tierKey}"`);
      if (!tierKey) {
        console.warn(`⚠️ Unknown tier symbol: "${symbol}"`);
        continue;
      }

      const damageOnly = line.indexOf(";") === -1;
      const damagePartRaw = damageOnly ? line : line.split(";")[0].trim();
      const narrativePartRaw = damageOnly ? null : line.split(";")[1]?.trim();

      console.log(`🧪 Damage part: "${damagePartRaw}"`);
      if (narrativePartRaw) console.log(`🧾 Narrative part: "${narrativePartRaw}"`);

      const cleanedDamagePart = damagePartRaw.replace(/^[áéí]\s*/, "").trim();
      console.log(`🧪 Cleaned damage part: "${cleanedDamagePart}"`);

      const damage = parseTierDamage(cleanedDamagePart, symbol);
      console.log("💥 Parsed damage:", damage);

      if (damage && damage.value) {
        damageEffect.damage[tierKey] = damage;
        console.log(`✅ Assigned to damageEffect.damage["${tierKey}"]`);
      }

      // 🔍 Detect and build applied condition effects
      const conditions = detectConditions(narrativePartRaw);
      for (const condition of conditions) {
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
          display: `{{potency}}, ${condition} (save ends)`,
          potency: {
            value: potencyMap[symbol] ?? "@potency.average",
            characteristic: damage?.characteristic ?? ""
          },
          effects: {
            [condition]: {
              condition: "failure",
              end: "save",
              properties: []
            }
          }
        };
      }

      // 🧼 Strip condition phrases from narrative before parsing otherEffect
      let cleanedNarrative = narrativePartRaw;
      for (const condition of conditions) {
        const regex = new RegExp(`\\b${condition}\\b.*?(\\)|$)`, "gi");
        cleanedNarrative = cleanedNarrative?.replace(regex, "").trim();
      }

      const other = parseTierOther(cleanedNarrative);
      if (other) {
        otherEffect.other[tierKey] = other;
        console.log(`📝 Assigned to otherEffect.other["${tierKey}"]`);
      }
    }

    if (Object.keys(damageEffect.damage).length > 0) {
      effects[damageEffect._id] = damageEffect;
      console.log("📦 Final damageEffect:", damageEffect);
    }

    if (Object.keys(otherEffect.other).length > 0) {
      effects[otherEffect._id] = otherEffect;
      console.log("📦 Final otherEffect:", otherEffect);
    }

    for (const effect of Object.values(conditionEffects)) {
      effects[effect._id] = effect;
      console.log(`🧬 Final applied effect for "${effect.name}":`, effect);
    }
  }

  else if (blockType === "bulleted" || blockType === "narrative") {
    const raw = lines.join(" ").replace(/^Effect:\s*/i, "").trim();
    console.log("📜 Raw narrative detected:", raw);

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
  }

  else {
    console.warn("⚠️ Unrecognized block type:", lines);
  }

  console.log("✅ Parsed effects:", effects);
  return effects;
}