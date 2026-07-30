import assert from "node:assert/strict";
import test from "node:test";

import { createController } from "../src/lib/controller.js";
import {
  createBrowserMock,
  createStorageArea
} from "./helpers/browser-mock.js";

const safeSettings = {
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

function historyFixture() {
  return [
    {
      url: "https://example.test/private",
      title: "Private",
      lastVisitTime: 20
    },
    {
      url: "https://example.test/safe",
      title: "Safe",
      lastVisitTime: 10
    }
  ];
}

test("controller registers synchronous listeners and initializes installation state", async () => {
  const mock = createBrowserMock();
  const controller = createController(mock.browserApi);
  controller.register();

  assert.equal(mock.events.installed.listeners.length, 1);
  assert.equal(mock.events.startup.listeners.length, 1);
  assert.equal(mock.events.visited.listeners.length, 1);
  assert.equal(mock.events.titleChanged.listeners.length, 1);
  assert.equal(mock.events.message.listeners.length, 1);

  await mock.events.installed.listeners[0]({ reason: "install" });
  assert.equal(mock.optionsOpened(), 1);
  assert.deepEqual(mock.local.values.settings.keywords, []);

  mock.local.values.settings = { ...safeSettings, enabled: false };
  await controller.onInstalled({ reason: "update" });
  assert.equal(mock.optionsOpened(), 1);
  assert.equal(mock.local.values.settings.enabled, false);
});

test("saving never deletes existing history and validation errors are structured", async () => {
  const mock = createBrowserMock({ historyItems: historyFixture() });
  const controller = createController(mock.browserApi);

  const saved = await controller.handleMessage({
    target: "history-keyword-cleaner",
    action: "save-settings",
    settings: safeSettings
  });
  assert.equal(saved.ok, true);
  assert.deepEqual(mock.deletedUrls, []);

  const invalid = await controller.handleMessage({
    target: "history-keyword-cleaner",
    action: "save-settings",
    settings: { ...safeSettings, keywords: ["x"] }
  });
  assert.deepEqual(invalid, {
    ok: false,
    error: { code: "keywordTooShort", args: ["2"] }
  });
  assert.equal(await controller.handleMessage({ target: "other" }), undefined);
});

test("manual deletion requires the exact preview and settings fingerprint", async () => {
  const mock = createBrowserMock({ historyItems: historyFixture() });
  const controller = createController(mock.browserApi);

  const preview = await controller.dispatch({
    action: "preview",
    settings: safeSettings
  });
  assert.equal(preview.matched, 1);
  assert.equal(preview.risk.level, "high");
  assert.deepEqual(mock.deletedUrls, []);

  await assert.rejects(
    controller.dispatch({
      action: "clean-now",
      settings: safeSettings,
      confirmedPreviewId: "wrong"
    }),
    /previewRequired/u
  );
  await assert.rejects(
    controller.dispatch({
      action: "clean-now",
      settings: { ...safeSettings, keywords: ["different"] },
      confirmedPreviewId: preview.previewId
    }),
    /previewRequired/u
  );

  const result = await controller.dispatch({
    action: "clean-now",
    settings: safeSettings,
    confirmedPreviewId: preview.previewId
  });
  assert.equal(result.deleted, 1);
  assert.deepEqual(mock.deletedUrls, ["https://example.test/private"]);
  assert.equal((await controller.getState()).stats.totalDeleted, 1);
});

test("realtime events are deduplicated through visit verification and serialized stats", async () => {
  const item = historyFixture()[0];
  const mock = createBrowserMock({ historyItems: [item] });
  const controller = createController(mock.browserApi);
  controller.register();
  await mock.local.set({ settings: safeSettings });

  await Promise.all([
    mock.events.visited.listeners[0](item),
    mock.events.titleChanged.listeners[0](item)
  ]);

  assert.deepEqual(mock.deletedUrls, [item.url]);
  assert.equal((await controller.getState()).stats.totalDeleted, 1);
});

test("startup cleanup is opt-in and progress messaging failures are harmless", async () => {
  const mock = createBrowserMock({
    historyItems: historyFixture(),
    messageFailure: true
  });
  const controller = createController(mock.browserApi);
  await mock.local.set({ settings: safeSettings });
  await controller.onStartup();
  assert.deepEqual(mock.deletedUrls, []);

  await mock.local.set({
    settings: { ...safeSettings, cleanOnStartup: true }
  });
  await controller.onStartup();
  assert.deepEqual(mock.deletedUrls, ["https://example.test/private"]);
});

test("operation recovery, cancellation, failures, and unknown actions are explicit", async () => {
  const mock = createBrowserMock({
    historyItems: historyFixture(),
    deleteFailures: new Set(["https://example.test/private"])
  });
  const controller = createController(mock.browserApi, {
    now: () => 100,
    isoNow: () => "2026-07-26T00:00:00.000Z"
  });
  await mock.session.set({
    activeOperation: {
      id: "stale",
      status: "running",
      phase: "scanning"
    }
  });
  const recovered = await controller.recoverOperation();
  assert.equal(recovered.status, "error");
  assert.equal(recovered.error.code, "backgroundRestarted");

  await assert.rejects(
    controller.dispatch({ action: "unknown" }),
    /unknownAction/u
  );

  const preview = await controller.dispatch({
    action: "preview",
    settings: { ...safeSettings, keywords: ["example"] }
  });
  assert.equal(preview.risk.level, "high");
  const cleanup = await controller.dispatch({
    action: "clean-now",
    settings: { ...safeSettings, keywords: ["example"] },
    confirmedPreviewId: preview.previewId
  });
  assert.equal(cleanup.failures.length, 1);
  assert.equal((await controller.getState()).stats.lastError.code, "deletionFailures");

  assert.deepEqual(
    await controller.dispatch({ action: "cancel-operation" }),
    { cancelled: false }
  );
});

test("controller falls back to local storage when session storage is unavailable", async () => {
  const mock = createBrowserMock();
  delete mock.browserApi.storage.session;
  const controller = createController(mock.browserApi);
  assert.equal((await controller.getState()).version, "9.8.7");
  delete mock.browserApi.runtime.getBrowserInfo;
  delete mock.browserApi.runtime.getPlatformInfo;
  assert.deepEqual((await controller.exportDebugLog()).environment, {
    browser: null,
    platform: null
  });

  const legacyStorage = createStorageArea({
    activeOperation: null
  });
  mock.browserApi.storage.local = legacyStorage;
});

test("Android without the history API keeps messaging, settings, and diagnostics available", async () => {
  const mock = createBrowserMock({
    historyAvailable: false,
    platformInfo: { os: "android", arch: "arm64" }
  });
  const controller = createController(mock.browserApi, {
    now: () => 100,
    isoNow: () => "2026-07-30T10:00:00.000Z"
  });

  controller.register();
  assert.equal(mock.events.message.listeners.length, 1);
  assert.equal(mock.events.installed.listeners.length, 1);
  assert.equal(mock.events.startup.listeners.length, 1);
  assert.equal(mock.events.visited.listeners.length, 0);
  assert.equal(mock.events.titleChanged.listeners.length, 0);

  const saved = await mock.events.message.listeners[0]({
    target: "history-keyword-cleaner",
    action: "save-settings",
    settings: {
      ...safeSettings,
      keywords: ["private mobile"],
      cleanOnStartup: true
    }
  });
  assert.equal(saved.ok, true);
  await controller.onStartup();

  const state = await controller.getState();
  assert.deepEqual(state.capabilities, {
    history: false,
    historyRead: false,
    historyDelete: false,
    realtime: false
  });
  assert.deepEqual(await controller.deleteItemIfMatched({}), {
    deleted: false,
    error: { code: "historyApiUnavailable", args: [] }
  });

  const preview = await controller.handleMessage({
    target: "history-keyword-cleaner",
    action: "preview",
    settings: safeSettings
  });
  assert.deepEqual(preview, {
    ok: false,
    error: { code: "historyApiUnavailable", args: [] }
  });

  const exported = await controller.handleMessage({
    target: "history-keyword-cleaner",
    action: "export-debug-log"
  });
  assert.equal(exported.ok, true);
  assert.equal(exported.value.format, "history-keyword-cleaner-debug-log");
  assert.equal(exported.value.environment.platform.os, "android");
  assert.equal(exported.value.stateSummary.keywordCount, 1);
  assert.ok(
    exported.value.entries.some(
      ({ event }) => event === "startup-cleanup-skipped"
    )
  );
  assert.doesNotMatch(JSON.stringify(exported.value), /private mobile/u);
});

test("debug export tolerates rejected runtime information APIs", async () => {
  const mock = createBrowserMock();
  mock.browserApi.runtime.getBrowserInfo = async () => {
    throw new Error("browser info unavailable");
  };
  mock.browserApi.runtime.getPlatformInfo = async () => {
    throw new Error("platform info unavailable");
  };
  const controller = createController(mock.browserApi);
  assert.deepEqual((await controller.exportDebugLog()).environment, {
    browser: null,
    platform: null
  });
});

test("running operations can be cancelled and reject overlapping work", async () => {
  const mock = createBrowserMock({ historyItems: historyFixture() });
  let releaseSearch;
  const searchGate = new Promise((resolve) => {
    releaseSearch = resolve;
  });
  const originalSearch = mock.browserApi.history.search;
  mock.browserApi.history.search = async (query) => {
    await searchGate;
    return originalSearch(query);
  };
  const controller = createController(mock.browserApi);

  const running = controller.dispatch({
    action: "preview",
    settings: safeSettings
  });
  const busy = await controller.handleMessage({
    target: "history-keyword-cleaner",
    action: "preview",
    settings: safeSettings
  });
  assert.equal(busy.error.code, "operationBusy");

  assert.deepEqual(
    await controller.dispatch({ action: "cancel-operation" }),
    { cancelled: true }
  );
  releaseSearch();
  await assert.rejects(
    running,
    (error) => error.code === "operationCancelled"
  );
  assert.equal((await controller.getState()).operation.status, "cancelled");
});

test("empty cleanup, API errors, realtime failures, and dispatch validation are covered", async () => {
  const item = historyFixture()[0];
  const mock = createBrowserMock({
    historyItems: [item],
    deleteFailures: new Set([item.url])
  });
  const controller = createController(mock.browserApi);

  const empty = await controller.runCleanup("startup", {
    ...safeSettings,
    keywords: []
  });
  assert.equal(empty.checked, 0);

  assert.deepEqual(
    await controller.deleteItemIfMatched({
      url: "https://safe.test",
      title: "Safe"
    }),
    { deleted: false }
  );
  await mock.local.set({ settings: safeSettings });
  const realtimeFailure = await controller.deleteItemIfMatched(item);
  assert.equal(realtimeFailure.error.code, "unexpectedError");

  mock.browserApi.history.search = async () => {
    const error = new Error("search failed");
    error.code = "historyUnavailable";
    throw error;
  };
  await assert.rejects(
    controller.runCleanup("startup", safeSettings),
    /search failed/u
  );
  assert.equal((await controller.getState()).stats.lastError.code, "historyUnavailable");

  await assert.rejects(
    controller.dispatch({
      action: "preview",
      settings: { ...safeSettings, keywords: ["x"] }
    }),
    /keywordTooShort/u
  );
  await assert.rejects(
    controller.dispatch({
      action: "clean-now",
      settings: { ...safeSettings, keywords: ["x"] }
    }),
    /keywordTooShort/u
  );
  assert.equal((await controller.dispatch({ action: "get-state" })).version, "9.8.7");
});

test("registered runtime message listener returns the controller envelope", async () => {
  const mock = createBrowserMock();
  const controller = createController(mock.browserApi);
  controller.register();
  const response = await mock.events.message.listeners[0]({
    target: "history-keyword-cleaner",
    action: "get-state"
  });
  assert.equal(response.ok, true);
});
