export function createEvent() {
  const listeners = [];
  return {
    listeners,
    addListener(listener) {
      listeners.push(listener);
    }
  };
}

export function createStorageArea(initial = {}) {
  const values = structuredClone(initial);
  return {
    values,
    async get(key) {
      if (typeof key === "string") {
        return { [key]: structuredClone(values[key]) };
      }
      return structuredClone(values);
    },
    async set(update) {
      Object.assign(values, structuredClone(update));
    }
  };
}

export function createBrowserMock({
  historyItems = [],
  messageFailure = false,
  deleteFailures = new Set()
} = {}) {
  const local = createStorageArea();
  const session = createStorageArea();
  const events = {
    installed: createEvent(),
    startup: createEvent(),
    visited: createEvent(),
    titleChanged: createEvent(),
    message: createEvent()
  };
  const remainingUrls = new Set(historyItems.map(({ url }) => url));
  const deletedUrls = [];
  let optionsOpened = 0;

  const browserApi = {
    storage: { local, session },
    runtime: {
      onInstalled: events.installed,
      onStartup: events.startup,
      onMessage: events.message,
      getManifest: () => ({ version: "9.8.7" }),
      async openOptionsPage() {
        optionsOpened += 1;
      },
      async sendMessage() {
        if (messageFailure) {
          throw new Error("no UI receiver");
        }
      }
    },
    history: {
      onVisited: events.visited,
      onTitleChanged: events.titleChanged,
      async search({ startTime, endTime, maxResults }) {
        return historyItems
          .filter(
            (item) =>
              remainingUrls.has(item.url) &&
              item.lastVisitTime >= startTime &&
              item.lastVisitTime < endTime
          )
          .sort((left, right) => right.lastVisitTime - left.lastVisitTime)
          .slice(0, maxResults);
      },
      async getVisits({ url }) {
        return remainingUrls.has(url) ? [{ id: `${url}-visit` }] : [];
      },
      async deleteUrl({ url }) {
        if (deleteFailures.has(url)) {
          throw new Error("simulated deletion error");
        }
        remainingUrls.delete(url);
        deletedUrls.push(url);
      }
    }
  };

  return {
    browserApi,
    deletedUrls,
    events,
    local,
    optionsOpened: () => optionsOpened,
    remainingUrls,
    session
  };
}
