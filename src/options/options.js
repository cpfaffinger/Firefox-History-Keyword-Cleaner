import { localizeDocument, message } from "../ui/i18n.js";
import {
  renderOperation,
  waitForDialogChoice
} from "../ui/operation-ui.js";

const controls = {
  enabled: document.querySelector("#enabled"),
  keywords: document.querySelector("#keywords"),
  matchUrl: document.querySelector("#match-url"),
  matchTitle: document.querySelector("#match-title"),
  caseSensitive: document.querySelector("#case-sensitive"),
  cleanOnStartup: document.querySelector("#clean-on-startup"),
  cleanOnChange: document.querySelector("#clean-on-change"),
  keywordCount: document.querySelector("#keyword-count"),
  save: document.querySelector("#save"),
  preview: document.querySelector("#preview"),
  cleanNow: document.querySelector("#clean-now"),
  export: document.querySelector("#export"),
  import: document.querySelector("#import"),
  importFile: document.querySelector("#import-file"),
  status: document.querySelector("#status"),
  previewResults: document.querySelector("#preview-results"),
  lastRun: document.querySelector("#last-run"),
  lastDeleted: document.querySelector("#last-deleted"),
  totalDeleted: document.querySelector("#total-deleted"),
  version: document.querySelector("#version")
};
const wipeDialog = document.querySelector("#wipe-dialog");
const wipeConfirm = document.querySelector("#wipe-confirm");
const wipeCancel = document.querySelector("#wipe-cancel");
const operationElements = {
  panel: document.querySelector("#operation-panel"),
  spinner: document.querySelector("#operation-spinner"),
  icon: document.querySelector("#operation-icon"),
  label: document.querySelector("#operation-label"),
  detail: document.querySelector("#operation-detail"),
  progress: document.querySelector("#operation-progress")
};

let state = null;
let busyButton = null;

function send(action, extra = {}) {
  return browser.runtime.sendMessage({
    target: "history-keyword-cleaner",
    action,
    ...extra
  });
}

function parseKeywords() {
  return controls.keywords.value
    .split(/\r?\n/u)
    .map((keyword) => keyword.trim())
    .filter(Boolean);
}

function readSettings() {
  return {
    enabled: controls.enabled.checked,
    keywords: parseKeywords(),
    matchUrl: controls.matchUrl.checked,
    matchTitle: controls.matchTitle.checked,
    caseSensitive: controls.caseSensitive.checked,
    cleanOnStartup: controls.cleanOnStartup.checked,
    cleanExistingOnChange: controls.cleanOnChange.checked
  };
}

function setBusy(isBusy, trigger = null) {
  if (trigger) {
    busyButton = trigger;
  }

  document
    .querySelectorAll("[data-operation-control]")
    .forEach((element) => {
      element.disabled = isBusy;
    });

  busyButton?.classList.toggle("is-loading", isBusy);
  if (!isBusy) {
    busyButton = null;
  }
}

function showOperation(nextOperation) {
  const running = renderOperation(operationElements, nextOperation);
  setBusy(running);
}

function setStatus(text, tone = "") {
  controls.status.textContent = text;
  controls.status.dataset.tone = tone;
}

function renderSettings(settings) {
  controls.enabled.checked = settings.enabled;
  controls.keywords.value = settings.keywords.join("\n");
  controls.matchUrl.checked = settings.matchUrl;
  controls.matchTitle.checked = settings.matchTitle;
  controls.caseSensitive.checked = settings.caseSensitive;
  controls.cleanOnStartup.checked = settings.cleanOnStartup;
  controls.cleanOnChange.checked = settings.cleanExistingOnChange;
  updateKeywordCount();
}

function renderStats(stats) {
  controls.lastRun.textContent = stats.lastRunAt
    ? new Date(stats.lastRunAt).toLocaleString()
    : "—";
  controls.lastDeleted.textContent = String(stats.lastDeleted);
  controls.totalDeleted.textContent = String(stats.totalDeleted);

  if (stats.lastError) {
    setStatus(stats.lastError, "error");
  } else if (!controls.status.textContent) {
    setStatus(message("readyStatus"));
  }
}

function validateSettings(settings) {
  if (!settings.matchUrl && !settings.matchTitle) {
    throw new Error(message("matchFieldRequired"));
  }
  if (settings.keywords.length > 500) {
    throw new Error(message("tooManyKeywords"));
  }
}

function updateKeywordCount() {
  controls.keywordCount.textContent = `${parseKeywords().length} / 500`;
}

async function refresh() {
  state = await send("get-state");
  renderSettings(state.settings);
  renderStats(state.stats);
  controls.version.textContent = state.version;
  showOperation(state.operation);
}

async function saveCurrentSettings({ runCleanup = true } = {}) {
  const settings = readSettings();
  validateSettings(settings);
  const result = await send("save-settings", { settings, runCleanup });
  state.settings = result.settings;
  renderSettings(result.settings);
  return result;
}

function renderPreview(result) {
  controls.previewResults.replaceChildren();
  controls.previewResults.hidden = false;

  const summary = document.createElement("p");
  summary.className = "preview-summary";
  summary.textContent = message("previewResult", [
    String(result.matched),
    String(result.checked)
  ]);
  controls.previewResults.append(summary);

  if (result.samples.length === 0) {
    return;
  }

  const list = document.createElement("ul");
  list.className = "preview-list";
  for (const sample of result.samples) {
    const item = document.createElement("li");
    const title = document.createElement("strong");
    const url = document.createElement("span");
    title.textContent = sample.title || sample.url;
    url.textContent = `${sample.url} · ${message("matchedBy", [sample.keyword])}`;
    item.append(title, url);
    list.append(item);
  }
  controls.previewResults.append(list);
}

controls.keywords.addEventListener("input", updateKeywordCount);

controls.save.addEventListener("click", async () => {
  setBusy(true, controls.save);
  setStatus(message("workingStatus"));
  try {
    const result = await saveCurrentSettings();
    await refresh();
    setStatus(
      result.cleanup
        ? message("cleanupResult", [
            String(result.cleanup.deleted),
            String(result.cleanup.checked)
          ])
        : message("savedStatus"),
      "success"
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
    const settings = readSettings();
    validateSettings(settings);
    const result = await send("preview", { settings });
    renderPreview(result);
    setStatus(message("previewComplete"), "success");
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    setBusy(false);
  }
});

controls.cleanNow.addEventListener("click", async () => {
  const confirmed = await waitForDialogChoice(
    wipeDialog,
    wipeConfirm,
    wipeCancel
  );
  if (!confirmed) {
    return;
  }

  setBusy(true, controls.cleanNow);
  setStatus(message("workingStatus"));
  try {
    const settings = readSettings();
    validateSettings(settings);
    const result = await send("clean-now", { settings });
    await refresh();
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
    const settings = readSettings();
    validateSettings(settings);
    const payload = {
      format: "history-keyword-cleaner-settings",
      version: 1,
      exportedAt: new Date().toISOString(),
      settings
    };
    const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "history-keyword-cleaner-settings.json";
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus(message("exportedStatus"), "success");
  } catch (error) {
    setStatus(error.message, "error");
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
    const payload = JSON.parse(await file.text());
    const imported = payload.settings ?? payload;
    validateSettings(imported);
    renderSettings(imported);
    await saveCurrentSettings();
    await refresh();
    setStatus(message("importedStatus"), "success");
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

browser.runtime.onMessage.addListener((incoming) => {
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

localizeDocument();
refresh().catch((error) => setStatus(error.message, "error"));
