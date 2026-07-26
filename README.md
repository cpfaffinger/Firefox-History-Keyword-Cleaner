# History Keyword Cleaner

[![Get the add-on for Firefox](https://img.shields.io/badge/Firefox-Get_the_Add--on-FF7139?logo=firefoxbrowser&logoColor=white)](https://addons.mozilla.org/de/firefox/addon/history-keyword-sanitizer/)
[![CI, lint, and package](https://github.com/cpfaffinger/Firefox-History-Keyword-Cleaner/actions/workflows/ci.yml/badge.svg)](https://github.com/cpfaffinger/Firefox-History-Keyword-Cleaner/actions/workflows/ci.yml)
[![Line coverage: 100%](https://img.shields.io/badge/line_coverage-100%25-brightgreen.svg)](#quality-and-packaging)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A privacy-first Firefox extension that automatically removes history entries
when their URL or page title contains one of your locally defined keywords.

The product and brand name is **History Keyword Cleaner** in every supported
language.

## Install

[Install History Keyword Cleaner from Firefox Add-ons](https://addons.mozilla.org/de/firefox/addon/history-keyword-sanitizer/).

The extension targets Firefox Desktop 140+ and Firefox for Android 142+. Local
development and verification use Firefox 153.0.

## Features

- Literal keyword matching in URLs, decoded URLs, and page titles.
- Case-insensitive matching by default, with an optional case-sensitive mode.
- Immediate cleanup through `history.onVisited` and
  `history.onTitleChanged`.
- Optional full cleanup at Firefox startup and after rule changes.
- Safe preview before deleting existing history.
- Manual **Wipe now** flow with a non-blocking in-app confirmation.
- Live phases, spinner, progress bar, and counters for longer operations.
- Settings import and export as JSON.
- English by default, plus German, French, Italian, Dutch, and Turkish.
- No telemetry, accounts, ads, network requests, host permissions, or content
  scripts.

Keywords, settings, and aggregate usage statistics are stored only in
`browser.storage.local`. The extension deliberately does not use
`storage.sync`.

## Permissions and privacy

The extension requests only:

- `history` to search for and delete matching history entries and receive
  visit/title events.
- `storage` to save keywords, options, and local aggregate counters.

The manifest declares Mozilla's required data-collection permission as
`required: ["none"]`. See [PRIVACY.md](PRIVACY.md) and
[SECURITY.md](SECURITY.md).

## Local development

Requirements: Node.js 22+, pnpm, and a current Firefox installation.

```powershell
pnpm install
pnpm dev:local
```

The Windows-specific command uses:

```text
C:\Program Files\Mozilla Firefox\firefox.exe
```

The platform-independent alternative is:

```sh
pnpm dev
```

Firefox starts with a temporary development profile. You can also open
`about:debugging`, select **This Firefox**, choose **Load Temporary Add-on**,
and select `src/manifest.json`.

## Quality and packaging

```sh
pnpm test:coverage
pnpm lint
pnpm build
```

Or run the complete verification chain:

```sh
pnpm verify
```

The test command enforces 100% line coverage. Mozilla's
[`web-ext`](https://github.com/mozilla/web-ext/) and
[`addons-linter`](https://github.com/mozilla/addons-linter/) both run with
warnings treated as errors. The exact ZIP generated for a release is linted a
second time before publication.

Unsigned packages are written to `artifacts/`. Regular Firefox releases only
install Mozilla-signed XPI files permanently.

## CI releases and automatic versions

The workflow in [`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs
tests, the coverage gate, safety checks, both Mozilla linters, and packaging.

Every successful commit or merge on `main`:

1. receives a monotonically increasing binary version in the form
   `0.1.<GitHub run number>`;
2. creates a permanent GitHub release named `main-<commit SHA>`;
3. attaches the verified unsigned ZIP as a release asset; and
4. keeps the same build as a GitHub Actions artifact for 90 days.

The generated version is applied only inside the CI build workspace. This
avoids automated version commits and infinite workflow loops while ensuring
that every `main` binary has a version greater than the previous one.

Version tags such as `v0.2.0` retain the explicit version stored in
`package.json` and `src/manifest.json`:

```sh
git tag v0.2.0
git push origin v0.2.0
```

## Project structure

```text
src/
  background.js          Firefox events, messages, and orchestration
  lib/                   tested matching, settings, and history scan logic
  popup/                 quick rule entry and manual cleanup
  options/               full settings, preview, import, and export UI
  icons/                 packaged extension icon and third-party notice
  _locales/              EN, DE, FR, IT, NL, and TR translations
tests/                   Node unit, localization, manifest, and UI tests
amo/                     AMO listing metadata and reviewer notes
docs/                    product, release, and manual test documentation
tools/                   project and CI build validation
```

Everything shipped in `src/` is readable source code. There is no
transpilation, minification, obfuscation, or remotely loaded runtime
dependency.

## Technical design

History scans split large time ranges so the extension is not limited to the
default result count of `history.search()`. Matching and deletion run in
cooperative chunks, and URL deletion uses bounded concurrency. Long-running
work yields back to Firefox between chunks so the extension UI remains
responsive.

Firefox runs the Manifest V3 background code as a non-persistent event page
through `background.scripts`.

## Publishing on AMO

The full checklist is in [docs/AMO_RELEASE.md](docs/AMO_RELEASE.md). The
published Firefox product page is:

<https://addons.mozilla.org/de/firefox/addon/history-keyword-sanitizer/>

## Icon attribution

The packaged eraser glyph is adapted from
[Tabler Icons](https://github.com/tabler/tabler-icons), which is available
under the MIT License. The complete notice ships with the extension in
[`src/icons/LICENSE.md`](src/icons/LICENSE.md).

## License

History Keyword Cleaner is available under the [MIT License](LICENSE).
