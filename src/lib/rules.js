function normalizeForMatch(value, caseSensitive) {
  const normalized = String(value ?? "").normalize("NFKC");
  return caseSensitive ? normalized : normalized.toLowerCase();
}

function decodePercentRuns(value) {
  return String(value ?? "").replace(/(?:%[0-9a-f]{2})+/giu, (encoded) => {
    try {
      return decodeURIComponent(encoded);
    } catch {
      return encoded;
    }
  });
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function matchesMode(haystack, needle, mode) {
  if (mode === "exact") {
    return haystack === needle;
  }
  if (mode === "word") {
    return new RegExp(
      `(?:^|[^\\p{L}\\p{N}_])${escapeRegExp(needle)}(?=$|[^\\p{L}\\p{N}_])`,
      "u"
    ).test(haystack);
  }
  return haystack.includes(needle);
}

function urlValues(url, scope) {
  const literal = String(url ?? "");
  try {
    const parsed = new URL(literal);
    if (scope === "domain") {
      return [parsed.hostname];
    }
    if (scope === "path") {
      return [
        `${parsed.pathname}${parsed.search}${parsed.hash}`,
        decodePercentRuns(`${parsed.pathname}${parsed.search}${parsed.hash}`)
      ];
    }
  } catch {
    return [literal, decodePercentRuns(literal)];
  }
  return [literal, decodePercentRuns(literal)];
}

function candidateValues(item, settings) {
  const values = [];
  if (settings.matchUrl) {
    values.push(...urlValues(item?.url, settings.urlScope ?? "any"));
  }
  if (settings.matchTitle) {
    values.push(String(item?.title ?? ""));
  }
  return [...new Set(values)];
}

export function compileRules(settings) {
  const normalizedHaystack = (value) =>
    normalizeForMatch(value, settings.caseSensitive);
  return {
    settings,
    needles: settings.keywords.map((original) => ({
      original,
      value: normalizeForMatch(original, settings.caseSensitive)
    })),
    exceptions: (settings.exceptions ?? []).map((value) =>
      normalizeForMatch(value, settings.caseSensitive)
    ),
    normalizeHaystack: normalizedHaystack
  };
}

export function findMatchingKeyword(item, settingsOrCompiled) {
  const settings = settingsOrCompiled?.settings ?? settingsOrCompiled;
  if (
    !settings?.enabled ||
    !Array.isArray(settings.keywords) ||
    settings.keywords.length === 0
  ) {
    return null;
  }

  const compiled = settingsOrCompiled?.needles
    ? settingsOrCompiled
    : compileRules(settings);
  const normalizedHaystacks = candidateValues(item, settings).map(
    compiled.normalizeHaystack
  );

  if (
    compiled.exceptions.some((exception) =>
      normalizedHaystacks.some((haystack) => haystack.includes(exception))
    )
  ) {
    return null;
  }

  for (const needle of compiled.needles) {
    if (
      needle.value &&
      normalizedHaystacks.some((haystack) =>
        matchesMode(haystack, needle.value, settings.matchMode ?? "contains")
      )
    ) {
      return needle.original;
    }
  }

  return null;
}

export function collectMatches(items, settings) {
  const matches = [];
  const compiled = settings?.needles ? settings : compileRules(settings);

  for (const item of items) {
    const keyword = findMatchingKeyword(item, compiled);
    if (keyword) {
      matches.push({ item, keyword });
    }
  }

  return matches;
}

export function analyzeRuleRisk(settings, preview = null) {
  const broadKeywords = settings.keywords.filter((keyword) => {
    const normalized = normalizeForMatch(keyword, false);
    return (
      normalized.length <= 3 ||
      ["http", "https", "www", "com", "net", "org", "/"].includes(normalized)
    );
  });
  const ratio =
    preview?.checked > 0 ? preview.matched / preview.checked : 0;
  const reasons = [];

  if (broadKeywords.length > 0) {
    reasons.push({
      code: "broadKeywords",
      values: broadKeywords.slice(0, 5)
    });
  }
  if (ratio >= 0.5) {
    reasons.push({ code: "highMatchRatio", ratio });
  } else if (ratio >= 0.2) {
    reasons.push({ code: "mediumMatchRatio", ratio });
  }

  return {
    level:
      broadKeywords.length > 0 || ratio >= 0.5
        ? "high"
        : ratio >= 0.2
          ? "medium"
          : "low",
    ratio,
    reasons
  };
}
