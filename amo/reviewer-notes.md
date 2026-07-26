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

The title path is handled through `history.onTitleChanged`, because Firefox can
record a visit before its final page title is available.

## Permission justification

- `history`: search and delete matching history URLs and receive visit/title
  events;
- `storage`: store local rules, operation state, and aggregate counters.

There are no host permissions or content scripts. The extension performs no
network request and collects or transmits no data.

## Build

`pnpm verify` tests, statically validates, lints, and builds from `src/`.
Shipping files are readable source with no compilation, bundling,
minification, generated runtime code, or remote dependency.
