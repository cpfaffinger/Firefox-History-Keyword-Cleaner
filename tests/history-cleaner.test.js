import test from "node:test";
import assert from "node:assert/strict";

import {
  cleanHistory,
  deleteMatches,
  previewHistoryMatches,
  queryAllHistory
} from "../src/lib/history-cleaner.js";

function createHistoryApi(items, failingUrls = new Set()) {
  const deletedUrls = [];
  return {
    deletedUrls,
    async search({ startTime, endTime, maxResults }) {
      return items
        .filter(
          (item) =>
            item.lastVisitTime >= startTime && item.lastVisitTime < endTime
        )
        .sort((left, right) => right.lastVisitTime - left.lastVisitTime)
        .slice(0, maxResults);
    },
    async deleteUrl({ url }) {
      if (failingUrls.has(url)) {
        throw new Error("simulated deletion failure");
      }
      deletedUrls.push(url);
    }
  };
}

const settings = {
  enabled: true,
  keywords: ["private"],
  matchUrl: true,
  matchTitle: true,
  caseSensitive: false
};

test("queryAllHistory partitions full result ranges without losing entries", async () => {
  const items = Array.from({ length: 17 }, (_, index) => ({
    url: `https://example.test/${index}`,
    title: `Page ${index}`,
    lastVisitTime: index + 1
  }));
  const historyApi = createHistoryApi(items);

  const result = await queryAllHistory(historyApi, {
    batchSize: 3,
    startTime: 0,
    endTime: 20
  });

  assert.equal(result.length, 17);
  assert.equal(result[0].lastVisitTime, 17);
  assert.equal(result.at(-1).lastVisitTime, 1);
});

test("queryAllHistory deduplicates URLs returned from separate ranges", async () => {
  const historyApi = createHistoryApi([
    { url: "https://same.test", title: "Old", lastVisitTime: 2 },
    { url: "https://same.test", title: "New", lastVisitTime: 8 },
    { url: "https://other.test", title: "Other", lastVisitTime: 5 }
  ]);

  const result = await queryAllHistory(historyApi, {
    batchSize: 2,
    startTime: 0,
    endTime: 10
  });

  assert.equal(result.length, 2);
  assert.equal(result[0].title, "New");
});

test("queryAllHistory retries saturated one-millisecond ranges without truncation", async () => {
  const maxResultsCalls = [];
  const items = [
    { url: "https://one.test", title: "One", lastVisitTime: 0.9 },
    { url: "https://two.test", title: "Two", lastVisitTime: 0.8 }
  ];
  const historyApi = {
    async search({ maxResults }) {
      maxResultsCalls.push(maxResults);
      return items.slice(0, maxResults);
    }
  };

  const result = await queryAllHistory(historyApi, {
    batchSize: 2,
    startTime: 0,
    endTime: 1
  });

  assert.deepEqual(maxResultsCalls, [2, 1_000_000]);
  assert.deepEqual(result, items);
});

test("preview reports matches without deleting history", async () => {
  const historyApi = createHistoryApi([
    {
      url: "https://private.test",
      title: "One",
      lastVisitTime: 10
    },
    {
      url: "https://safe.test",
      title: "Safe",
      lastVisitTime: 9
    }
  ]);

  const result = await previewHistoryMatches(historyApi, settings, {
    startTime: 0,
    endTime: 20
  });

  assert.equal(result.checked, 2);
  assert.equal(result.matched, 1);
  assert.equal(result.samples[0].keyword, "private");
  assert.deepEqual(historyApi.deletedUrls, []);
});

test("cleanHistory deletes every matching URL", async () => {
  const historyApi = createHistoryApi([
    {
      url: "https://example.test/private",
      title: "One",
      lastVisitTime: 10
    },
    {
      url: "https://safe.test",
      title: "Private title",
      lastVisitTime: 9
    },
    {
      url: "https://other.test",
      title: "Other",
      lastVisitTime: 8
    }
  ]);

  const result = await cleanHistory(historyApi, settings, {
    startTime: 0,
    endTime: 20,
    concurrency: 2
  });

  assert.deepEqual(result, {
    checked: 3,
    matched: 2,
    deleted: 2,
    failures: []
  });
  assert.deepEqual(historyApi.deletedUrls.sort(), [
    "https://example.test/private",
    "https://safe.test"
  ]);
});

test("cleanHistory reports cooperative scan, match, and delete progress", async () => {
  const historyApi = createHistoryApi([
    {
      url: "https://example.test/private",
      title: "One",
      lastVisitTime: 10
    },
    {
      url: "https://safe.test",
      title: "Safe",
      lastVisitTime: 9
    }
  ]);
  const progress = [];

  await cleanHistory(historyApi, settings, {
    startTime: 0,
    endTime: 20,
    chunkSize: 1,
    onProgress(update) {
      progress.push(update);
    }
  });

  assert.ok(progress.some(({ phase }) => phase === "scanning"));
  assert.ok(progress.some(({ phase }) => phase === "matching"));
  assert.ok(progress.some(({ phase }) => phase === "deleting"));
  assert.equal(progress.at(-1).deleted, 1);
});

test("deleteMatches isolates individual API failures", async () => {
  const failingUrl = "https://failure.test";
  const historyApi = createHistoryApi([], new Set([failingUrl]));
  const result = await deleteMatches(historyApi, [
    { item: { url: "https://success.test" }, keyword: "x" },
    { item: { url: failingUrl }, keyword: "x" }
  ]);

  assert.equal(result.deleted, 1);
  assert.deepEqual(result.failures, [
    { url: failingUrl, message: "simulated deletion failure" }
  ]);
});

test("history operations cancel cooperatively and reject saturated fallback ranges", async () => {
  await assert.rejects(
    queryAllHistory(
      {
        async search() {
          return [];
        }
      },
      { shouldCancel: () => true }
    ),
    (error) => error.code === "operationCancelled"
  );

  let calls = 0;
  await assert.rejects(
    queryAllHistory(
      {
        async search() {
          calls += 1;
          return calls === 1
            ? [{ url: "one" }, { url: "two" }]
            : { length: 1_000_000 };
        }
      },
      { batchSize: 2, startTime: 0, endTime: 1 }
    ),
    (error) => error.code === "historyRangeSaturated"
  );
});

test("deleteMatches skips URLs that no longer have visits", async () => {
  const deleted = [];
  const result = await deleteMatches(
    {
      async getVisits() {
        return [];
      },
      async deleteUrl({ url }) {
        deleted.push(url);
      }
    },
    [{ item: { url: "https://gone.test" }, keyword: "gone" }]
  );
  assert.equal(result.deleted, 0);
  assert.deepEqual(deleted, []);
});
