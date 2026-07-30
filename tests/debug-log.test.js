import assert from "node:assert/strict";
import test from "node:test";

import {
  createDebugLog,
  sanitizeDebugValue
} from "../src/lib/debug-log.js";
import { createStorageArea } from "./helpers/browser-mock.js";

test("debug values redact private fields, URLs, oversized data, and deep values", () => {
  const value = sanitizeDebugValue({
    enabled: true,
    count: 3,
    empty: null,
    message: "Failed at https://private.example/path",
    extension: "moz-extension://private-id/options/options.html",
    keyword: "secret phrase",
    nested: {
      first: {
        second: {
          third: {
            fourth: "too deep"
          }
        }
      }
    },
    list: Array.from({ length: 30 }, (_, index) => index),
    unknown: undefined
  });

  assert.equal(value.enabled, true);
  assert.equal(value.count, 3);
  assert.equal(value.empty, null);
  assert.equal(value.message, "Failed at [url]");
  assert.equal(value.extension, "[extension-url]");
  assert.equal(value.keyword, "[redacted]");
  assert.equal(value.nested.first.second.third, "[truncated]");
  assert.equal(value.list.length, 25);
  assert.equal(value.unknown, "undefined");
  assert.equal(sanitizeDebugValue("private", "settings"), "[redacted]");
});

test("debug log keeps a bounded, cloned, privacy-safe event history", async () => {
  const storage = createStorageArea({ debugLog: "invalid" });
  let timestamp = 0;
  const log = createDebugLog(storage, {
    isoNow: () => `2026-07-30T00:00:0${timestamp += 1}.000Z`,
    maxEntries: 2
  });

  await log.record("first", { title: "Private title" });
  await log.record("second", { error: "https://private.example" }, "warning");
  await log.record(3, { ok: true }, 4);

  const entries = await log.read();
  assert.equal(entries.length, 2);
  assert.equal(entries[0].event, "second");
  assert.equal(entries[0].level, "warning");
  assert.equal(entries[0].details.error, "[url]");
  assert.equal(entries[1].event, "3");
  assert.equal(entries[1].level, "4");

  entries[0].event = "mutated";
  assert.equal((await log.read())[0].event, "second");
});

test("debug logging never breaks the add-on when storage fails", async () => {
  const storage = {
    async get() {
      throw new Error("storage unavailable");
    },
    async set() {
      throw new Error("storage unavailable");
    }
  };
  const log = createDebugLog(storage);
  await log.record("ignored");
  assert.deepEqual(await log.read(), []);
});
