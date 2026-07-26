import test from "node:test";
import assert from "node:assert/strict";

import { collectMatches, findMatchingKeyword } from "../src/lib/rules.js";

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
