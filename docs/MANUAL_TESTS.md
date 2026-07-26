# Manual test plan

Use a fresh Firefox profile and disposable history. Deletion cannot be undone,
and deleting one URL removes all recorded visits to that URL.

## Automated preparation

1. Run `pnpm install --frozen-lockfile`.
2. Run `pnpm verify` and `pnpm screenshots:amo`.
3. Confirm the weekly compatibility workflow passes Firefox 140 and latest.
4. Start the add-on with `pnpm dev:local`.

## Safety invariants

1. Save a new rule and verify existing matching history remains unchanged.
2. Import settings and verify existing history remains unchanged.
3. Disable and re-enable automation; neither action may scan existing history.
4. Enter a one-character keyword and verify it is rejected.
5. Enter a broad keyword such as `com` and verify the broad-rule warning.
6. Start **Wipe now**, verify a preview runs first, then cancel the dialog.
7. Change a rule after previewing and verify the stale wipe is rejected.
8. Confirm the wipe dialog states the match count and all-visits behavior.
9. Start a long preview or wipe, cancel it, and verify the UI remains responsive.
10. Restart Firefox during an operation and verify the stale operation is
    reported rather than silently resumed.

## Matching

1. Test URL-only, title-only, and combined matching.
2. Test `Secret` against `secret` in both case modes.
3. Test `private file` against `private%20file`.
4. Test substring, whole-word, and exact matching.
5. Test complete URL, domain-only, and path/query URL scopes.
6. Add an exception and confirm it protects an otherwise matching URL.
7. Verify a title update can delete an entry that did not match on first visit.
8. Verify an already absent URL is not counted as deleted twice.

## Existing-history flow

1. Create several matching and non-matching disposable entries.
2. Run preview and confirm no history was deleted.
3. Compare the displayed checked and matched counts with the test data.
4. Confirm a low, medium, or high risk label appears as appropriate.
5. Confirm **Wipe now** and verify only matching, non-excepted URLs disappear.
6. Confirm counters and completion status update without freezing the page.

## Import, export, and privacy

1. Export, inspect, and re-import settings.
2. Verify an invalid JSON file and a file larger than 1 MB are rejected.
3. Confirm the export is plain text and warns through documentation that rules
   may be sensitive.
4. Use Firefox Network Monitor to confirm the add-on sends no requests.
5. Inspect the ZIP: no secrets, tests, `node_modules`, or source maps.
6. Inspect `about:addons`: only history and storage permissions are present.

## UI, accessibility, and compatibility

- Test popup and settings at 100% and 200% zoom.
- Test settings at 320 px, 768 px, and desktop width.
- Test light and dark color schemes.
- Verify keyboard order, Escape behavior, focus indicators, dialog focus, and
  Space-key operation for switches.
- Test EN, DE, FR, IT, NL, and TR interfaces.
- Test Firefox Desktop 140 and current stable.
- Test Firefox for Android 142 and current stable on a phone-sized viewport and
  on a real device or emulator before each AMO release.
