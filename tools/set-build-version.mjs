import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const argumentsList = process.argv.slice(2);
const runNumberIndex = argumentsList.indexOf("--run-number");
const versionIndex = argumentsList.indexOf("--version");
const dryRun = argumentsList.includes("--dry-run");
const rawRunNumber = argumentsList[runNumberIndex + 1];
const rawVersion = argumentsList[versionIndex + 1];

if ((runNumberIndex === -1) === (versionIndex === -1)) {
  throw new Error(
    "Usage: node tools/set-build-version.mjs (--run-number <1-999999999> | --version <x.y.z>) [--dry-run]"
  );
}

if (
  runNumberIndex !== -1 &&
  !/^[1-9][0-9]{0,8}$/u.test(rawRunNumber ?? "")
) {
  throw new Error("Run number must be between 1 and 999999999.");
}

const packagePath = join(projectRoot, "package.json");
const manifestPath = join(projectRoot, "src", "manifest.json");
const packageMetadata = JSON.parse(await readFile(packagePath, "utf8"));
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const [major, minor] = packageMetadata.version.split(".");
const buildVersion =
  runNumberIndex === -1 ? rawVersion : `${major}.${minor}.${rawRunNumber}`;

if (
  !/^(0|[1-9][0-9]{0,8})(\.(0|[1-9][0-9]{0,8})){2}$/u.test(
    buildVersion ?? ""
  )
) {
  throw new Error(`Invalid AMO version: ${buildVersion ?? ""}`);
}

if (!dryRun) {
  packageMetadata.version = buildVersion;
  manifest.version = buildVersion;
  await Promise.all([
    writeFile(packagePath, `${JSON.stringify(packageMetadata, null, 2)}\n`),
    writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  ]);
}

process.stdout.write(`${buildVersion}\n`);
