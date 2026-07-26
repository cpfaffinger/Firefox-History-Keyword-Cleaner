import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const manifest = JSON.parse(
  await readFile(new URL("../src/manifest.json", import.meta.url), "utf8")
);
const packageMetadata = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8")
);

test("manifest requests only permissions required by the primary feature", () => {
  assert.deepEqual(manifest.permissions.sort(), ["history", "storage"]);
  assert.equal(manifest.host_permissions, undefined);
  assert.equal(manifest.content_scripts, undefined);
});

test("manifest declares no external data collection and supports current consent UI", () => {
  const gecko = manifest.browser_specific_settings.gecko;
  assert.equal(gecko.strict_min_version, "140.0");
  assert.deepEqual(gecko.data_collection_permissions.required, ["none"]);
});

test("manifest uses the production AMO identity and synchronized version", () => {
  const gecko = manifest.browser_specific_settings.gecko;
  assert.equal(
    gecko.id,
    "history-keyword-cleaner@cpfaffinger.github.io"
  );
  assert.equal(manifest.version, packageMetadata.version);
});

test("manifest uses Firefox-compatible Manifest V3 background scripts", () => {
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.background.scripts, ["background.js"]);
  assert.equal(manifest.background.type, "module");
  assert.equal(manifest.background.service_worker, undefined);
});
