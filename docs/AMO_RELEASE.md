# Publishing on addons.mozilla.org (AMO)

Last updated: July 26, 2026.

## Completed requirements

- Manifest V3 with the permanent ID expected by the existing AMO listing:
  `history-keyword-cleaner@local.addons`
- `strict_min_version` 140 for desktop and 142 for Android
- required `data_collection_permissions.required: ["none"]` declaration
- only necessary permissions: `history` and `storage`
- no host permissions, remote scripts, telemetry, or obfuscation
- readable original source code that directly matches the package contents
- complete EN, DE, FR, IT, NL, and TR localization
- unit, manifest, and static security tests
- `web-ext lint --warnings-as-errors`
- reproducible build with a pinned `web-ext` version
- reviewer instructions and AMO listing copy
- three AMO screenshots in the recommended 1280 × 800 format
- privacy and security documentation

## Before the next public update

The permanent add-on ID is `history-keyword-cleaner@local.addons`. Despite its
former development-oriented name, the ID must never be changed: the first AMO
upload registered it as the listing's permanent identity. Every update to the
existing listing must use the same ID.

1. Add a responsible support and security address to the documentation and AMO
   metadata.
2. Upload the prepared files from `amo/screenshots/` to the AMO listing.
3. Complete all tests in `docs/MANUAL_TESTS.md` with a fresh Firefox profile.
4. For a versioned tag, update the version in `package.json`,
   `src/manifest.json`, and `CHANGELOG.md` together. Regular `main` builds
   receive a monotonically increasing CI version automatically.
5. Run `pnpm install --frozen-lockfile && pnpm verify`.
6. Inspect the contents of `artifacts/*.zip`.

## Submission

Create API credentials in the AMO Developer Hub and provide them only through
environment variables:

```sh
web-ext sign \
  --source-dir src \
  --channel listed \
  --amo-metadata amo/metadata.json \
  --api-key "$AMO_JWT_ISSUER" \
  --api-secret "$AMO_JWT_SECRET"
```

Alternatively, upload the ZIP produced by `pnpm build` through the AMO
Developer Hub. Never commit secrets to files or Git.

## What Mozilla requires

Mozilla does not prescribe a minimum unit-test coverage percentage. It requires
functional and reviewable code, basic functional testability, reviewer test
instructions, only necessary permissions, no remote code, and a correct data
collection declaration. A privacy policy is mandatory when data is
transmitted; this add-on transmits nothing but still provides a transparent
policy.

If the project introduced minification, transpilation, or other generated code,
the human-readable source and reproducible build instructions would also need
to be submitted. The current package does not require a separate source-code
submission because `src/` is already the unchanged shipping source.

## Relevant Mozilla resources

- [Add-on Policies](https://extensionworkshop.com/documentation/publish/add-on-policies/)
- [Submitting an add-on](https://extensionworkshop.com/documentation/publish/submitting-an-add-on/)
- [Getting started with web-ext](https://extensionworkshop.com/documentation/develop/getting-started-with-web-ext/)
- [web-ext command reference](https://extensionworkshop.com/documentation/develop/web-ext-command-reference/)
- [Built-in data consent](https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/)
- [Manifest `browser_specific_settings`](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings)
