import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const outputDirectory = resolve(import.meta.dirname, "../amo/screenshots/source");
const ink = "#201f2a";
const muted = "#676475";
const brand = "#6547d9";
const line = "#ded9ea";

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function text(x, y, value, size = 14, weight = 400, fill = ink, extra = "") {
  return `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${fill}" ${extra}>${escapeXml(value)}</text>`;
}

function roundedRect(x, y, width, height, fill = "#fff", stroke = line, radius = 18, extra = "") {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${fill}" stroke="${stroke}" ${extra}/>`;
}

function checkbox(x, y, checked = true) {
  const fill = checked ? brand : "#fff";
  const mark = checked
    ? `<path d="M${x + 4} ${y + 8}l3 3 6-7" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`
    : "";
  return `${roundedRect(x, y, 16, 16, fill, checked ? brand : line, 4)}${mark}`;
}

function button(x, y, width, label, kind = "primary") {
  const palette = kind === "danger"
    ? ["#be3b51", "#be3b51", "#fff"]
    : kind === "secondary"
      ? ["#fff", line, ink]
      : [brand, brand, "#fff"];
  return `${roundedRect(x, y, width, 40, palette[0], palette[1], 11)}${text(
    x + width / 2,
    y + 25,
    label,
    13,
    700,
    palette[2],
    'text-anchor="middle"'
  )}`;
}

function brandIcon(x, y, size = 48) {
  const scale = size / 48;
  return `
    <g transform="translate(${x} ${y}) scale(${scale})">
      <rect width="48" height="48" rx="13" fill="url(#brandGradient)"/>
      <path d="M31 33H17l-6-6.2a2 2 0 0 1 0-2.8l12-12a2 2 0 0 1 2.8 0l8.2 8.2a2 2 0 0 1 0 2.8L22 35" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M30 25L21 16" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M12 40h25" fill="none" stroke="#57e4c5" stroke-width="3" stroke-linecap="round"/>
    </g>`;
}

function shell(content, overlay = "") {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800">
    <defs>
      <linearGradient id="background" x1="0" y1="0" x2="1280" y2="800">
        <stop stop-color="#eee9ff"/>
        <stop offset=".42" stop-color="#f7f5fc"/>
        <stop offset="1" stop-color="#f5f3fb"/>
      </linearGradient>
      <linearGradient id="brandGradient" x1="0" y1="0" x2="48" y2="48">
        <stop stop-color="#7c5cff"/>
        <stop offset="1" stop-color="#3e2ba8"/>
      </linearGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="160%">
        <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#2f2262" flood-opacity=".13"/>
      </filter>
    </defs>
    <rect width="1280" height="800" fill="url(#background)"/>
    <g font-family="Inter, Segoe UI, Arial, sans-serif">
      ${content}
      ${overlay}
    </g>
  </svg>`;
}

function header() {
  return `${brandIcon(100, 35)}
    ${text(164, 57, "History Keyword Cleaner", 23, 760)}
    ${text(164, 77, "Private, automatic history cleanup", 13, 400, muted)}
    ${roundedRect(888, 38, 292, 47, "#edf9f6", "#b8dfd7", 12)}
    ${text(1162, 57, "100% local", 12, 800, "#087f68", 'text-anchor="end"')}
    ${text(1162, 73, "No telemetry, accounts, or network requests", 11, 400, muted, 'text-anchor="end"')}`;
}

function statusCard(y = 109, complete = false) {
  const operation = complete
    ? `${roundedRect(919, 194, 229, 92, "#edf8f5", "#b8dfd7", 13)}
       <circle cx="939" cy="216" r="9" fill="#087f68"/>
       ${text(939, 220, "✓", 12, 900, "#fff", 'text-anchor="middle"')}
       ${text(955, 220, "Operation complete", 12, 700)}
       ${text(939, 246, "1,240 checked · 11 matches", 11, 400, muted)}
       ${text(939, 263, "Preview only — nothing deleted", 11, 700, "#087f68")}`
    : "";
  const statsY = complete ? 312 : 205;
  return `${roundedRect(897, y, 283, complete ? 430 : 313, "#fff", line, 18, 'filter="url(#shadow)"')}
    ${text(919, y + 30, "STATUS", 10, 800, brand, 'letter-spacing="1.4"')}
    ${text(919, y + 56, "Cleaning activity", 18, 740)}
    ${operation}
    ${text(919, statsY, "Last run", 11, 400, muted)}
    ${text(1158, statsY, "just now", 13, 700, ink, 'text-anchor="end"')}
    <line x1="919" y1="${statsY + 13}" x2="1158" y2="${statsY + 13}" stroke="${line}"/>
    ${text(919, statsY + 47, "Last deleted", 11, 400, muted)}
    ${text(1158, statsY + 47, "4", 13, 700, ink, 'text-anchor="end"')}
    <line x1="919" y1="${statsY + 60}" x2="1158" y2="${statsY + 60}" stroke="${line}"/>
    ${text(919, statsY + 94, "Total deleted", 11, 400, muted)}
    ${text(1158, statsY + 94, "137", 13, 700, ink, 'text-anchor="end"')}
    ${text(1158, y + (complete ? 407 : 290), "v0.1.1", 10, 400, muted, 'text-anchor="end"')}`;
}

function automationCard() {
  return `${roundedRect(100, 109, 777, 205, "#fff", line, 18, 'filter="url(#shadow)"')}
    ${text(122, 138, "AUTOMATION", 10, 800, brand, 'letter-spacing="1.4"')}
    ${text(122, 166, "Automatic cleaning", 18, 740)}
    <rect x="809" y="133" width="44" height="24" rx="12" fill="${brand}"/>
    <circle cx="841" cy="145" r="9" fill="#fff"/>
    ${text(122, 193, "Matching visits are removed as soon as Firefox records their URL or title.", 13, 400, muted)}
    ${roundedRect(122, 218, 351, 70, "#fff", line, 12)}
    ${checkbox(136, 233)}
    ${text(162, 247, "Clean when Firefox starts", 12, 700)}
    ${text(162, 267, "Catches visits missed while the add-on was inactive.", 11, 400, muted)}
    ${roundedRect(483, 218, 370, 70, "#fff", line, 12)}
    ${checkbox(497, 233)}
    ${text(523, 247, "Clean after saving keywords", 12, 700)}
    ${text(523, 267, "Applies new rules to the complete existing history.", 11, 400, muted)}`;
}

function rulesCard(y = 334, compact = false) {
  const height = compact ? 250 : 418;
  const textareaHeight = compact ? 78 : 164;
  const actions = compact
    ? ""
    : `${button(122, y + height - 62, 112, "Save rules")}
       ${button(245, y + height - 62, 142, "Preview matches", "secondary")}`;
  return `${roundedRect(100, y, 777, height, "#fff", line, 18, 'filter="url(#shadow)"')}
    ${text(122, y + 29, "RULES", 10, 800, brand, 'letter-spacing="1.4"')}
    ${text(122, y + 57, "Keyword list", 18, 740)}
    ${roundedRect(785, y + 25, 68, 26, "#eee9ff", "none", 13)}
    ${text(819, y + 43, "3 / 500", 11, 800, brand, 'text-anchor="middle"')}
    ${text(122, y + 84, "Enter one literal keyword per line. Regular expressions are intentionally not used.", 13, 400, muted)}
    ${text(122, y + 113, "Keywords", 12, 700)}
    ${roundedRect(122, y + 124, 731, textareaHeight, "#fbfaff", line, 10)}
    ${text(138, y + 150, "example.com", 13, 400)}
    ${text(138, y + 173, "private project", 13, 400)}
    ${text(138, y + 196, "/sensitive/", 13, 400)}
    ${text(122, y + 124 + textareaHeight + 29, "Match in:", 12, 700, muted)}
    ${checkbox(194, y + 124 + textareaHeight + 16)}
    ${text(217, y + 124 + textareaHeight + 29, "URLs", 12)}
    ${checkbox(274, y + 124 + textareaHeight + 16)}
    ${text(297, y + 124 + textareaHeight + 29, "Page titles", 12)}
    ${checkbox(389, y + 124 + textareaHeight + 16, false)}
    ${text(412, y + 124 + textareaHeight + 29, "Case-sensitive", 12)}
    ${actions}`;
}

function maintenanceCard(y = 379, withPreview = false) {
  const preview = withPreview
    ? `${roundedRect(122, y + 148, 731, 133, "#fff", line, 12)}
       <path d="M122 ${y + 160}a12 12 0 0 1 12-12h707a12 12 0 0 1 12 12v32H122z" fill="#eee9ff"/>
       ${text(139, y + 175, "11 matches in 1,240 history entries (showing up to 25).", 12, 750, brand)}
       ${text(139, y + 215, "Example Domain", 12, 700)}
       ${text(139, y + 237, "https://example.com/private-project", 11, 400, muted)}
       ${text(825, y + 237, 'matched “example.com”', 10, 600, brand, 'text-anchor="end"')}`
    : "";
  return `${roundedRect(100, y, 777, withPreview ? 310 : 232, "#fff", line, 18, 'filter="url(#shadow)"')}
    ${text(122, y + 29, "MAINTENANCE", 10, 800, brand, 'letter-spacing="1.4"')}
    ${text(122, y + 57, "Existing history", 18, 740)}
    ${roundedRect(122, y + 76, 731, 55, "#fff5dc", "none", 12)}
    ${text(138, y + 98, "Deletion cannot be undone", 12, 750)}
    ${text(138, y + 116, "Preview first if you are unsure about a rule.", 11, 400, muted)}
    ${withPreview ? preview : `${button(122, y + 151, 106, "Wipe now", "danger")}${button(239, y + 151, 125, "Export settings", "secondary")}${button(375, y + 151, 125, "Import settings", "secondary")}`}`;
}

const overview = shell(`${header()}${automationCard()}${rulesCard()}${statusCard()}`);
const preview = shell(`${header()}${rulesCard(109, true)}${maintenanceCard(379, true)}${statusCard(109, true)}`);
const wipeOverlay = `
  <rect width="1280" height="800" fill="#17131f" opacity=".58"/>
  ${roundedRect(425, 235, 430, 270, "#fff", line, 18, 'filter="url(#shadow)"')}
  ${text(457, 279, "Wipe matching history now?", 22, 760)}
  ${text(457, 319, "Every existing entry matching your current keywords will be", 13, 400, muted)}
  ${text(457, 341, "permanently deleted. Other history entries remain untouched.", 13, 400, muted)}
  ${roundedRect(457, 369, 366, 54, "#fff5dc", "none", 12)}
  ${text(475, 392, "Only matching entries are removed.", 12, 750, "#8b5b00")}
  ${text(475, 410, "This action cannot be undone.", 11, 400, muted)}
  ${button(551, 445, 100, "Cancel", "secondary")}
  ${button(663, 445, 160, "Wipe matching entries", "danger")}`;
const wipe = shell(`${header()}${automationCard()}${rulesCard()}${statusCard()}`, wipeOverlay);

await mkdir(outputDirectory, { recursive: true });
await Promise.all([
  writeFile(join(outputDirectory, "01-automatic-cleaning.svg"), overview),
  writeFile(join(outputDirectory, "02-preview-matches.svg"), preview),
  writeFile(join(outputDirectory, "03-wipe-confirmation.svg"), wipe)
]);

console.log(`Rendered AMO screenshot sources in ${outputDirectory}`);
