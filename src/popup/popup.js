import { localizeDocument, message } from "../ui/i18n.js";
import {
  renderOperation,
  waitForDialogChoice
} from "../ui/operation-ui.js";

const enabledInput = document.querySelector("#enabled");
const addForm = document.querySelector("#add-form");
const keywordInput = document.querySelector("#keyword");
const cleanButton = document.querySelector("#clean-now");
const optionsButton = document.querySelector("#open-options");
const summary = document.querySelector("#summary");
const status = document.querySelector("#status");
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

function setBusy(isBusy, trigger = null) {
  if (trigger) {
    busyButton = trigger;
  }

  document
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
  const running = renderOperation(operationElements, nextOperation);
  setBusy(running);
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
    setStatus(state.stats.lastError, "error");
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

enabledInput.addEventListener("change", async () => {
  setBusy(true);
  try {
    const result = await send("save-settings", {
      settings: { ...state.settings, enabled: enabledInput.checked }
    });
    state.settings = result.settings;
    if (result.cleanup) {
      state.stats = (await send("get-state")).stats;
    }
    render();
  } catch (error) {
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
    const result = await send("save-settings", {
      settings: {
        ...state.settings,
        keywords: [...state.settings.keywords, keyword]
      }
    });
    state.settings = result.settings;
    keywordInput.value = "";
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
    keywordInput.focus();
  }
});

cleanButton.addEventListener("click", async () => {
  const confirmed = await waitForDialogChoice(
    wipeDialog,
    wipeConfirm,
    wipeCancel
  );
  if (!confirmed) {
    return;
  }

  setBusy(true, cleanButton);
  setStatus(message("workingStatus"));
  try {
    const result = await send("clean-now");
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

optionsButton.addEventListener("click", async () => {
  await browser.runtime.openOptionsPage();
  window.close();
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
