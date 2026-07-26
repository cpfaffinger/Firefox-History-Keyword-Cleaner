export const MAX_KEYWORDS = 500;
export const MAX_KEYWORD_LENGTH = 256;

export const DEFAULT_SETTINGS = Object.freeze({
  enabled: true,
  keywords: [],
  matchUrl: true,
  matchTitle: true,
  caseSensitive: false,
  cleanOnStartup: true,
  cleanExistingOnChange: true
});

export const DEFAULT_STATS = Object.freeze({
  lastRunAt: null,
  lastRunReason: null,
  lastChecked: 0,
  lastDeleted: 0,
  totalDeleted: 0,
  lastError: null
});

export function normalizeKeyword(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.normalize("NFKC").trim().slice(0, MAX_KEYWORD_LENGTH);
}

export function normalizeKeywords(values, caseSensitive = false) {
  if (!Array.isArray(values)) {
    return [];
  }

  const result = [];
  const seen = new Set();

  for (const value of values) {
    const keyword = normalizeKeyword(value);
    if (!keyword) {
      continue;
    }

    const identity = caseSensitive ? keyword : keyword.toLowerCase();
    if (seen.has(identity)) {
      continue;
    }

    seen.add(identity);
    result.push(keyword);

    if (result.length === MAX_KEYWORDS) {
      break;
    }
  }

  return result;
}

export function normalizeSettings(value = {}) {
  const caseSensitive = value.caseSensitive === true;

  return {
    enabled: value.enabled !== false,
    keywords: normalizeKeywords(value.keywords, caseSensitive),
    matchUrl: value.matchUrl !== false,
    matchTitle: value.matchTitle !== false,
    caseSensitive,
    cleanOnStartup: value.cleanOnStartup !== false,
    cleanExistingOnChange: value.cleanExistingOnChange !== false
  };
}

export function normalizeStats(value = {}) {
  return {
    lastRunAt:
      typeof value.lastRunAt === "string" ? value.lastRunAt : null,
    lastRunReason:
      typeof value.lastRunReason === "string" ? value.lastRunReason : null,
    lastChecked:
      Number.isSafeInteger(value.lastChecked) && value.lastChecked >= 0
        ? value.lastChecked
        : 0,
    lastDeleted:
      Number.isSafeInteger(value.lastDeleted) && value.lastDeleted >= 0
        ? value.lastDeleted
        : 0,
    totalDeleted:
      Number.isSafeInteger(value.totalDeleted) && value.totalDeleted >= 0
        ? value.totalDeleted
        : 0,
    lastError: typeof value.lastError === "string" ? value.lastError : null
  };
}

export async function loadSettings(storageArea) {
  const stored = await storageArea.get("settings");
  return normalizeSettings(stored.settings);
}

export async function saveSettings(storageArea, value) {
  const settings = normalizeSettings(value);
  await storageArea.set({ settings });
  return settings;
}

export async function loadStats(storageArea) {
  const stored = await storageArea.get("stats");
  return normalizeStats(stored.stats);
}

export async function saveStats(storageArea, value) {
  const stats = normalizeStats(value);
  await storageArea.set({ stats });
  return stats;
}
