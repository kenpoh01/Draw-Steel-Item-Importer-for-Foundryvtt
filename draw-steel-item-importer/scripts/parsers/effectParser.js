import { formatBulletedBlock, formatNarrativeHTML, formatEffectText } from "./formatters.js";

/**
 * Parses effectBefore and effectAfter into formatted HTML.
 * @param {string} before - Raw effectBefore text
 * @param {string} after - Raw effectAfter text
 * @returns {object} - { before, after }
 */
export function parseEffectBlock(before = "", after = "") {
    const formattedBefore = before.includes("¥") && !before.includes("\n")

    ? formatBulletedBlock(before, false)
    : formatNarrativeHTML(before);

  const formattedAfter = formatEffectText(after);



  return {
    before: formattedBefore,
    after: formattedAfter
  };
}