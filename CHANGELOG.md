# Changelog

## Unreleased

- added safe exception rules, match modes, and URL scopes
- made startup cleanup opt-in and removed implicit cleanup after saves/imports
- added preview-bound wipe confirmation with match counts and risk warnings
- serialized background mutations with cooperative cancellation and recovery
- added localized structured errors and visible asynchronous progress
- prevented incomplete million-result history scans from deleting partial data
- expanded unit and UI tests to 100% line coverage over all shipped JavaScript
- added real desktop and mobile AMO screenshots
- added protected, manual tagged AMO submission and weekly Firefox smoke tests
- made tag versions authoritative while retaining automatic `main` build bumps

## 0.1.1 - 2026-07-26

- replaced the local development ID with an AMO-compatible production ID
- increased the version for a new AMO submission

## 0.1.0 - 2026-07-26

- first complete local development version
- URL and page-title matching with locally stored keywords
- real-time, startup, and manual history cleanup
- match preview plus settings import and export
- non-blocking Wipe now dialog with live phases, spinner, and counters
- consistent History Keyword Cleaner product and brand name in every locale
- English, German, French, Italian, Dutch, and Turkish interface
- Manifest V3 with the Firefox 140+ data-collection declaration
- unit tests, package validation, CI, and AMO release preparation
