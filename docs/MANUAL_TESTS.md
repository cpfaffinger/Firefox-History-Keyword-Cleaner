# Manual test plan

Mozilla does not require a specific unit-test coverage percentage. Reviewers do
perform basic functional tests and need clear test instructions. This plan
complements the automated test suite.

## Preparation

1. Run `pnpm verify`.
2. Start `pnpm dev:local`.
3. Open the add-on settings in the temporary Firefox profile.
4. Do not use valuable real-world history data for deletion tests.

## Core scenarios

1. Add the keyword `history-cleaner-test` and enable URL and title matching.
2. Open `https://example.com/history-cleaner-test`.
3. Open `about:history` and confirm that the URL is absent.
4. Open a local test page whose URL does not match but whose title contains
   `history-cleaner-test`; confirm that the title event deletes the entry.
5. Disable automatic cleaning, visit a matching page, and confirm that it
   remains in history.
6. Re-enable automatic cleaning and run **Wipe now** for existing history.
7. Test `Secret` against `secret` in both case-sensitivity modes.
8. Test a decoded keyword such as `private file` against `private%20file`.
9. Run a preview and confirm that it does not delete any entry.
10. Export settings, change the keywords, and import the export again.
11. Restart Firefox and verify startup cleanup.
12. Open **Wipe now**, cancel the dialog with Escape, and confirm that nothing
    is deleted.
13. Confirm **Wipe now** again and verify that the scan, match, and delete
    phases show a spinner and counters without freezing the page.

## UI and accessibility

- Test the popup at 100% and 200% zoom.
- Test the settings page at 320 px, 768 px, and desktop width.
- Verify keyboard order, visible focus indicators, and Space-key operation for
  switches.
- Test light and dark mode.
- Test Firefox with the English, German, French, Italian, Dutch, and Turkish
  locales.

## Privacy

- Open Firefox Network Monitor and confirm that the add-on sends no requests.
- Inspect the package: it must contain no secrets, source maps, test files, or
  `node_modules`.
- Inspect `about:addons`: only the history and storage permissions should be
  present.
