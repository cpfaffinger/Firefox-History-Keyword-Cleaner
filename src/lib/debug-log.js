const DEBUG_LOG_KEY = "debugLog";
const DEFAULT_MAX_ENTRIES = 200;
const MAX_ARRAY_ITEMS = 25;
const MAX_OBJECT_KEYS = 40;
const MAX_TEXT_LENGTH = 500;
const SENSITIVE_KEY = /(?:url|title|keyword|exception|settings|sample|historyItem)/iu;

function redactText(value) {
  return String(value)
    .replace(/moz-extension:\/\/[^\s"'<>]+/giu, "[extension-url]")
    .replace(/https?:\/\/[^\s"'<>]+/giu, "[url]")
    .slice(0, MAX_TEXT_LENGTH);
}

export function sanitizeDebugValue(value, key = "", depth = 0) {
  if (SENSITIVE_KEY.test(key)) {
    return "[redacted]";
  }
  if (value === null || ["boolean", "number"].includes(typeof value)) {
    return value;
  }
  if (typeof value === "string") {
    return redactText(value);
  }
  if (depth >= 4) {
    return "[truncated]";
  }
  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((entry) => sanitizeDebugValue(entry, "", depth + 1));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .slice(0, MAX_OBJECT_KEYS)
        .map(([entryKey, entryValue]) => [
          entryKey,
          sanitizeDebugValue(entryValue, entryKey, depth + 1)
        ])
    );
  }
  return redactText(value);
}

export function createDebugLog(storageArea, {
  isoNow = () => new Date().toISOString(),
  maxEntries = DEFAULT_MAX_ENTRIES
} = {}) {
  let writeQueue = Promise.resolve();

  function record(event, details = {}, level = "info") {
    const entry = {
      timestamp: isoNow(),
      level: String(level),
      event: String(event),
      details: sanitizeDebugValue(details)
    };
    const write = writeQueue.then(async () => {
      const stored = await storageArea.get(DEBUG_LOG_KEY);
      const entries = Array.isArray(stored[DEBUG_LOG_KEY])
        ? stored[DEBUG_LOG_KEY]
        : [];
      entries.push(entry);
      await storageArea.set({
        [DEBUG_LOG_KEY]: entries.slice(-maxEntries)
      });
    });
    writeQueue = write.catch(() => undefined);
    return writeQueue;
  }

  async function read() {
    await writeQueue;
    try {
      const stored = await storageArea.get(DEBUG_LOG_KEY);
      return Array.isArray(stored[DEBUG_LOG_KEY])
        ? structuredClone(stored[DEBUG_LOG_KEY])
        : [];
    } catch {
      return [];
    }
  }

  return { read, record };
}
