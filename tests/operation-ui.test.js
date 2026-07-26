import assert from "node:assert/strict";
import test from "node:test";

import {
  createDom,
  createUiBrowser,
  installUiGlobals,
  clearUiGlobals
} from "./helpers/ui.js";
import {
  renderOperation,
  waitForDialogChoice
} from "../src/ui/operation-ui.js";
import {
  localizeDocument,
  problemMessage
} from "../src/ui/i18n.js";

test("i18n localizes text, placeholders, titles, and structured problems", async () => {
  const dom = await createDom("options/options.html");
  const mock = createUiBrowser(async () => undefined);
  installUiGlobals(dom, mock.browserApi);
  const root = dom.window.document;
  const titled = root.createElement("button");
  titled.dataset.i18nTitle = "cancelButton";
  root.body.append(titled);
  localizeDocument(root);

  assert.equal(root.documentElement.lang, "en-US");
  assert.equal(root.querySelector("#save").textContent, "Save rules");
  assert.equal(titled.title, "Cancel");
  assert.equal(problemMessage(null), "An unexpected add-on error occurred.");
  assert.equal(
    problemMessage({ code: "rawError", args: ["legacy"] }),
    "legacy"
  );
  assert.equal(
    problemMessage({ code: "operationBusy", args: [] }),
    "Another history operation is already running."
  );
  clearUiGlobals();
});

test("operation rendering covers idle, progress, completion, errors, and cancellation", async () => {
  const dom = await createDom("popup/popup.html");
  const mock = createUiBrowser(async () => undefined);
  installUiGlobals(dom, mock.browserApi);
  const root = dom.window.document;
  const elements = {
    panel: root.querySelector("#operation-panel"),
    spinner: root.querySelector("#operation-spinner"),
    icon: root.querySelector("#operation-icon"),
    label: root.querySelector("#operation-label"),
    detail: root.querySelector("#operation-detail"),
    progress: root.querySelector("#operation-progress"),
    cancel: root.querySelector("#cancel-operation")
  };
  assert.equal(renderOperation(elements, null), false);

  assert.equal(
    renderOperation(elements, {
      status: "running",
      phase: "matching",
      checked: 2,
      total: 4,
      matched: 1
    }),
    true
  );
  assert.equal(elements.progress.value, 2);
  assert.equal(elements.cancel.hidden, false);

  renderOperation(elements, {
    status: "running",
    phase: "deleting",
    checked: 1,
    total: 2,
    matched: 2,
    deleted: 1
  });
  renderOperation(elements, {
    status: "running",
    phase: "scanning",
    checked: 3,
    total: null
  });
  assert.equal(elements.progress.hasAttribute("value"), false);

  renderOperation(elements, {
    type: "preview",
    status: "complete",
    phase: "complete",
    checked: 4,
    matched: 1
  });
  renderOperation(elements, {
    type: "wipe",
    status: "complete",
    phase: "complete",
    checked: 4,
    deleted: 1
  });
  renderOperation(elements, {
    status: "error",
    phase: "error",
    checked: 0,
    error: { code: "operationBusy", args: [] }
  });
  assert.equal(elements.icon.textContent, "!");
  renderOperation(elements, {
    status: "cancelled",
    phase: "cancelled",
    checked: 0,
    error: { code: "operationCancelled", args: [] }
  });
  clearUiGlobals();
});

test("non-blocking dialogs resolve for confirm, cancel button, and Escape", async () => {
  const dom = await createDom("popup/popup.html");
  const root = dom.window.document;
  const dialog = root.querySelector("#wipe-dialog");
  const confirm = root.querySelector("#wipe-confirm");
  const cancel = root.querySelector("#wipe-cancel");

  const confirmed = waitForDialogChoice(dialog, confirm, cancel);
  confirm.click();
  assert.equal(await confirmed, true);

  const cancelled = waitForDialogChoice(dialog, confirm, cancel);
  cancel.click();
  assert.equal(await cancelled, false);

  const escaped = waitForDialogChoice(dialog, confirm, cancel);
  dialog.dispatchEvent(
    new dom.window.Event("cancel", { bubbles: false, cancelable: true })
  );
  assert.equal(await escaped, false);
});
