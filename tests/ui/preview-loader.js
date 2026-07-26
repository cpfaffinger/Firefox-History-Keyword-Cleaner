const surface = new URLSearchParams(location.search).get("surface") === "popup"
  ? "popup"
  : "options";

const [template, messages] = await Promise.all([
  fetch(`/src/${surface}/${surface}.html`).then((response) => response.text()),
  fetch("/src/_locales/en/messages.json").then((response) => response.json())
]);

const listeners = [];
const demoMatches = 642;
const previewState = {
  settings: {
    enabled: true,
    keywords: ["example.com", "private project", "/sensitive/"],
    exceptions: ["trusted.example.com"],
    matchUrl: true,
    matchTitle: true,
    caseSensitive: false,
    matchMode: "contains",
    urlScope: "any",
    cleanOnStartup: false
  },
  stats: {
    lastRunAt: new Date().toISOString(),
    lastDeleted: 4,
    totalDeleted: 137,
    lastError: null
  },
  version: "0.1.1",
  operation: null
};

function localize(key, substitutions = []) {
  const entry = messages[key];
  if (!entry) {
    return "";
  }

  let result = entry.message;
  for (const [name, placeholder] of Object.entries(entry.placeholders ?? {})) {
    const index = Number(placeholder.content.slice(1)) - 1;
    result = result.replaceAll(`$${name.toUpperCase()}$`, substitutions[index]);
  }
  return result;
}

async function delay(duration) {
  await new Promise((resolve) => setTimeout(resolve, duration));
}

async function emitOperation(patch) {
  previewState.operation = {
    ...previewState.operation,
    ...patch
  };
  for (const listener of listeners) {
    await listener({
      target: "history-keyword-cleaner-ui",
      event: "operation-progress",
      operation: { ...previewState.operation }
    });
  }
}

async function simulateOperation(type) {
  previewState.operation = {
    id: String(Date.now()),
    type,
    reason: type,
    status: "running",
    phase: "starting",
    checked: 0,
    total: null,
    matched: 0,
    deleted: 0,
    failed: 0
  };
  await emitOperation({});
  await delay(250);
  await emitOperation({ phase: "scanning", checked: 842 });
  await delay(300);
  await emitOperation({
    phase: "matching",
    checked: 842,
    total: 1240,
    matched: demoMatches
  });
  await delay(300);

  if (type !== "preview") {
    await emitOperation({
      phase: "deleting",
      checked: 7,
      total: demoMatches,
      matched: demoMatches,
      deleted: 7
    });
    await delay(300);
  }

  const result = {
    checked: 1240,
    matched: demoMatches,
    deleted: type === "preview" ? 0 : demoMatches,
    failures: [],
    risk: {
      level: "high",
      ratio: demoMatches / 1240,
      reasons: [{ code: "highMatchRatio", ratio: demoMatches / 1240 }]
    },
    previewId: previewState.operation.id,
    samples:
      type === "preview"
        ? [
            {
              title: "Example Domain",
              url: "https://example.com/private-project",
              keyword: "example.com"
            }
          ]
        : []
  };
  await emitOperation({
    status: "complete",
    phase: "complete",
    checked: result.checked,
    total: result.checked,
    matched: result.matched,
    deleted: result.deleted
  });
  return result;
}

globalThis.browser = {
  i18n: {
    getMessage: localize,
    getUILanguage() {
      return "en-US";
    }
  },
  runtime: {
    getManifest() {
      return { version: previewState.version };
    },
    onMessage: {
      addListener(listener) {
        listeners.push(listener);
      }
    },
    async sendMessage(message) {
      if (message.action === "get-state") {
        return { ok: true, value: structuredClone(previewState) };
      }
      if (message.action === "save-settings") {
        previewState.settings = structuredClone(message.settings);
        return {
          ok: true,
          value: { settings: previewState.settings }
        };
      }
      if (message.action === "preview") {
        return { ok: true, value: await simulateOperation("preview") };
      }
      if (message.action === "clean-now") {
        const result = await simulateOperation("wipe");
        previewState.stats.lastDeleted = result.deleted;
        previewState.stats.totalDeleted += result.deleted;
        previewState.stats.lastRunAt = new Date().toISOString();
        return { ok: true, value: result };
      }
      if (message.action === "cancel-operation") {
        return { ok: true, value: { cancelled: true } };
      }
      return {
        ok: false,
        error: { code: "unknownAction", args: [] }
      };
    }
  }
};

const transformedTemplate = template
  .replaceAll('href="../', 'href="/src/')
  .replaceAll('src="../', 'src="/src/')
  .replace(
    `href="${surface}.css"`,
    `href="/src/${surface}/${surface}.css"`
  )
  .replace(
    `src="${surface}-entry.js"`,
    `src="/src/${surface}/${surface}-entry.js"`
  );

document.open();
document.write(transformedTemplate);
document.close();
