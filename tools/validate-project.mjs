import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const sourceRoot = join(projectRoot, "src");
const errors = [];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(path)));
    } else {
      files.push(path);
    }
  }
  return files;
}

const files = await walk(sourceRoot);
const manifest = JSON.parse(
  await readFile(join(sourceRoot, "manifest.json"), "utf8")
);

const allowedPermissions = new Set(["history", "storage"]);
for (const permission of manifest.permissions ?? []) {
  if (!allowedPermissions.has(permission)) {
    errors.push(`Unexpected manifest permission: ${permission}`);
  }
}

if (manifest.host_permissions) {
  errors.push("The add-on must not request host permissions.");
}

if (
  manifest.browser_specific_settings?.gecko?.data_collection_permissions
    ?.required?.[0] !== "none"
) {
  errors.push("Manifest must declare required data collection as none.");
}

const referencedFiles = [
  ...(manifest.background?.scripts ?? []),
  manifest.action?.default_popup,
  manifest.options_ui?.page,
  ...Object.values(manifest.icons ?? {})
].filter(Boolean);

for (const referencedFile of new Set(referencedFiles)) {
  try {
    const info = await stat(join(sourceRoot, referencedFile));
    if (!info.isFile()) {
      errors.push(`Manifest reference is not a file: ${referencedFile}`);
    }
  } catch {
    errors.push(`Missing manifest reference: ${referencedFile}`);
  }
}

for (const file of files) {
  const extension = extname(file);
  if (![".js", ".html", ".json"].includes(extension)) {
    continue;
  }

  const content = await readFile(file, "utf8");
  const displayPath = relative(projectRoot, file);

  if (extension === ".html" && /<script(?![^>]*\bsrc=)[^>]*>/iu.test(content)) {
    errors.push(`Inline script found in ${displayPath}`);
  }

  if (
    [".js", ".html"].includes(extension) &&
    /https?:\/\/(?!www\.w3\.org\/2000\/svg)/iu.test(content)
  ) {
    errors.push(`Remote URL found in executable source: ${displayPath}`);
  }

  if (/\beval\s*\(|\bnew\s+Function\s*\(/u.test(content)) {
    errors.push(`Dynamic code execution found in ${displayPath}`);
  }

  if (
    extension === ".js" &&
    /\b(?:alert|confirm|prompt)\s*\(/u.test(content)
  ) {
    errors.push(`Blocking browser dialog found in ${displayPath}`);
  }
}

for (const locale of ["en", "de", "fr", "it", "nl", "tr"]) {
  const localePath = join(sourceRoot, "_locales", locale, "messages.json");
  JSON.parse(await readFile(localePath, "utf8"));
}

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`ERROR: ${error}`);
  }
  process.exitCode = 1;
} else {
  console.log(`Project validation passed (${files.length} packaged files checked).`);
}
