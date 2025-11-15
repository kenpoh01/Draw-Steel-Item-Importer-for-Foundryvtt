// 🔹 Format bulleted narrative block
export function formatBulletedBlock(text, includePotency = false) {
  const parts = text.split("¥").map(p => p.trim()).filter(Boolean);
  const intro = parts.shift();
  const bullets = parts.map(b => `<li>${b}</li>`).join("");
  const prefix = includePotency ? `<p>{{Potency}}, ${intro}</p>` : `<p>${intro}</p>`;
  return `${prefix}<ul>${bullets}</ul>`;
}
export function formatEffectText(text = "") {
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


// 🔹 Format plain narrative block
export function formatNarrativeHTML(text) {
  return `<p>${text}</p>`;
}

