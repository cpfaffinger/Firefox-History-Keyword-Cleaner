import test from "node:test";
import assert from "node:assert/strict";

import {
  MAX_KEYWORD_LENGTH,
  normalizeKeywords,
  normalizeSettings,
  normalizeStats
} from "../src/lib/settings.js";

test("normalizeKeywords trims, normalizes, removes blanks and deduplicates", () => {
  assert.deepEqual(
    normalizeKeywords(["  Example  ", "", "example", "ＡＢＣ", "ABC"]),
    ["Example", "ABC"]
  );
});

test("normalizeKeywords preserves case-distinct entries in case-sensitive mode", () => {
  assert.deepEqual(normalizeKeywords(["Alpha", "alpha"], true), [
    "Alpha",
    "alpha"
  ]);
});

test("normalizeKeywords limits individual keyword length", () => {
  const [keyword] = normalizeKeywords(["x".repeat(MAX_KEYWORD_LENGTH + 20)]);
  assert.equal(keyword.length, MAX_KEYWORD_LENGTH);
});

test("normalizeSettings applies safe defaults and validates primitive types", () => {
  assert.deepEqual(normalizeSettings({ keywords: "not-an-array" }), {
    enabled: true,
    keywords: [],
    matchUrl: true,
    matchTitle: true,
    caseSensitive: false,
    cleanOnStartup: true,
    cleanExistingOnChange: true
  });

  assert.deepEqual(
    normalizeSettings({
      enabled: false,
      keywords: ["secret"],
      matchUrl: false,
      matchTitle: false,
      caseSensitive: true,
      cleanOnStartup: false,
      cleanExistingOnChange: false
    }),
    {
      enabled: false,
      keywords: ["secret"],
      matchUrl: false,
      matchTitle: false,
      caseSensitive: true,
      cleanOnStartup: false,
      cleanExistingOnChange: false
    }
  );
});

test("normalizeStats discards invalid persisted values", () => {
  assert.deepEqual(
    normalizeStats({
      lastRunAt: 42,
      lastChecked: -2,
      lastDeleted: 1.5,
      totalDeleted: 7,
      lastError: { message: "nope" }
    }),
    {
      lastRunAt: null,
      lastRunReason: null,
      lastChecked: 0,
      lastDeleted: 0,
      totalDeleted: 7,
      lastError: null
    }
  );
});
