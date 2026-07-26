import test from "node:test";
import assert from "node:assert/strict";

import {
  analyzeRuleRisk,
  collectMatches,
  compileRules,
  findMatchingKeyword
} from "../src/lib/rules.js";

const baseSettings = {
  enabled: true,
  keywords: ["secret"],
  matchUrl: true,
  matchTitle: true,
  caseSensitive: false
};

test("matches literal keywords in URLs case-insensitively", () => {
  assert.equal(
    findMatchingKeyword(
      { url: "https://example.test/SECRET/document", title: "" },
      baseSettings
    ),
    "secret"
  );
});

test("matches URL-encoded text after decoding", () => {
  assert.equal(
    findMatchingKeyword(
      { url: "https://example.test/a%20secret%20file", title: "" },
      baseSettings
    ),
    "secret"
  );
});

test("falls back to the literal URL when percent encoding is malformed", () => {
  assert.equal(
    findMatchingKeyword(
      { url: "https://example.test/%E0%A4%A-secret", title: "" },
      baseSettings
    ),
    "secret"
  );
});

test("matches page titles when URL matching is disabled", () => {
  assert.equal(
    findMatchingKeyword(
      { url: "https://example.test", title: "Secret planning notes" },
      { ...baseSettings, matchUrl: false }
    ),
    "secret"
  );
});

test("honors case sensitivity and disabled state", () => {
  assert.equal(
    findMatchingKeyword(
      { url: "https://example.test/SECRET", title: "" },
      { ...baseSettings, caseSensitive: true }
    ),
    null
  );
  assert.equal(
    findMatchingKeyword(
      { url: "https://example.test/secret", title: "" },
      { ...baseSettings, enabled: false }
    ),
    null
  );
});

test("returns no match with an empty list or disabled match fields", () => {
  assert.equal(
    findMatchingKeyword(
      { url: "https://secret.test", title: "secret" },
      { ...baseSettings, keywords: [] }
    ),
    null
  );
  assert.equal(
    findMatchingKeyword(
      { url: "https://secret.test", title: "secret" },
      { ...baseSettings, matchUrl: false, matchTitle: false }
    ),
    null
  );
});

test("collectMatches includes the responsible keyword", () => {
  assert.deepEqual(
    collectMatches(
      [
        { url: "https://safe.test", title: "Safe" },
        { url: "https://secret.test", title: "Private" }
      ],
      baseSettings
    ),
    [
      {
        item: { url: "https://secret.test", title: "Private" },
        keyword: "secret"
      }
    ]
  );
});

test("supports domain, path, whole-word, exact, exception, and compiled rules", () => {
  const domainSettings = {
    ...baseSettings,
    keywords: ["example.test"],
    exceptions: [],
    matchTitle: false,
    matchMode: "exact",
    urlScope: "domain"
  };
  assert.equal(
    findMatchingKeyword(
      { url: "https://example.test/other", title: "" },
      compileRules(domainSettings)
    ),
    "example.test"
  );
  assert.equal(
    findMatchingKeyword(
      { url: "not a valid URL with example.test", title: "" },
      domainSettings
    ),
    null
  );

  assert.equal(
    findMatchingKeyword(
      { url: "https://safe.test/folder/private%20file?q=1", title: "" },
      {
        ...baseSettings,
        keywords: ["private file"],
        exceptions: [],
        matchTitle: false,
        matchMode: "contains",
        urlScope: "path"
      }
    ),
    "private file"
  );

  assert.equal(
    findMatchingKeyword(
      { url: "https://safe.test", title: "A secret. plan" },
      {
        ...baseSettings,
        keywords: ["secret."],
        exceptions: [],
        matchMode: "word"
      }
    ),
    "secret."
  );
  assert.equal(
    findMatchingKeyword(
      { url: "https://safe.test/secret", title: "" },
      {
        ...baseSettings,
        exceptions: ["safe.test"],
        matchMode: "contains"
      }
    ),
    null
  );
});

test("risk analysis reports broad, ratio-based, medium, and low risk", () => {
  assert.equal(
    analyzeRuleRisk({ ...baseSettings, keywords: ["com"] }).level,
    "high"
  );
  assert.deepEqual(
    analyzeRuleRisk(
      { ...baseSettings, keywords: ["specific phrase"] },
      { checked: 10, matched: 5 }
    ).reasons,
    [{ code: "highMatchRatio", ratio: 0.5 }]
  );
  assert.equal(
    analyzeRuleRisk(
      { ...baseSettings, keywords: ["specific phrase"] },
      { checked: 10, matched: 2 }
    ).level,
    "medium"
  );
  assert.equal(
    analyzeRuleRisk(
      { ...baseSettings, keywords: ["specific phrase"] },
      { checked: 10, matched: 1 }
    ).level,
    "low"
  );
});
