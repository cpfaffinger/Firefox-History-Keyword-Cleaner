import assert from "node:assert/strict";
import test from "node:test";

import { initializeOptions } from "../src/options/options.js";
import {
  clearUiGlobals,
  createDom,
  createUiBrowser,
  flushUi,
  installUiGlobals
} from "./helpers/ui.js";

const settings = {
  enabled: true,
  keywords: ["private"],
  exceptions: [],
  matchUrl: true,
  matchTitle: true,
  caseSensitive: false,
  matchMode: "contains",
  urlScope: "any",
  cleanOnStartup: false
};

function initialState() {
  return {
    settings: structuredClone(settings),
    stats: {
      lastRunAt: null,
      lastDeleted: 0,
      totalDeleted: 0,
      lastError: null
    },
    version: "1.2.3",
    operation: null
  };
}

test("options page saves safely, previews, confirms wipe, preserves drafts, and cancels work", async () => {
  const dom = await createDom("options/options.html");
  const state = initialState();
  const calls = [];
  let previewMatches = 1;
  const mock = createUiBrowser(async (request) => {
    calls.push(request);
    if (request.action === "get-state") {
      return { ok: true, value: structuredClone(state) };
    }
    if (request.action === "save-settings") {
      state.settings = structuredClone(request.settings);
      return { ok: true, value: { settings: state.settings } };
    }
    if (request.action === "preview") {
      return {
        ok: true,
        value: {
          checked: 4,
          matched: previewMatches,
          samples: previewMatches
            ? [{
                url: "https://example.test/private",
                title: "Private",
                keyword: "private"
              }]
            : [],
          risk: { level: previewMatches > 1 ? "high" : "medium" },
          previewId: "preview-1"
        }
      };
    }
    if (request.action === "clean-now") {
      state.stats.lastRunAt = "2026-07-26T10:00:00.000Z";
      state.stats.lastDeleted = 1;
      state.stats.totalDeleted += 1;
      return {
        ok: true,
        value: { checked: 4, matched: 1, deleted: 1, failures: [] }
      };
    }
    return { ok: true, value: { cancelled: true } };
  });
  installUiGlobals(dom, mock.browserApi);
  const root = dom.window.document;
  const app = initializeOptions(root, mock.browserApi);
  await flushUi();
  assert.equal(root.querySelector("#version").textContent, "1.2.3");

  root.querySelector("#keywords").value = "specific phrase";
  root.querySelector("#keywords").dispatchEvent(new dom.window.Event("input"));
  root.querySelector("#save").click();
  await flushUi();
  assert.equal(state.settings.keywords[0], "specific phrase");
  assert.equal(state.stats.totalDeleted, 0);

  root.querySelector("#preview").click();
  await flushUi();
  assert.match(root.querySelector("#preview-results").textContent, /1 matches/u);

  root.querySelector("#keywords").value = "private draft";
  root.querySelector("#clean-now").click();
  await flushUi();
  root.querySelector("#wipe-cancel").click();
  await flushUi();
  assert.equal(state.stats.totalDeleted, 0);

  root.querySelector("#clean-now").click();
  await flushUi();
  root.querySelector("#wipe-confirm").click();
  await flushUi();
  assert.equal(state.stats.totalDeleted, 1);
  assert.equal(root.querySelector("#keywords").value, "private draft");
  assert.equal(
    calls.find(({ action }) => action === "clean-now").confirmedPreviewId,
    "preview-1"
  );

  previewMatches = 0;
  root.querySelector("#clean-now").click();
  await flushUi();
  assert.match(root.querySelector("#status").textContent, /No matching/u);

  root.querySelector("#cancel-operation").click();
  await flushUi();
  assert.ok(calls.some(({ action }) => action === "cancel-operation"));

  mock.messageListeners[0]({
    target: "history-keyword-cleaner-ui",
    event: "operation-progress",
    operation: {
      status: "running",
      phase: "scanning",
      checked: 1,
      total: null
    }
  });
  assert.equal(root.querySelector("#operation-panel").hidden, false);
  assert.equal(app.readSettings().keywords[0], "private draft");
  clearUiGlobals();
});

test("options page confirms broad rules and validates imports and errors", async () => {
  const dom = await createDom("options/options.html");
  const state = initialState();
  const mock = createUiBrowser(async (request) => {
    if (request.action === "get-state") {
      return { ok: true, value: structuredClone(state) };
    }
    if (request.action === "save-settings") {
      state.settings = structuredClone(request.settings);
      return { ok: true, value: { settings: state.settings } };
    }
    return {
      ok: false,
      error: { code: "operationBusy", args: [] }
    };
  });
  installUiGlobals(dom, mock.browserApi);
  const root = dom.window.document;
  initializeOptions(root, mock.browserApi);
  await flushUi();

  root.querySelector("#keywords").value = "com";
  root.querySelector("#save").click();
  await flushUi();
  root.querySelector("#rule-cancel").click();
  await flushUi();
  assert.deepEqual(state.settings.keywords, ["private"]);

  root.querySelector("#save").click();
  await flushUi();
  root.querySelector("#rule-confirm").click();
  await flushUi();
  assert.deepEqual(state.settings.keywords, ["com"]);

  const importInput = root.querySelector("#import-file");
  Object.defineProperty(importInput, "files", {
    configurable: true,
    value: [{
      size: 100,
      async text() {
        return JSON.stringify({ settings });
      }
    }]
  });
  importInput.dispatchEvent(new dom.window.Event("change"));
  await flushUi();
  assert.deepEqual(state.settings.keywords, ["private"]);

  Object.defineProperty(importInput, "files", {
    configurable: true,
    value: [{
      size: 100,
      async text() {
        return "{";
      }
    }]
  });
  importInput.dispatchEvent(new dom.window.Event("change"));
  await flushUi();
  assert.match(root.querySelector("#status").textContent, /valid JSON/u);

  Object.defineProperty(importInput, "files", {
    configurable: true,
    value: [{ size: 1_000_001, text: async () => "{}" }]
  });
  importInput.dispatchEvent(new dom.window.Event("change"));
  await flushUi();
  assert.match(root.querySelector("#status").textContent, /larger than 1 MB/u);

  root.querySelector("#preview").click();
  await flushUi();
  assert.match(root.querySelector("#status").textContent, /already running/u);

  root.querySelector("#clean-now").click();
  await flushUi();
  assert.match(root.querySelector("#status").textContent, /already running/u);

  root.querySelector("#keywords").value = "specific export";
  root.querySelector("#export").click();
  await flushUi();
  assert.match(root.querySelector("#status").textContent, /exported/u);

  root.querySelector("#keywords").value = "x";
  root.querySelector("#save").click();
  await flushUi();
  assert.match(root.querySelector("#status").textContent, /at least 2/u);
  root.querySelector("#export").click();
  assert.match(root.querySelector("#status").textContent, /at least 2/u);

  Object.defineProperty(importInput, "files", {
    configurable: true,
    value: []
  });
  importInput.dispatchEvent(new dom.window.Event("change"));
  await flushUi();

  Object.defineProperty(importInput, "files", {
    configurable: true,
    value: [{
      size: 100,
      async text() {
        return JSON.stringify({
          settings: { ...settings, keywords: ["com"] }
        });
      }
    }]
  });
  importInput.dispatchEvent(new dom.window.Event("change"));
  await flushUi();
  root.querySelector("#rule-cancel").click();
  await flushUi();
  assert.match(root.querySelector("#status").textContent, /cancelled/u);
  clearUiGlobals();
});

test("options page renders persisted errors and exposes validation helpers", async () => {
  const dom = await createDom("options/options.html");
  const state = initialState();
  state.stats.lastError = { code: "deletionFailures", args: ["2"] };
  const mock = createUiBrowser(async () => ({
    ok: true,
    value: structuredClone(state)
  }));
  installUiGlobals(dom, mock.browserApi);
  const app = initializeOptions(dom.window.document, mock.browserApi);
  await flushUi();
  assert.match(dom.window.document.querySelector("#status").textContent, /2 URL/u);
  assert.throws(
    () => app.validatedSettings({ ...settings, keywords: ["x"] }),
    /at least 2/u
  );
  clearUiGlobals();
});

test("options module bootstraps itself in a browser document", async () => {
  const dom = await createDom("options/options.html");
  const state = initialState();
  const mock = createUiBrowser(async () => ({
    ok: true,
    value: structuredClone(state)
  }));
  installUiGlobals(dom, mock.browserApi);
  await import(`../src/options/options-entry.js?bootstrap=${Date.now()}`);
  await flushUi();
  assert.equal(dom.window.document.querySelector("#version").textContent, "1.2.3");
  clearUiGlobals();
});
