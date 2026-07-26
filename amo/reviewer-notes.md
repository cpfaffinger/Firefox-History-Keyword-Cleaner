# AMO reviewer notes

No account, network service, payment, or test credentials are required.

## Fast functional test

1. Install the extension in a fresh Firefox profile.
2. The options page opens on first installation.
3. Add `history-cleaner-test` as a keyword and save.
4. Visit `https://example.com/history-cleaner-test`.
5. Open Firefox history and verify that this URL is absent.
6. Disable automatic cleaning, visit the URL again, and verify that it remains.
7. Re-enable cleaning and use “Clean existing history”; the entry disappears.
8. “Preview matches” lists matches but never deletes them.

The title path is handled separately through `history.onTitleChanged`, because
Firefox normally emits `history.onVisited` before the page title is known.

## Permission justification

- `history`: required to search for and delete matching history entries and to
  receive visit/title events.
- `storage`: stores keywords, local options, and aggregate deletion counts.

There are no host permissions or content scripts. The extension performs no
network requests and collects or transmits no data.

## Build

The package is built with `web-ext build --source-dir src`. The files in `src/`
are already the human-readable shipping source. No compilation, bundling,
minification, generated code, or runtime dependency is involved.
