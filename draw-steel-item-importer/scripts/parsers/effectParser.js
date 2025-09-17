/**
 * Parses effect blocks into Draw Steel schema format.
 * Handles HTML formatting, bullet choices, and duration detection.
 * @param {string} before - Raw or HTML-formatted effect.before
 * @param {string} after - Raw or HTML-formatted effect.after
 * @returns {object} - Parsed effect object
 */
export function parseEffectBlock(before = "", after = "") {
  const effect = {
    before: formatEffectText(before),
    after: formatEffectText(after)
  };

  return effect;
}

/**
 * Converts raw effect text into HTML if needed.
 * Detects bullet points, wraps in <ul><li>, preserves paragraphs.
 * @param {string} text
 * @returns {string}
 */
function formatEffectText(text = "") {
  if (!text || typeof text !== "string") return "";

  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);

  const bullets = lines.filter(line => /^[-•¥]/.test(line));
  const paragraphs = lines.filter(line => !/^[-•¥]/.test(line));

  let html = "";

  if (paragraphs.length > 0) {
    html += paragraphs.map(p => `<p>${p}</p>`).join("");
  }

  if (bullets.length > 0) {
    html += "<ul>" + bullets.map(b => `<li><p>${b.replace(/^[-•¥]\s*/, "")}</p></li>`).join("") + "</ul>";
  }

  return html;
}