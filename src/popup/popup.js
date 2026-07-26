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

export function initializePopup(
  documentRoot = document,
  browserApi = browser
) {
  const enabledInput = documentRoot.querySelector("#enabled");
  const addForm = documentRoot.querySelector("#add-form");
  const keywordInput = documentRoot.querySelector("#keyword");
  const cleanButton = documentRoot.querySelector("#clean-now");
  const optionsButton = documentRoot.querySelector("#open-options");
  const summary = documentRoot.querySelector("#summary");
  const status = documentRoot.querySelector("#status");
  const cancelOperation = documentRoot.querySelector("#cancel-operation");
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
    cancel: cancelOperation
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
      throw new Error(problemMessage(response?.error));
    }
    return response.value;
  }

  function setBusy(isBusy, trigger = null) {
    if (trigger) {
      busyButton = trigger;
    }
    documentRoot
      .querySelectorAll("[data-operation-control], #enabled, #keyword")
      .forEach((element) => {
        element.disabled = isBusy;
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
    status.textContent = text;
    status.dataset.tone = tone;
  }

  function render() {
    enabledInput.checked = state.settings.enabled;
    summary.textContent = message("keywordCount", [
      String(state.settings.keywords.length)
    ]);
    if (state.stats.lastError) {
      setStatus(problemMessage(state.stats.lastError), "error");
    } else if (state.stats.lastRunAt) {
      setStatus(
        message("lastCleanup", [
          String(state.stats.lastDeleted),
          new Date(state.stats.lastRunAt).toLocaleString()
        ])
      );
    } else {
      setStatus(message("readyStatus"));
    }
    showOperation(state.operation);
  }

  async function refresh() {
    state = await send("get-state");
    render();
  }

  function validatedSettings(value) {
    const validation = validateSettings(value);
    if (validation.errors.length > 0) {
      throw new Error(problemMessage(validation.errors[0]));
    }
    return validation.settings;
  }

  async function save(settings) {
    const result = await send("save-settings", {
      settings: validatedSettings(settings)
    });
    state.settings = result.settings;
    return result;
  }

  enabledInput.addEventListener("change", async () => {
    setBusy(true);
    try {
      await save({ ...state.settings, enabled: enabledInput.checked });
      render();
      setStatus(message("savedWithoutCleanup"), "success");
    } catch (error) {
      enabledInput.checked = state.settings.enabled;
      setStatus(error.message, "error");
    } finally {
      setBusy(false);
    }
  });

  addForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const keyword = keywordInput.value.trim();
    if (!keyword) {
      return;
    }
    setBusy(true, addForm.querySelector("button"));
    setStatus(message("workingStatus"));
    try {
      const settings = validatedSettings({
        ...state.settings,
        keywords: [...state.settings.keywords, keyword]
      });
      if (
        analyzeRuleRisk(settings).level === "high" &&
        !(await waitForDialogChoice(ruleDialog, ruleConfirm, ruleCancel))
      ) {
        setStatus(message("saveCancelled"));
        return;
      }
      await save(settings);
      keywordInput.value = "";
      render();
      setStatus(message("savedWithoutCleanup"), "success");
    } catch (error) {
      setStatus(error.message, "error");
    } finally {
      setBusy(false);
      keywordInput.focus();
    }
  });

  cleanButton.addEventListener("click", async () => {
    setBusy(true, cleanButton);
    setStatus(message("previewBeforeWipe"));
    try {
      const preview = await send("preview", { settings: state.settings });
      if (preview.matched === 0) {
        setStatus(message("noMatchesToDelete"), "success");
        return;
      }
      wipeSummary.textContent = message("wipePreviewSummary", [
        String(preview.matched),
        String(preview.checked)
      ]);
      wipeRisk.hidden = preview.risk.level === "low";
      wipeRisk.textContent =
        preview.risk.level === "high"
          ? message("wipeRiskHigh")
          : message("wipeRiskMedium");
      if (!(await waitForDialogChoice(wipeDialog, wipeConfirm, wipeCancel))) {
        setStatus(message("wipeCancelled"));
        return;
      }
      setBusy(true, cleanButton);
      const result = await send("clean-now", {
        confirmedPreviewId: preview.previewId
      });
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

  cancelOperation.addEventListener("click", async () => {
    await send("cancel-operation");
    setStatus(message("cancellingOperation"));
  });

  optionsButton.addEventListener("click", async () => {
    await browserApi.runtime.openOptionsPage();
    window.close();
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
  refresh().catch((error) => setStatus(error.message, "error"));

  return { refresh, render, save, validatedSettings };
}
