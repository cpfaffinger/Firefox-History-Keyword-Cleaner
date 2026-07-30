import { analyzeRuleRisk } from "../lib/rules.js";
import { validateSettings } from "../lib/settings.js";
import {
  localizeDocument,
  message,
  problemMessage
} from "../ui/i18n.js";
import {
  renderOperation,
  waitForDialogChoice
} from "../ui/operation-ui.js";

export function initializeOptions(
  documentRoot = document,
  browserApi = browser
) {
  const controls = {
    enabled: documentRoot.querySelector("#enabled"),
    keywords: documentRoot.querySelector("#keywords"),
    exceptions: documentRoot.querySelector("#exceptions"),
    matchUrl: documentRoot.querySelector("#match-url"),
    matchTitle: documentRoot.querySelector("#match-title"),
    caseSensitive: documentRoot.querySelector("#case-sensitive"),
    matchMode: documentRoot.querySelector("#match-mode"),
    urlScope: documentRoot.querySelector("#url-scope"),
    cleanOnStartup: documentRoot.querySelector("#clean-on-startup"),
    keywordCount: documentRoot.querySelector("#keyword-count"),
    save: documentRoot.querySelector("#save"),
    preview: documentRoot.querySelector("#preview"),
    cleanNow: documentRoot.querySelector("#clean-now"),
    export: documentRoot.querySelector("#export"),
    exportDebug: documentRoot.querySelector("#export-debug"),
    import: documentRoot.querySelector("#import"),
    importFile: documentRoot.querySelector("#import-file"),
    cancelOperation: documentRoot.querySelector("#cancel-operation"),
    status: documentRoot.querySelector("#status"),
    previewResults: documentRoot.querySelector("#preview-results"),
    lastRun: documentRoot.querySelector("#last-run"),
    lastDeleted: documentRoot.querySelector("#last-deleted"),
    totalDeleted: documentRoot.querySelector("#total-deleted"),
    version: documentRoot.querySelector("#version"),
    historyUnavailable: documentRoot.querySelector("#history-unavailable")
  };
  const wipeDialog = documentRoot.querySelector("#wipe-dialog");
  const wipeConfirm = documentRoot.querySelector("#wipe-confirm");
  const wipeCancel = documentRoot.querySelector("#wipe-cancel");
  const wipeSummary = documentRoot.querySelector("#wipe-preview-summary");
  const wipeRisk = documentRoot.querySelector("#wipe-risk-warning");
  const ruleDialog = documentRoot.querySelector("#rule-dialog");
  const ruleConfirm = documentRoot.querySelector("#rule-confirm");
  const ruleCancel = documentRoot.querySelector("#rule-cancel");
  const operationElements = {
    panel: documentRoot.querySelector("#operation-panel"),
    spinner: documentRoot.querySelector("#operation-spinner"),
    icon: documentRoot.querySelector("#operation-icon"),
    label: documentRoot.querySelector("#operation-label"),
    detail: documentRoot.querySelector("#operation-detail"),
    progress: documentRoot.querySelector("#operation-progress"),
    cancel: controls.cancelOperation
  };

  let state = null;
  let busyButton = null;

  async function send(action, extra = {}) {
    const response = await browserApi.runtime.sendMessage({
      target: "history-keyword-cleaner",
      action,
      ...extra
    });
    if (!response?.ok) {
      const error = new Error(problemMessage(response?.error));
      error.problem = response?.error;
      throw error;
    }
    return response.value;
  }

  function parseLines(control) {
    return control.value
      .split(/\r?\n/u)
      .map((value) => value.trim())
      .filter(Boolean);
  }

  function readSettings() {
    return {
      enabled: controls.enabled.checked,
      keywords: parseLines(controls.keywords),
      exceptions: parseLines(controls.exceptions),
      matchUrl: controls.matchUrl.checked,
      matchTitle: controls.matchTitle.checked,
      caseSensitive: controls.caseSensitive.checked,
      matchMode: controls.matchMode.value,
      urlScope: controls.urlScope.value,
      cleanOnStartup: controls.cleanOnStartup.checked
    };
  }

  function validatedSettings(value = readSettings()) {
    const validation = validateSettings(value);
    if (validation.errors.length > 0) {
      const error = new Error(problemMessage(validation.errors[0]));
      error.problem = validation.errors[0];
      throw error;
    }
    return validation.settings;
  }

  function setBusy(isBusy, trigger = null) {
    if (trigger) {
      busyButton = trigger;
    }
    documentRoot
      .querySelectorAll("[data-operation-control]")
      .forEach((element) => {
        element.disabled =
          isBusy ||
          (state?.capabilities?.history === false &&
            element.hasAttribute("data-history-control"));
      });
    busyButton?.classList.toggle("is-loading", isBusy);
    if (!isBusy) {
      busyButton = null;
    }
  }

  function showOperation(nextOperation) {
    setBusy(renderOperation(operationElements, nextOperation));
  }

  function setStatus(text, tone = "") {
    controls.status.textContent = text;
    controls.status.dataset.tone = tone;
  }

  function renderSettings(settings) {
    controls.enabled.checked = settings.enabled;
    controls.keywords.value = settings.keywords.join("\n");
    controls.exceptions.value = settings.exceptions.join("\n");
    controls.matchUrl.checked = settings.matchUrl;
    controls.matchTitle.checked = settings.matchTitle;
    controls.caseSensitive.checked = settings.caseSensitive;
    controls.matchMode.value = settings.matchMode;
    controls.urlScope.value = settings.urlScope;
    controls.cleanOnStartup.checked = settings.cleanOnStartup;
    updateKeywordCount();
  }

  function renderStats(stats) {
    controls.lastRun.textContent = stats.lastRunAt
      ? new Date(stats.lastRunAt).toLocaleString()
      : "—";
    controls.lastDeleted.textContent = String(stats.lastDeleted);
    controls.totalDeleted.textContent = String(stats.totalDeleted);
    if (stats.lastError) {
      setStatus(problemMessage(stats.lastError), "error");
    } else if (!controls.status.textContent) {
      setStatus(message("readyStatus"));
    }
  }

  function updateKeywordCount() {
    controls.keywordCount.textContent = `${parseLines(controls.keywords).length} / 500`;
  }

  function renderCapabilities() {
    const hasHistoryAccess = state.capabilities?.history !== false;
    controls.historyUnavailable.hidden = hasHistoryAccess;
    documentRoot.querySelectorAll("[data-history-control]").forEach((element) => {
      element.disabled = !hasHistoryAccess;
    });
    if (!hasHistoryAccess) {
      setStatus(message("historyApiUnavailable"), "error");
    }
  }

  async function refresh({ preserveDraft = false } = {}) {
    state = await send("get-state");
    if (!preserveDraft) {
      renderSettings(state.settings);
    }
    renderStats(state.stats);
    controls.version.textContent = state.version;
    showOperation(state.operation);
    renderCapabilities();
  }

  async function confirmBroadRules(settings) {
    if (analyzeRuleRisk(settings).level !== "high") {
      return true;
    }
    return waitForDialogChoice(ruleDialog, ruleConfirm, ruleCancel);
  }

  async function saveCurrentSettings(value = readSettings()) {
    const settings = validatedSettings(value);
    if (!(await confirmBroadRules(settings))) {
      return null;
    }
    const result = await send("save-settings", { settings });
    state.settings = result.settings;
    renderSettings(result.settings);
    return result;
  }

  function renderPreview(result) {
    controls.previewResults.replaceChildren();
    controls.previewResults.hidden = false;
    const summary = documentRoot.createElement("p");
    summary.className = "preview-summary";
    summary.textContent = message("previewResult", [
      String(result.matched),
      String(result.checked)
    ]);
    controls.previewResults.append(summary);
    if (result.samples.length === 0) {
      return;
    }
    const list = documentRoot.createElement("ul");
    list.className = "preview-list";
    for (const sample of result.samples) {
      const item = documentRoot.createElement("li");
      const title = documentRoot.createElement("strong");
      const url = documentRoot.createElement("span");
      title.textContent = sample.title || sample.url;
      url.textContent = `${sample.url} · ${message("matchedBy", [sample.keyword])}`;
      item.append(title, url);
      list.append(item);
    }
    controls.previewResults.append(list);
  }

  function prepareWipeDialog(preview) {
    wipeSummary.textContent = message("wipePreviewSummary", [
      String(preview.matched),
      String(preview.checked)
    ]);
    wipeRisk.hidden = preview.risk.level === "low";
    wipeRisk.textContent =
      preview.risk.level === "high"
        ? message("wipeRiskHigh")
        : message("wipeRiskMedium");
  }

  async function previewSettings(settings) {
    const result = await send("preview", { settings });
    renderPreview(result);
    return result;
  }

  function downloadJson(payload, filename) {
    const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const anchor = documentRoot.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  controls.keywords.addEventListener("input", updateKeywordCount);

  controls.save.addEventListener("click", async () => {
    setBusy(true, controls.save);
    setStatus(message("workingStatus"));
    try {
      const result = await saveCurrentSettings();
      setStatus(
        result ? message("savedWithoutCleanup") : message("saveCancelled"),
        result ? "success" : ""
      );
    } catch (error) {
      setStatus(error.message, "error");
    } finally {
      setBusy(false);
    }
  });

  controls.preview.addEventListener("click", async () => {
    setBusy(true, controls.preview);
    setStatus(message("workingStatus"));
    try {
      await previewSettings(validatedSettings());
      setStatus(message("previewComplete"), "success");
    } catch (error) {
      setStatus(error.message, "error");
    } finally {
      setBusy(false);
    }
  });

  controls.cleanNow.addEventListener("click", async () => {
    setBusy(true, controls.cleanNow);
    setStatus(message("previewBeforeWipe"));
    try {
      const settings = validatedSettings();
      const preview = await previewSettings(settings);
      if (preview.matched === 0) {
        setStatus(message("noMatchesToDelete"), "success");
        return;
      }
      prepareWipeDialog(preview);
      if (!(await waitForDialogChoice(wipeDialog, wipeConfirm, wipeCancel))) {
        setStatus(message("wipeCancelled"));
        return;
      }
      setBusy(true, controls.cleanNow);
      setStatus(message("workingStatus"));
      const result = await send("clean-now", {
        settings,
        confirmedPreviewId: preview.previewId
      });
      await refresh({ preserveDraft: true });
      setStatus(
        message("cleanupResult", [
          String(result.deleted),
          String(result.checked)
        ]),
        "success"
      );
    } catch (error) {
      setStatus(error.message, "error");
    } finally {
      setBusy(false);
    }
  });

  controls.export.addEventListener("click", () => {
    try {
      const settings = validatedSettings();
      const payload = {
        format: "history-keyword-cleaner-settings",
        version: 2,
        exportedAt: new Date().toISOString(),
        settings
      };
      downloadJson(payload, "history-keyword-cleaner-settings.json");
      setStatus(message("exportedStatus"), "success");
    } catch (error) {
      setStatus(error.message, "error");
    }
  });

  controls.exportDebug.addEventListener("click", async () => {
    setBusy(true, controls.exportDebug);
    try {
      const payload = await send("export-debug-log");
      const date = new Date().toISOString().slice(0, 10);
      downloadJson(
        payload,
        `history-keyword-cleaner-debug-${date}.json`
      );
      setStatus(message("debugExportedStatus"), "success");
    } catch (error) {
      setStatus(error.message, "error");
    } finally {
      setBusy(false);
    }
  });

  controls.import.addEventListener("click", () => controls.importFile.click());

  controls.importFile.addEventListener("change", async () => {
    const [file] = controls.importFile.files;
    if (!file) {
      return;
    }
    setBusy(true, controls.import);
    try {
      if (file.size > 1_000_000) {
        throw new Error(message("importTooLarge"));
      }
      const payload = JSON.parse(await file.text());
      const imported = validatedSettings(payload.settings ?? payload);
      const result = await saveCurrentSettings(imported);
      if (result) {
        await refresh();
        setStatus(message("importedStatus"), "success");
      } else {
        setStatus(message("saveCancelled"));
      }
    } catch (error) {
      setStatus(
        error instanceof SyntaxError ? message("invalidImport") : error.message,
        "error"
      );
    } finally {
      controls.importFile.value = "";
      setBusy(false);
    }
  });

  controls.cancelOperation.addEventListener("click", async () => {
    await send("cancel-operation");
    setStatus(message("cancellingOperation"));
  });

  browserApi.runtime.onMessage.addListener((incoming) => {
    if (
      incoming?.target === "history-keyword-cleaner-ui" &&
      incoming.event === "operation-progress"
    ) {
      if (state) {
        state.operation = incoming.operation;
      }
      showOperation(incoming.operation);
    }
  });

  localizeDocument(documentRoot);
  setBusy(true);
  refresh()
    .catch((error) => setStatus(error.message, "error"))
    .finally(() => setBusy(false));

  return {
    readSettings,
    refresh,
    renderPreview,
    saveCurrentSettings,
    validatedSettings
  };
}
