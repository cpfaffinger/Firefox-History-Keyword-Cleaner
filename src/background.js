import {
  DEFAULT_SETTINGS,
  loadSettings,
  loadStats,
  normalizeSettings,
  saveSettings,
  saveStats
} from "./lib/settings.js";
import { findMatchingKeyword } from "./lib/rules.js";
import {
  cleanHistory,
  previewHistoryMatches
} from "./lib/history-cleaner.js";

const storage = browser.storage.local;
let activeOperationPromise = null;
let operationSequence = 0;
let operation = null;

function publicOperation() {
  return operation ? { ...operation } : null;
}

async function broadcastOperation() {
  await browser.runtime.sendMessage({
    target: "history-keyword-cleaner-ui",
    event: "operation-progress",
    operation: publicOperation()
  });
}

async function setOperation(patch) {
  operation = { ...operation, ...patch };
  await broadcastOperation();
}

async function runOperation(type, reason, worker) {
  if (activeOperationPromise) {
    throw new Error("Another history operation is already running.");
  }

  const id = `${Date.now()}-${operationSequence += 1}`;
  operation = {
    id,
    type,
    reason,
    status: "running",
    phase: "starting",
    checked: 0,
    total: null,
    matched: 0,
    deleted: 0,
    failed: 0,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    error: null
  };

  activeOperationPromise = (async () => {
    await broadcastOperation();
    try {
      const result = await worker(async (progress) => {
        await setOperation(progress);
      });
      await setOperation({
        status: "complete",
        phase: "complete",
        checked: result.checked ?? operation.checked,
        total: result.checked ?? operation.total,
        matched: result.matched ?? operation.matched,
        deleted: result.deleted ?? operation.deleted,
        failed: result.failures?.length ?? 0,
        finishedAt: new Date().toISOString()
      });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await setOperation({
        status: "error",
        phase: "error",
        error: message,
        finishedAt: new Date().toISOString()
      });
      throw error;
    }
  })();

  try {
    return await activeOperationPromise;
  } finally {
    activeOperationPromise = null;
  }
}

async function updateStats(result, reason, error = null) {
  const previous = await loadStats(storage);
  return saveStats(storage, {
    lastRunAt: new Date().toISOString(),
    lastRunReason: reason,
    lastChecked: result?.checked ?? 0,
    lastDeleted: result?.deleted ?? 0,
    totalDeleted: previous.totalDeleted + (result?.deleted ?? 0),
    lastError: error
  });
}

async function runCleanup(reason, settingsOverride = null) {
  return runOperation(
    reason === "manual" ? "wipe" : "cleanup",
    reason,
    async (onProgress) => {
    const settings = settingsOverride ?? (await loadSettings(storage));
    if (settings.keywords.length === 0) {
      const result = { checked: 0, matched: 0, deleted: 0, failures: [] };
      await updateStats(result, reason);
      return result;
    }

    try {
      const result = await cleanHistory(browser.history, {
        ...settings,
        enabled: true
      }, {
        onProgress
      });
      const error =
        result.failures.length > 0
          ? `${result.failures.length} URL(s) could not be deleted.`
          : null;
      await updateStats(result, reason, error);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await updateStats(null, reason, message);
      throw error;
    }
    }
  );
}

async function runPreview(settings) {
  return runOperation("preview", "preview", async (onProgress) =>
    previewHistoryMatches(
      browser.history,
      { ...settings, enabled: true },
      { onProgress }
    )
  );
}

async function deleteItemIfMatched(item) {
  const settings = await loadSettings(storage);
  if (!settings.enabled || !findMatchingKeyword(item, settings)) {
    return;
  }

  try {
    await browser.history.deleteUrl({ url: item.url });
    const previous = await loadStats(storage);
    await saveStats(storage, {
      ...previous,
      lastRunAt: new Date().toISOString(),
      lastRunReason: "realtime",
      lastChecked: 1,
      lastDeleted: 1,
      totalDeleted: previous.totalDeleted + 1,
      lastError: null
    });
  } catch (error) {
    const previous = await loadStats(storage);
    await saveStats(storage, {
      ...previous,
      lastRunAt: new Date().toISOString(),
      lastRunReason: "realtime",
      lastChecked: 1,
      lastDeleted: 0,
      lastError: error instanceof Error ? error.message : String(error)
    });
  }
}

async function getState() {
  const [settings, stats] = await Promise.all([
    loadSettings(storage),
    loadStats(storage)
  ]);
  return {
    settings,
    stats,
    version: browser.runtime.getManifest().version,
    operation: publicOperation()
  };
}

async function handleMessage(message) {
  if (!message || message.target !== "history-keyword-cleaner") {
    return undefined;
  }

  switch (message.action) {
    case "get-state":
      return getState();

    case "save-settings": {
      const settings = await saveSettings(storage, message.settings);
      let cleanup = null;
      if (
        settings.enabled &&
        settings.cleanExistingOnChange &&
        message.runCleanup !== false
      ) {
        cleanup = await runCleanup("settings-change", settings);
      }
      return { settings, cleanup };
    }

    case "preview": {
      const settings = normalizeSettings(
        message.settings ?? (await loadSettings(storage))
      );
      return runPreview(settings);
    }

    case "clean-now": {
      const settings = normalizeSettings(
        message.settings ?? (await loadSettings(storage))
      );
      return runCleanup("manual", { ...settings, enabled: true });
    }

    default:
      throw new Error(`Unknown action: ${String(message.action)}`);
  }
}

browser.runtime.onInstalled.addListener(async ({ reason }) => {
  const current = await storage.get("settings");
  if (!current.settings) {
    await storage.set({ settings: DEFAULT_SETTINGS });
  } else {
    await saveSettings(storage, current.settings);
  }

  if (reason === "install") {
    await browser.runtime.openOptionsPage();
  }
});

browser.runtime.onStartup.addListener(async () => {
  const settings = await loadSettings(storage);
  if (settings.enabled && settings.cleanOnStartup) {
    await runCleanup("startup", settings);
  }
});

browser.history.onVisited.addListener(async (item) => {
  await deleteItemIfMatched(item);
});

browser.history.onTitleChanged.addListener(async (item) => {
  await deleteItemIfMatched(item);
});

browser.runtime.onMessage.addListener((message) => handleMessage(message));
