import {
  DEFAULT_SETTINGS,
  loadSettings,
  loadStats,
  saveSettings,
  saveStats,
  validateSettings
} from "./settings.js";
import { findMatchingKeyword, analyzeRuleRisk } from "./rules.js";
import { cleanHistory, previewHistoryMatches } from "./history-cleaner.js";

const OPERATION_KEY = "activeOperation";
const PROGRESS_INTERVAL_MS = 150;

function problem(code, args = []) {
  const error = new Error(code);
  error.code = code;
  error.args = args.map((argument) => String(argument));
  return error;
}

function serializeError(error) {
  return {
    code:
      typeof error?.code === "string" ? error.code : "unexpectedError",
    args: Array.isArray(error?.args)
      ? error.args.map((argument) => String(argument))
      : []
  };
}

function settingsFingerprint(settings) {
  return JSON.stringify(settings);
}

export function createController(browserApi, {
  now = () => Date.now(),
  isoNow = () => new Date(now()).toISOString()
} = {}) {
  const storage = browserApi.storage.local;
  const session = browserApi.storage.session ?? storage;
  let operation = null;
  let activeOperationPromise = null;
  let operationSequence = 0;
  let serialQueue = Promise.resolve();
  let lastProgressPublishedAt = 0;
  const cancelledOperations = new Set();

  function enqueue(task) {
    const result = serialQueue.then(task, task);
    serialQueue = result.catch(() => undefined);
    return result;
  }

  function publicOperation() {
    return operation ? { ...operation } : null;
  }

  async function broadcastOperation() {
    try {
      await browserApi.runtime.sendMessage({
        target: "history-keyword-cleaner-ui",
        event: "operation-progress",
        operation: publicOperation()
      });
    } catch {
      // The UI is optional. A messaging failure must never abort history work.
    }
  }

  async function publishOperation(patch, force = false) {
    operation = { ...operation, ...patch };
    const currentTime = now();
    if (!force && currentTime - lastProgressPublishedAt < PROGRESS_INTERVAL_MS) {
      return;
    }
    lastProgressPublishedAt = currentTime;
    await session.set({ [OPERATION_KEY]: publicOperation() });
    await broadcastOperation();
  }

  async function recoverOperation() {
    const stored = await session.get(OPERATION_KEY);
    operation = stored[OPERATION_KEY] ?? null;
    if (operation?.status === "running") {
      operation = {
        ...operation,
        status: "error",
        phase: "error",
        error: { code: "backgroundRestarted", args: [] },
        finishedAt: isoNow()
      };
      await session.set({ [OPERATION_KEY]: operation });
    }
    return operation;
  }

  async function shouldCancel(id) {
    return cancelledOperations.has(id);
  }

  async function runOperation(type, reason, worker) {
    if (activeOperationPromise) {
      throw problem("operationBusy");
    }

    const id = `${now()}-${operationSequence += 1}`;
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
      startedAt: isoNow(),
      finishedAt: null,
      error: null
    };

    activeOperationPromise = enqueue(async () => {
      await publishOperation({}, true);
      try {
        const result = await worker(
          (progress) => publishOperation(progress),
          () => shouldCancel(id)
        );
        await publishOperation(
          {
            status: "complete",
            phase: "complete",
            checked: result.checked ?? operation.checked,
            total: result.checked ?? operation.total,
            matched: result.matched ?? operation.matched,
            deleted: result.deleted ?? operation.deleted,
            failed: result.failures?.length ?? 0,
            finishedAt: isoNow()
          },
          true
        );
        return result;
      } catch (error) {
        const serialized = serializeError(error);
        await publishOperation(
          {
            status: serialized.code === "operationCancelled" ? "cancelled" : "error",
            phase: serialized.code === "operationCancelled" ? "cancelled" : "error",
            error: serialized,
            finishedAt: isoNow()
          },
          true
        );
        throw error;
      } finally {
        cancelledOperations.delete(id);
      }
    });

    try {
      return await activeOperationPromise;
    } finally {
      activeOperationPromise = null;
    }
  }

  async function updateStats(result, reason, error = null) {
    const previous = await loadStats(storage);
    return saveStats(storage, {
      lastRunAt: isoNow(),
      lastRunReason: reason,
      lastChecked: result?.checked ?? 0,
      lastDeleted: result?.deleted ?? 0,
      totalDeleted: previous.totalDeleted + (result?.deleted ?? 0),
      lastError: error
    });
  }

  async function runCleanup(reason, settings) {
    return runOperation(
      reason === "manual" ? "wipe" : "cleanup",
      reason,
      async (onProgress, cancellationCheck) => {
        if (settings.keywords.length === 0) {
          const result = {
            checked: 0,
            matched: 0,
            deleted: 0,
            failures: []
          };
          await updateStats(result, reason);
          return result;
        }

        try {
          const result = await cleanHistory(
            browserApi.history,
            { ...settings, enabled: true },
            { onProgress, shouldCancel: cancellationCheck }
          );
          const error =
            result.failures.length > 0
              ? {
                  code: "deletionFailures",
                  args: [String(result.failures.length)]
                }
              : null;
          await updateStats(result, reason, error);
          return result;
        } catch (error) {
          await updateStats(null, reason, serializeError(error));
          throw error;
        }
      }
    );
  }

  async function runPreview(settings) {
    return runOperation(
      "preview",
      "preview",
      async (onProgress, cancellationCheck) => {
        const result = await previewHistoryMatches(
          browserApi.history,
          { ...settings, enabled: true },
          { onProgress, shouldCancel: cancellationCheck }
        );
        operation.previewFingerprint = settingsFingerprint(settings);
        return { ...result, risk: analyzeRuleRisk(settings, result) };
      }
    );
  }

  async function deleteItemIfMatched(item) {
    const settings = await loadSettings(storage);
    if (!settings.enabled || !findMatchingKeyword(item, settings)) {
      return { deleted: false };
    }

    try {
      if (typeof browserApi.history.getVisits === "function") {
        const visits = await browserApi.history.getVisits({ url: item.url });
        if (visits.length === 0) {
          return { deleted: false };
        }
      }
      await browserApi.history.deleteUrl({ url: item.url });
      await updateStats(
        { checked: 1, deleted: 1 },
        "realtime"
      );
      return { deleted: true };
    } catch (error) {
      await updateStats(null, "realtime", serializeError(error));
      return { deleted: false, error: serializeError(error) };
    }
  }

  async function getState() {
    const [settings, stats, persistedOperation] = await Promise.all([
      loadSettings(storage),
      loadStats(storage),
      operation ? Promise.resolve(operation) : recoverOperation()
    ]);
    return {
      settings,
      stats,
      version: browserApi.runtime.getManifest().version,
      operation: operation ?? persistedOperation
    };
  }

  async function dispatch(message) {
    switch (message.action) {
      case "get-state":
        return getState();

      case "save-settings": {
        const validation = validateSettings(message.settings);
        if (validation.errors.length > 0) {
          const first = validation.errors[0];
          throw problem(first.code, first.args);
        }
        const settings = await enqueue(() =>
          saveSettings(storage, validation.settings)
        );
        return { settings };
      }

      case "preview": {
        const validation = validateSettings(
          message.settings ?? (await loadSettings(storage))
        );
        if (validation.errors.length > 0) {
          const first = validation.errors[0];
          throw problem(first.code, first.args);
        }
        const result = await runPreview(validation.settings);
        return { ...result, previewId: operation.id };
      }

      case "clean-now": {
        const validation = validateSettings(
          message.settings ?? (await loadSettings(storage))
        );
        if (validation.errors.length > 0) {
          const first = validation.errors[0];
          throw problem(first.code, first.args);
        }
        if (
          message.confirmedPreviewId !== operation?.id ||
          operation.previewFingerprint !== settingsFingerprint(validation.settings)
        ) {
          throw problem("previewRequired");
        }
        return runCleanup("manual", {
          ...validation.settings,
          enabled: true
        });
      }

      case "cancel-operation":
        if (operation?.status === "running") {
          cancelledOperations.add(operation.id);
        }
        return { cancelled: Boolean(operation?.status === "running") };

      default:
        throw problem("unknownAction");
    }
  }

  async function handleMessage(message) {
    if (!message || message.target !== "history-keyword-cleaner") {
      return undefined;
    }
    try {
      return { ok: true, value: await dispatch(message) };
    } catch (error) {
      return { ok: false, error: serializeError(error) };
    }
  }

  async function onInstalled({ reason }) {
    const current = await storage.get("settings");
    if (!current.settings) {
      await storage.set({ settings: DEFAULT_SETTINGS });
    } else {
      await saveSettings(storage, current.settings);
    }
    await recoverOperation();
    if (reason === "install") {
      await browserApi.runtime.openOptionsPage();
    }
  }

  async function onStartup() {
    await recoverOperation();
    const settings = await loadSettings(storage);
    if (settings.enabled && settings.cleanOnStartup) {
      await runCleanup("startup", settings);
    }
  }

  function register() {
    browserApi.runtime.onInstalled.addListener((details) =>
      onInstalled(details)
    );
    browserApi.runtime.onStartup.addListener(() => onStartup());
    browserApi.history.onVisited.addListener((item) =>
      enqueue(() => deleteItemIfMatched(item))
    );
    browserApi.history.onTitleChanged.addListener((item) =>
      enqueue(() => deleteItemIfMatched(item))
    );
    browserApi.runtime.onMessage.addListener((message) =>
      handleMessage(message)
    );
  }

  return {
    deleteItemIfMatched,
    dispatch,
    getState,
    handleMessage,
    onInstalled,
    onStartup,
    recoverOperation,
    register,
    runCleanup,
    runPreview
  };
}
