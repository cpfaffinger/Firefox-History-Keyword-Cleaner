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
  assert.equal(gecko.id, "history-keyword-cleaner@local.addons");
  assert.equal(manifest.version, packageMetadata.version);
});

test("manifest publishes the packaged icon for browser#]7÷½­¢G§²ÚîÆ­yØt x="122" y="363" font-size="10" font-weight="800" fill="#6547d9" letter-spacing="1.4">RULES</text>
    <text x="122" y="391" font-size="18" font-weight="740" fill="#201f2a" >Keyword list</text>
    <rect x="785" y="359" width="68" height="26" rx="13" fill="#eee9ff" stroke="none" />
    <text x="819" y="377" font-size="11" font-weight="800" fill="#6547d9" text-anchor="middle">3 / 500</text>
    <text x="122" y="418" font-size="13" font-weight="400" fill="#676475" >Enter one literal keyword per line. Regular expressions are intentionally not used.</text>
    <text x="122" y="447" font-size="12" font-weight="700" fill="#201f2a" >Keywords</text>
    <rect x="122" y="458" width="731" height="164" rx="10" fill="#fbfaff" stroke="#ded9ea" />
    <text x="138" y="484" font-size="13" font-weight="400" fill="#201f2a" >example.com</text>
    <text x="138" y="507" font-size="13" font-weight="400" fill="#201f2a" >private project</text>
    <text x="138" y="530" font-size="13" font-weight="400" fill="#201f2a" >/sensitive/</text>
    <text x="122" y="651" font-size="12" font-weight="700" fill="#676475" >Match in:</text>
    <rect x="194" y="638" width="16" height="16" rx="4" fill="#6547d9" stroke="#6547d9" /><path d="M198 646l3 3 6-7" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="217" y="651" font-size="12" font-weight="400" fill="#201f2a" >URLs</text>
    <rect x="274" y="638" width="16" height="16" rx="4" fill="#6547d9" stroke="#6547d9" /><path d="M278 646l3 3 6-7" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="297" y="651" font-size="12" font-weight="400" fill="#201f2a" >Page titles</text>
    <rect x="389" y="638" width="16" height="16" rx="4" fill="#fff" stroke="#ded9ea" />
    <text x="412" y="651" font-size="12" font-weight="400" fill="#201f2a" >Case-sensitive</text>
    <rect x="122" y="690" width="112" height="40" rx="11" fill="#6547d9" stroke="#6547d9" /><text x="178" y="715" font-size="13" font-weight="700" fill="#fff" text-anchor="middle">Save rules</text>
       <rect x="245" y="690" width="142" height="40" rx="11" fill="#fff" stroke="#ded9ea" /><text x="316" y="715" font-size="13" font-weight="700" fill="#201f2a" text-anchor="middle">Preview matches</text><rect x="897" y="109" width="283" height="313" rx="18" fill="#fff" stroke="#ded9ea" filter="url(#shadow)"/>
    <text x="919" y="139" font-size="10" font-weight="800" fill="#6547d9" letter-spacing="1.4">STATUS</text>
    <text x="919" y="165" font-size="18" font-weight="740" fill="#201f2a" >Cleaning activity</text>
    
    <text x="919" y="205" font-size="11" font-weight="400" fill="#676475" >Last run</text>
    <text x="1158" y="205" font-size="13" font-weight="700" fill="#201f2a" text-anchor="end">just now</text>
    <line x1="919" y1="218" x2="1158" y2="218" stroke="#ded9ea"/>
    <text x="919" y="252" font-size="11" font-weight="400" fill="#676475" >Last deleted</text>
    <text x="1158" y="252" font-size="13" font-weight="700" fill="#201f2a" text-anchor="end">4</text>
    <line x1="919" y1="265" x2="1158" y2="265" stroke="#ded9ea"/>
    <text x="919" y="299" font-size="11" font-weight="400" fill="#676475" >Total deleted</text>
    <text x="1158" y="299" font-size="13" font-weight="700" fill="#201f2a" text-anchor="end">137</text>
    <text x="1158" y="399" font-size="10" font-weight="400" fill="#676475" text-anchor="end">v0.1.1</text>
      
  <rect width="1280" height="800" fill="#17131f" opacity=".58"/>
  <rect x="425" y="235" width="430" height="270" rx="18" fill="#fff" stroke="#ded9ea" filter="url(#shadow)"/>
  <text x="457" y="279" font-size="22" font-weight="760" fill="#201f2a" >Wipe matching history now?</text>
  <text x="457" y="319" font-size="13" font-weight="400" fill="#676475" >Every existing entry matching your current keywords will be</text>
  <text x="457" y="341" font-size="13" font-weight="400" fill="#676475" >permanently deleted. Other history entries remain untouched.</text>
  <rect x="457" y="369" width="366" height="54" rx="12" fill="#fff5dc" stroke="none" />
  <text x="475" y="392" font-size="12" font-weight="750" fill="#8b5b00" >Only matching entries are removed.</text>
  <text x="475" y="410" font-size="11" font-weight="400" fill="#676475" >This action cannot be undone.</text>
  <rect x="551" y="445" width="100" height="40" rx="11" fill="#fff" stroke="#ded9ea" /><text x="601" y="470" font-size="13" font-weight="700" fill="#201f2a" text-anchor="middle">Cancel</text>
  <rect x="663" y="445" width="160" height="40" rx="11" fill="#be3b51" stroke="#be3b51" /><text x="743" y="470" font-size="13" font-weight="700" fill="#fff" text-anchor="middle">Wipe matching entries</text>
    </g>
  </svg>