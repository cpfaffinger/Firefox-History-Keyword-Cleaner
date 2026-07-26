import assert from "node:assert/strict";
import test from "node:test";

import { createBrowserMock } from "./helpers/browser-mock.js";

test("background entry registers the controller immediately", async () => {
  const mock = createBrowserMock();
  globalThis.browser = mock.browserApi;
  await import(`../src/background.js?test=${Date.now()}`);
  assert.equal(mock.events.message.listeners.length, 1);
  delete globalThis.browser;
});
