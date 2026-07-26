import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";

const englishMessages = JSON.parse(
  await readFile(
    new URL("../../src/_locales/en/messages.json", import.meta.url),
    "utf8"
  )
);

export async function createDom(relativePath) {
  const html = await readFile(
    new URL(`../../src/${relativePath}`, import.meta.url),
    "utf8"
  );
  const dom = new JSDOM(html, {
    url: `moz-extension://test/${relativePath}`
  });
  const { window } = dom;
  window.HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true;
  };
  window.HTMLDialogElement.prototype.close = function close() {
    this.open = false;
  };
  window.HTMLAnchorElement.prototype.click = function click() {};
  return dom;
}

export function createUiBrowser(handler) {
  const messageListeners = [];
  let optionsOpened = 0;
  return {
    browserApi: {
      i18n: {
        getUILanguage: () => "en-US",
        getMessage(key, substitutions = []) {
          const entry = englishMessages[key];
          if (!entry) {
            return "";
          }
          const values = Array.isArray(substitutions)
            ? substitutions
            : [substitutions];
          let result = entry.message;
          for (const [name, placeholder] of Object.entries(
            entry.placeholders ?? {}
          )) {
            const index = Number(placeholder.content.slice(1)) - 1;
            result = result.replaceAll(
              `$${name.toUpperCase()}$`,
              String(values[index] ?? "")
            );
          }
          return result;
        }
      },
      runtime: {
        onMessage: {
          addListener(listener) {
            messageListeners.push(listener);
          }
        },
        async sendMessage(message) {
          return handler(message);
        },
        async openOptionsPage() {
          optionsOpened += 1;
        }
      }
    },
    messageListeners,
    optionsOpened: () => optionsOpened
  };
}

export async function flushUi() {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

export function installUiGlobals(dom, browserApi) {
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.browser = browserApi;
}

export function clearUiGlobals() {
  delete globalThis.window;
  delete globalThis.document;
  delete globalThis.browser;
}
