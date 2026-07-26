function normalizeForMatch(value, caseSensitive) {
  const normalized = String(value ?? "").normalize("NFKC");
  return caseSensitive ? normalized : normalized.toLowerCase();
}

function safelyDecodeUrl(url) {
  try {
    return decodeURIComponent(url);
  } catch {
    return url;
  }
}

export function findMatchingKeyword(item, settings) {
  if (
    !settings?.enabled ||
    !Array.isArray(settings.keywords) ||
    settings.keywords.length === 0
  ) {
    return null;
  }

  const haystacks = [];
  if (settings.matchUrl) {
    const url = String(item?.url ?? "");
    haystacks.push(url);
    const decodedUrl = safelyDecodeUrl(url);
    if (decodedUrl !== url) {
      haystacks.push(decodedUrl);
    }
  }

  if (settings.matchTitle) {
    haystacks.push(String(item?.title ?? ""));
  }

  const normalizedHaystacks = haystacks.map((value) =>
    normalizeForMatch(value, settings.caseSensitive)
  );

  for (const keyword of settings.keywords) {
    const needle = normalizeForMatch(keyword, settings.caseSensitive);
    if (
      needle &&
      normalizedHaystacks.some((haystack) => haystack.includes(needle))
    ) {
      return keyword;
    }
  }

  return null;
}

export function collectMatches(items, settings) {
  const matches = [];

  for (const item of items) {
    const keyword = findMatchingKeyword(item, settings);
    if (keyword) {
      matches.push({ item, keyword });
    }
  }

  return matches;
}
