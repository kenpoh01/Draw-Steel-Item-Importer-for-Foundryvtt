import { KNOWN_TYPES } from "./keywordParser.js";

export function parseAbilityLine(line, current, mode) {
  if (KNOWN_TYPES.some(type => new RegExp(`\\b${type}\\s*$`, "i").test(line))) {
    current.header = line.trim();
    return { current, mode };
  }

  if (/^power roll\s*\+\s*/i.test(line)) {
    current.powerRollLine = line.trim();
    return { current, mode: "tier" };
  }

  if (/^trigger:/i.test(line)) {
    current.trigger = line.replace(/^trigger:\s*/i, "").trim();
    return { current, mode: "trigger" };
  }

  if (/^effect:/i.test(line)) {
    const cleaned = line.replace(/^effect:\s*/i, "").trim();
    mode = "effect";

    if (current.tierLines.length > 0) {
      current.effectAfter += cleaned + " ";
    } else {
      current.effectBefore += cleaned + " ";
    }
    return { current, mode };
  }

  if (/^special:/i.test(line)) {
    const cleaned = line.replace(/^special:\s*/i, "").trim();
    mode = "special";

    const formatted = "<br><strong>Special:</strong> " + cleaned;
    if (current.tierLines.length > 0) {
      current.effectAfter += formatted + " ";
    } else {
      current.effectBefore += formatted + " ";
    }
    return { current, mode };
  }

if (/^mark benefit:/i.test(line)) {
  const cleaned = line.replace(/^mark benefit:\s*/i, "").trim();
  mode = "markBenefit";

  const formatted = "<br><strong>Mark Benefit:</strong> " + cleaned;
  if (current.tierLines.length > 0) {
    current.effectAfter += formatted + " ";
  } else {
    current.effectBefore += formatted + " ";
  }
  return { current, mode };
}

  if (/^strained:/i.test(line)) {
	const cleaned = line.replace(/^strained:\s*/i, "").trim();

    const formatted = "<br><strong>Strained:</strong> " + cleaned;
    if (current.tierLines.length > 0) {
      current.effectAfter += formatted + " ";
    } else {
      current.effectBefore += formatted + " ";
    }
    return { current, mode: "strained" };
  }

  if (/^[áéí]/.test(line)) {
    current.tierLines.push(line);
    return { current, mode: "tier" };
  }

  if (mode === "tier") {
    const lastIndex = current.tierLines.length - 1;
    if (lastIndex >= 0) {
      current.tierLines[lastIndex] += " " + line;
    }
    return { current, mode };
  }

  if (/^e\s/i.test(line)) {
    current.distanceLine = line.trim();
    return { current, mode };
  }

  if (mode === "trigger") {
    current.trigger += " " + line.trim();
    return { current, mode };
  }

  if (mode === "special") {
    if (current.tierLines.length > 0) {
      current.effectAfter += line + " ";
    } else {
      current.effectBefore += line + " ";
    }
    return { current, mode };
  }

if (mode === "markBenefit") {
  if (current.tierLines.length > 0) {
    current.effectAfter += line + " ";
  } else {
    current.effectBefore += line + " ";
  }
  return { current, mode };
}

if (mode === "strained") {
  if (current.tierLines.length > 0) {
    current.effectAfter += line + " ";
  } else {
    current.effectBefore += line + " ";
  }
  return { current, mode };
}

  if (mode === "story") {
    current.story += line + " ";
  } else if (mode === "tier") {
    current.tierLines.push(line);
  } else if (mode === "effect") {
    if (current.tierLines.length > 0) {
      current.effectAfter += line + " ";
    } else {
      current.effectBefore += line + " ";
    }
  }

  return { current, mode };
}