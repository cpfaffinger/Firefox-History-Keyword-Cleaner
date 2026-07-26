export const MAX_KEYWORDS = 500;
export const MAX_KEYWORD_LENGTH = 256;
export const MIN_KEYWORD_LENGTH = 2;
export const MATCH_MODES = Object.freeze(["contains", "word", "exact"]);
export const URL_SCOPES = Object.freeze(["any", "domain", "path"]);

export const DEFAULT_SETTINGS = Object.freeze({
  enabled: true,
  keywords: [],
  exceptions: [],
  matchUrl: true,
  matchTitle: true,
  caseSensitive: false,
  matchMode: "contains",
  urlScope: "any",
  cleanOnStartup: false
});

export const DEFAULT_STATS = Object.freeze({
  lastRunAt: null,
  lastRunReason: null,
  lastChecked: 0,
  lastDeleted: 0,
  totalDeleted: 0,
  lastError: null
});

function normalizeProblem(value) {
  if (typeof value === "string") {
    return { code: "rawError", args: [value] };
  }
  if (!value || typeof value.code !== "string") {
    return null;
  }
  return {
    code: value.code,
    args: Array.isArray(value.args)
      ? value.args.map((argument) => String(argument))
      : []
  };
}

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
  const matchMode = MATCH_MODES.includes(value.matchMode)
    ? value.matchMode
    : DEFAULT_SETTINGS.matchMode;
  const urlScope = URL_SCOPES.includes(value.urlScope)
    ? value.urlScope
    : DEFAULT_SETTINGS.urlScope;

  return {
    enabled: value.enabled !== false,
    keywords: normalizeKeywords(value.keywords, caseSensitive),
    exceptions: normalizeKeywords(value.exceptions, caseSensitive),
    matchUrl: value.matchUrl !== false,
    matchTitle: value.matchTitle !== false,
    caseSensitive,
    matchMode,
    urlScope,
    cleanOnStartup: value.cleanOnStartup === true
  };
}

export function validateSettings(value = {}) {
  const settings = normalizeSettings(value);
  const errors = [];

  if (!settings.matchUrl && !settings.matchTitle) {
    errors.push({ code: "matchFieldRequired" });
  }

  const shortKeywords = settings.keywords.filter(
    (keyword) => keyword.length < MIN_KEYWORD_LENGTH
  );
  if (shortKeywords.length > 0) {
    errors.push({
      code: "keywordTooShort",
      args: [String(MIN_KEYWORD_LENGTH)]
    });
  }

  if (Array.isArray(value.keywords) && value.keywords.length > MAX_KEYWORDS) {
    errors.push({ code: "tooManyKeywords", args: [String(MAX_KEYWORDS)] });
  }

  const overlongKeywords = Array.isArray(value.keywords)
    ? value.keywords.filter(
        (keyword) =>
          typeof keyword === "string" && keyword.trim().length > MAX_KEYWORD_LENGTH
      )
    : [];
  if (overlongKeywords.length > 0) {
    errors.push({
      code: "keywordTooLong",
      args: [String(MAX_KEYWORD_LENGTH)]
    });
  }

  return { settings, errors };
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
    lastError: normalizeProblem(value.lastError)
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
