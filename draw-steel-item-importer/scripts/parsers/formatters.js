export function formatBulletedBlock(text, includePotency = false) {
  const parts = text.split("¥").map(p => p.trim()).filter(Boolean);
  const intro = parts.shift();
  const bullets = parts.map(b => `<li>${b}</li>`).join("");
  const prefix = includePotency ? `<p>{{Potency}}, ${intro}</p>` : `<p>${intro}</p>`;
  return `${prefix}<ul>${bullets}</ul>`;
}

export function formatNarrativeHTML(text) {
  return `<p>${text}</p>`;
}