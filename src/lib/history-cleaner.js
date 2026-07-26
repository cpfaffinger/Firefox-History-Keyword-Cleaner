import { collectMatches } from "./rules.js";

const DEFAULT_BATCH_SIZE = 2000;
const FALLBACK_BATCH_SIZE = 1_000_000;
const DEFAULT_DELETE_CONCURRENCY = 8;
const DEFAULT_MATCH_CHUNK_SIZE = 500;

async function yieldToEventLoop() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

export async function queryAllHistory(historyApi, options = {}) {
  const {
    batchSize = DEFAULT_BATCH_SIZE,
    startTime = 0,
    endTime = Date.now() + 1
  } = options;
  const itemsByUrl = new Map();

  async function queryRange(rangeStart, rangeEnd, depth = 0) {
    const query = {
      text: "",
      startTime: rangeStart,
      endTime: rangeEnd,
      maxResults: batchSize
    };
    let items = await historyApi.search(query);

    if (
      items.length >= batchSize &&
      rangeEnd - rangeStart <= 1
    ) {
      items = await historyApi.search({
        ...query,
        maxResults: FALLBACK_BATCH_SIZE
      });
    } else if (items.length >= batchSize && depth < 64) {
      const midpoint = Math.floor((rangeStart + rangeEnd) / 2);
      if (midpoint > rangeStart && midpoint < rangeEnd) {
        await queryRange(midpoint, rangeEnd, depth + 1);
        await queryRange(rangeStart, midpoint, depth + 1);
        return;
      }
    }

    for (const item of items) {
      if (item?.url) {
        const existing = itemsByUrl.get(item.url);
        if (
          !existing ||
          Number(item.lastVisitTime ?? 0) >
            Number(existing.lastVisitTime ?? 0)
        ) {
          itemsByUrl.set(item.url, item);
        }
      }
    }

    await options.onProgress?.({
      phase: "scanning",
      checked: itemsByUrl.size
    });
    await yieldToEventLoop();
  }

  await queryRange(startTime, endTime);
  return [...itemsByUrl.values()].sort(
    (left, right) =>
      Number(right.lastVisitTime ?? 0) - Number(left.lastVisitTime ?? 0)
  );
}

async function runWithConcurrency(values, limit, worker) {
  let nextIndex = 0;

  async function consume() {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      await worker(values[index], index);
    }
  }

  const workerCount = Math.min(limit, values.length);
  await Promise.all(Array.from({ length: workerCount }, consume));
}

async function collectMatchesCooperatively(
  items,
  settings,
  {
    chunkSize = DEFAULT_MATCH_CHUNK_SIZE,
    onProgress
  } = {}
) {
  const matches = [];

  for (let index = 0; index < items.length; index += chunkSize) {
    const chunk = items.slice(index, index + chunkSize);
    matches.push(...collectMatches(chunk, settings));
    await onProgress?.({
      phase: "matching",
      checked: Math.min(index + chunk.length, items.length),
      total: items.length,
      matched: matches.length
    });
    await yieldToEventLoop();
  }

  return matches;
}

export async function deleteMatches(
  historyApi,
  matches,
  {
    concurrency = DEFAULT_DELETE_CONCURRENCY,
    onProgress
  } = {}
) {
  const failures = [];
  let deleted = 0;
  let processed = 0;

  await runWithConcurrency(matches, concurrency, async ({ item }) => {
    try {
      await historyApi.deleteUrl({ url: item.url });
      deleted += 1;
    } catch (error) {
      failures.push({
        url: item.url,
        message: error instanceof Error ? error.message : String(error)
      });
    } finally {
      processed += 1;
      await onProgress?.({
        phase: "deleting",
        checked: processed,
        total: matches.length,
        matched: matches.length,
        deleted,
        failed: failures.length
      });
    }
  });

  return { deleted, failures };
}

export async function previewHistoryMatches(historyApi, settings, options) {
  const items = await queryAllHistory(historyApi, options);
  const matches = await collectMatchesCooperatively(items, settings, options);

  return {
    checked: items.length,
    matched: matches.length,
    samples: matches.slice(0, 25).map(({ item, keyword }) => ({
      url: item.url,
      title: item.title || "",
      keyword
    }))
  };
}

export async function cleanHistory(historyApi, settings, options) {
  const items = await queryAllHistory(historyApi, options);
  const matches = await collectMatchesCooperatively(items, settings, options);
  const deletion = await deleteMatches(historyApi, matches, options);

  return {
    checked: items.length,
    matched: matches.length,
    deleted: deletion.deleted,
    failures: deletion.failures
  };
}
