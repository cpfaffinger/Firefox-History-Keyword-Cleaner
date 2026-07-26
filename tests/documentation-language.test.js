import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import test from "node:test";

const projectRoot = resolve(import.meta.dirname, "..");
const excludedDirectories = new Set([
  ".git",
  ".pnpm-store",
  "artifacts",
  "node_modules",
  "web-ext-artifacts",
  "web-ext-profile"
]);
const commonGermanWords = [
  "aber",
  "bereits",
  "beim",
  "benutzer",
  "beschreibung",
  "chronik",
  "das",
  "datenschutz",
  "der",
  "deutsch",
  "die",
  "einreichen",
  "eintrag",
  "einstellungen",
  "englisch",
  "erfüllt",
  "fehler",
  "funktionen",
  "gültig",
  "keine",
  "muss",
  "nicht",
  "niederländisch",
  "oder",
  "prüfen",
  "seite",
  "sicherheit",
  "türkisch",
  "und",
  "veröffentlichung",
  "werden",
  "wird",
  "zwischen"
];
const commonGermanWordPattern = new RegExp(
  `\\b(?:${commonGermanWords.join("|")})\\b`,
  "giu"
);

async function findMarkdownFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!excludedDirectories.has(entry.name)) {
        files.push(...(await findMarkdownFiles(join(directory, entry.name))));
      }
    } else if (entry.name.endsWith(".md")) {
      files.push(join(directory, entry.name));
    }
  }
  return files;
}

test("all Markdown documentation is written exclusively in English", async () => {
  const violations = [];
  for (const file of await findMarkdownFiles(projectRoot)) {
    const content = await readFile(file, "utf8");
    const germanCharacters = [...new Set(content.match(/[äöüß]/giu) ?? [])];
    const germanWords = [
      ...new Set(content.match(commonGermanWordPattern) ?? [])
    ];
    if (germanCharacters.length > 0 || germanWords.length > 0) {
      violations.push({
        file: relative(projectRoot, file),
        germanCharacters,
        germanWords
      });
    }
  }

  assert.deepEqual(violations, []);
});
