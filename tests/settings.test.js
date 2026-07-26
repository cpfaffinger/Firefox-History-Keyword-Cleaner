import test from "node:test";
import assert from "node:assert/strict";

import {
  MAX_KEYWORDS,
  MAX_KEYWORD_LENGTH,
  loadSettings,
  loadStats,
  normalizeKeyword,
  normalizeKeywords,
  normalizeSettings,
  normalizeStats,
  validateSettings,
  saveSettings,
  saveStats
} from "../src/lib/settings.js";

test("normalizeKeyword rejects non-string values", () => {
  assert.equal(normalizeKeyword(null), "");
  assert.equal(normalizeKeyword(42), "");
});

test("normalizeKeywords trims, normalizes, removes blanks and deduplicates", () => {
  assert.deepEqual(
    normalizeKeywords(["  Example  ", "", "example", "ＡＢＣ", "ABC"]),
    ["Example", "ABC"]
  );

  assert.equal(
    validateSettings({
      keywords: Array.from({ length: MAX_KEYWORDS + 1 }, (_, index) => `key-${index}`)
    }).errors[0].code,
    "tooManyKeywords"
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

test("normalizeKeywords enforces the maximum list size", () => {
  const values = Array.from(
    { length: MAX_KEYWORDS + 25 },
    (_, index) => `keyword-${index}`
  );
  const keywords = normalizeKeywords(values);

  assert.equal(keywords.length, MAX_KEYWORDS);
  assert.equal(keywords.at(-1), `keyword-${MAX_KEYWORDS - 1}`);
});

test("normalizeSettings applies safe defaults and validates primitive types", () => {
  assert.deepEqual(normalizeSettings({ keywords: "not-an-array" }), {
    enabled: true,
    keywords: [],
    exceptions: [],
    matchUrl: true,
    matchTitle: true,
    caseSensitive: false,
    matchMode: "contains",
    urlScope: "any",
    cleanOnStartup: false
  });

  assert.deepEqual(
    normalizeSettings({
      enabled: false,
      keywords: ["secret"],
      exceptions: ["safe"],
      matchUrl: false,
      matchTitle: false,
      caseSensitive: true,
      matchMode: "word",
      urlScope: "domain",
      cleanOnStartup: false,
    }),
    {
      enabled: false,
      keywords: ["secret"],
      exceptions: ["safe"],
      matchUrl: false,
      matchTitle: false,
      caseSensitive: true,
      matchMode: "word",
      urlScope: "domain",
      cleanOnStartup: false
    }
  );
});

test("validateSettings reports destructive-input limits without silent truncation", () => {
  assert.deepEqual(validateSettings({
    keywords: ["x"],
    matchUrl: false,
    matchTitle: false
  }).errors, [
    { code: "matchFieldRequired" },
    { code: "keywordTooShort", args: ["2"] }
  ]);

  const overlong = "x".repeat(MAX_KEYWORD_LENGTH + 1);
  assert.deepEqual(validateSettings({ keywords: [overlong] }).errors, [
    { code: "keywordTooLong", args: [String(MAX_KEYWORD_LENGTH)] }
  ]);
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

test("settings and stats storage helpers normalize round trips", async () => {
  const values = {};
  const storageArea = {
    async get(key) {
      return { [key]: values[key] };
    },
    async set(update) {
      Object.assign(values, update);
    }
  };

  const settings = await saveSettings(storageArea, {
    enabled: false,
    keywords: ["  Secret  "],
    exceptions: [],
    matchUrl: true,
    matchTitle: false,
    caseSensitive: true,
    matchMode: "contains",
    urlScope: "any",
    cleanOnStartup: false,
  });
  assert.deepEqual(await loadSettings(storageArea), settings);

  const stats = await saveStats(storageArea, {
    lastRunAt: "2026-07-26T14:00:00.000Z",
    lastRunReason: "manual",
    lastChecked: 12,
    lastDeleted: 3,
    totalDeleted: 42,
    lastError: "none"
  });
  assert.deepEqual(await loadStats(storageArea), stats);
});
