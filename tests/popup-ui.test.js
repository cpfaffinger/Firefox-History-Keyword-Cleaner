import assert from "node:assert/strict";
import test from "node:test";

import { initializePopup } from "../src/popup/popup.js";
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

test("popup safely saves, confirms broad additions, previews wipes, and opens settings", async () => {
  const dom = await createDom("popup/popup.html");
  const state = {
    settings: structuredClone(settings),
    stats: {
      lastRunAt: null,
      lastDeleted: 0,
      totalDeleted: 0,
      lastError: null
    },
    version: "1.0.0",
    operation: null
  };
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
          checked: 2,
          matched: previewMatches,
          samples: [],
          risk: { level: previewMatches ? "high" : "low" },
          previewId: "popup-preview"
        }
      };
    }
    if (request.action === "clean-now") {
      state.stats.totalDeleted += 1;
      return { ok: true, value: { checked: 2, deleted: 1 } };
    }
    return { ok: true, value: { cancelled: true } };
  });
  installUiGlobals(dom, mock.browserApi);
  const root = dom.window.document;
  initializePopup(root, mock.browserApi);
  await flushUi();

  const enabled = root.querySelector("#enabled");
  enabled.checked = false;
  enabled.dispatchEvent(new dom.window.Event("change"));
  await flushUi();
  assert.equal(state.settings.enabled, false);

  const input = root.querySelector("#keyword");
  input.value = "com";
  root.querySelector("#add-form").dispatchEvent(
    new dom.window.Event("submit", { bubbles: true, cancelable: true })
  );
  await flushUi();
  root.querySelector("#rule-cancel").click();
  await flushUi();
  assert.equal(state.settings.keywords.includes("com"), false);

  root.querySelector("#add-form").dispatchEvent(
    new dom.window.Event("submit", { bubbles: true, cancelable: true })
  );
  await flushUi();
  root.querySelector("#rule-confirm").click();
  await flushUi();
  assert.equal(state.settings.keywords.includes("com"), true);

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

  previewMatches = 0;
  root.querySelector("#clean-now").click();
  await flushUi();
  assert.match(root.querySelector("#status").textContent, /No matching/u);

  root.querySelector("#cancel-operation").click();
  await flushUi();
  mock.messageListeners[0]({
    target: "history-keyword-cleaner-ui",
    event: "operation-progress",
    operation: {
      status: "complete",
      type: "wipe",
      phase: "complete",
      checked: 2,
      deleted: 1
    }
  });
  assert.equal(root.querySelector("#operation-panel").hidden, false);
  root.querySelector("#open-options").click();
  await flushUi();
  assert.equal(mock.optionsOpened(), 1);
  assert.ok(calls.some(({ action }) => action === "cancel-operation"));
  clearUiGlobals();
});

test("popup restores controls and reports structured failures", async () => {
  const dom = await createDom("popup/popup.html");
  const state = {
    settings: structuredClone(settings),
    stats: {
      lastRunAt: "2026-07-26T10:00:00.000Z",
      lastDeleted: 2,
      totalDeleted: 2,
      lastError: null
    },
    version: "1.0.0",
    operation: null
  };
  const mock = createUiBrowser(async (request) =>
    request.action === "get-state"
      ? { ok: true, value: state }
      : { ok: false, error: { code: "operationBusy", args: [] } }
  );
  installUiGlobals(dom, mock.browserApi);
  const root = dom.window.document;
  const app = initializePopup(root, mock.browserApi);
  await flushUi();
  assert.match(root.querySelector("#status").textContent, /2 deleted/u);
  state.stats.lastError = { code: "deletionFailures", args: ["1"] };
  app.render();
  assert.match(root.querySelector("#status").textContent, /could not be deleted/u);
  assert.throws(
    () => app.validatedSettings({ ...settings, keywords: ["x"] }),
    /at least 2/u
  );

  root.querySelector("#keyword").value = "";
  root.querySelector("#add-form").dispatchEvent(
    new dom.window.Event("submit", { cancelable: true })
  );
  await flushUi();

  const enabled = root.querySelector("#enabled");
  enabled.checked = false;
  enabled.dispatchEvent(new dom.window.Event("change"));
  await flushUi();
  assert.equal(enabled.checked, true);

  root.querySelector("#keyword").value = "specific";
  root.querySelector("#add-form").dispatchEvent(
    new dom.window.Event("submit", { cancelable: true })
  );
  await flushUi();
  assert.match(root.querySelector("#status").textContent, /already running/u);

  root.querySelector("#clean-now").click();
  await flushUi();
  assert.match(root.querySelector("#status").textContent, /already running/u);
  clearUiGlobals();
});

test("popup loads and saves rules when Firefox Android omits the history API", async () => {
  const dom = await createDom("popup/popup.html");
  const state = {
    settings: structuredClone(settings),
    stats: {
      lastRunAt: null,
      lastDeleted: 0,
      totalDeleted: 0,
      lastError: null
    },
    version: "0.3.0",
    operation: null,
    capabilities: {
      history: false,
      historyRead: false,
      historyDelete: false,
      realtime: false
    }
  };
  const mock = createUiBrowser(async (request) => {
    if (request.action === "get-state") {
      return { ok: true, value: structuredClone(state) };
    }
    if (request.action === "save-settings") {
      state.settings = structuredClone(request.settings);
      return { ok: true, value: { settings: state.settings } };
    }
    throw new Error(`Unexpected action: ${request.action}`);
  });
  installUiGlobals(dom, mock.browserApi);
  const root = dom.window.document;
  initializePopup(root, mock.browserApi);
  await flushUi();

  assert.match(root.querySelector("#summary").textContent, /1 keyword/u);
  assert.equal(root.querySelector("#history-unavailable").hidden, false);
  assert.equal(root.querySelector("#enabled").disabled, true);
  assert.equal(root.querySelector("#clean-now").disabled, true);
  assert.equal(root.querySelector("#keyword").disabled, false);
  assert.match(root.querySelector("#status").textContent, /does not allow/iu);

  root.querySelector("#keyword").value = "mobile rule";
  root.querySelector("#add-form").dispatchEvent(
    new dom.window.Event("submit", { cancelable: true })
  );
  await flushUi();
  assert.deepEqual(state.settings.keywords, ["private", "mobile rule"]);
  assert.match(root.querySelector("#summary").textContent, /2 keyword/u);
  clearUiGlobals();
});

test("popup module bootstraps itself in a browser document", async () => {
  const dom = await createDom("popup/popup.html");
  const mock = createUiBrowser(async () => ({
    ok: true,
    value: {
      settings,
      stats: {
        lastRunAt: null,
        lastDeleted: 0,
        totalDeleted: 0,
        lastError: null
      },
      version: "1.0.0",
      operation: null
    }
  }));
  installUiGlobals(dom, mock.browserApi);
  await import(`../src/popup/popup-entry.js?bootstrap=${Date.now()}`);
  await flushUi();
  assert.match(dom.window.document.querySelector("#summary").textContent, /1 keyword/u);
  clearUiGlobals();
});
