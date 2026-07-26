import { message } from "./i18n.js";

function phaseMessage(operation) {
  const phaseKeys = {
    starting: "phaseStarting",
    scanning: "phaseScanning",
    matching: "phaseMatching",
    deleting: "phaseDeleting",
    complete: "phaseComplete",
    error: "phaseError",
    cancelled: "phaseCancelled"
  };
  return message(phaseKeys[operation.phase] ?? "phaseStarting");
}

function detailMessage(operation) {
  if (operation.status === "error" || operation.status === "cancelled") {
    return operation.error?.code
      ? message(operation.error.code, operation.error.args)
      : message("operationFailed");
  }

  if (operation.status === "complete") {
    return operation.type === "preview"
      ? message("operationPreviewDone", [
          String(operation.matched),
          String(operation.checked)
        ])
      : message("operationWipeDone", [
          String(operation.deleted),
          String(operation.checked)
        ]);
  }

  if (operation.phase === "deleting") {
    return message("operationDeletingDetail", [
      String(operation.checked),
      String(operation.total ?? operation.matched),
      String(operation.deleted)
    ]);
  }

  if (operation.phase === "matching") {
    return message("operationMatchingDetail", [
      String(operation.checked),
      String(operation.total ?? "—"),
      String(operation.matched)
    ]);
  }

  return message("operationScanningDetail", [String(operation.checked)]);
}

export function renderOperation(elements, operation) {
  if (!operation) {
    elements.panel.hidden = true;
    return false;
  }

  elements.panel.hidden = false;
  elements.panel.dataset.status = operation.status;
  elements.label.textContent = phaseMessage(operation);
  elements.detail.textContent = detailMessage(operation);

  const hasDeterminateProgress =
    operation.status === "running" &&
    Number.isFinite(operation.total) &&
    operation.total > 0 &&
    ["matching", "deleting"].includes(operation.phase);

  if (hasDeterminateProgress) {
    elements.progress.max = operation.total;
    elements.progress.value = Math.min(operation.checked, operation.total);
  } else {
    elements.progress.removeAttribute("value");
  }

  elements.spinner.hidden = operation.status !== "running";
  elements.icon.hidden = operation.status === "running";
  elements.icon.textContent = operation.status === "error" ? "!" : "✓";
  if (elements.cancel) {
    elements.cancel.hidden = operation.status !== "running";
  }

  return operation.status === "running";
}

export function waitForDialogChoice(dialog, confirmButton, cancelButton) {
  return new Promise((resolve) => {
    function finish(value) {
      confirmButton.removeEventListener("click", confirmChoice);
      cancelButton.removeEventListener("click", cancelChoice);
      dialog.removeEventListener("cancel", cancelEvent);
      dialog.close();
      resolve(value);
    }

    function confirmChoice() {
      finish(true);
    }

    function cancelChoice() {
      finish(false);
    }

    function cancelEvent(event) {
      event.preventDefault();
      finish(false);
    }

    confirmButton.addEventListener("click", confirmChoice);
    cancelButton.addEventListener("click", cancelChoice);
    dialog.addEventListener("cancel", cancelEvent);
    dialog.showModal();
    cancelButton.focus();
  });
}
