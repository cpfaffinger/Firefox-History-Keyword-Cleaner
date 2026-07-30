# AMO reviewer notes

No account, network service, payment, or test credential is required.

## Fast functional test

1. Install in a fresh Firefox profile; the settings page opens once.
2. Add `history-cleaner-test` and save.
3. Visit `https://example.com/history-cleaner-test`.
4. Open Firefox history and verify the URL is absent.
5. Disable automation, visit it again, and verify it remains.
6. Re-enable automation. Saving must not delete the existing entry.
7. Choose **Wipe now**. The add-on first previews matches, then displays the
   number of matching URLs and asks for explicit confirmation.
8. Cancel and verify nothing is deleted; repeat and confirm to delete it.
9. Preview from settings and verify preview itself never deletes.
10. Export the debug log and verify it contains capabilities and event metadata
    but no rule text, exceptions, URLs, or page titles.

The title path is handled through `history.onTitleChanged`, because Firefox can
record a visit before its final page title is available.

## Firefox for Android

Firefox for Android does not expose the WebExtensions `history` namespace. The
extension detects this before registering history listeners. Its popup and
settings remain usable for local rule management and diagnostic export, while
history-dependent controls are disabled with an explicit localized message.
It does not fall back to `browsingData.removeHistory()`, because that API cannot
select entries by URL, title, or keyword and could remove unrelated history.

## Permission justification

- `history`: search and delete matching history URLs and receive visit/title
  events;
- `storage`: store local rules, operation state, aggregate counters, and a
  bounded sanitized diagnostic event log.

There are no host permissions or content scripts. The extension performs no
network request and collects or transmits no data.

## Build

`pnpm verify` tests, statically validates, lints, and builds from `src/`.
Shipping files are readable source with no compilation, bundling,
minification, generated runtime code, or remote dependency.
