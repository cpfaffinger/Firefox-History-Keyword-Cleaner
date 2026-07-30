# Publishing on addons.mozilla.org (AMO)

Last updated: July 26, 2026.

## Permanent identity

The existing AMO listing owns the ID
`history-keyword-cleaner@local.addons`. It must never change. The user-facing
brand remains **History Keyword Cleaner**; the immutable internal ID does not
need to match the listing slug or product name.

## Release safeguards

- Manifest V3 and readable, unminified shipping source.
- Firefox Desktop 140+ and a non-crashing capability fallback for Firefox for
  Android 142+, where Firefox does not expose selective history access.
- Only `history` and `storage` permissions.
- `data_collection_permissions.required: ["none"]`.
- No host permissions, remote code, telemetry, or network request.
- EN, DE, FR, IT, NL, and TR localization.
- 100% line coverage over shipped JavaScript.
- `web-ext` and `addons-linter` warnings treated as errors.
- The exact release ZIP is linted after packaging.
- Four screenshots captured from the real UI.
- Privacy policy, security reporting, reviewer notes, and manual test plan.

Mozilla does not require a particular coverage percentage. The project uses a
100% line gate as its own regression safeguard.

## One-time GitHub configuration

1. Create AMO API credentials in the AMO Developer Hub.
2. Add repository environment `amo-production`.
3. Add environment secrets `AMO_JWT_ISSUER` and `AMO_JWT_SECRET`.
4. Configure required reviewers on `amo-production` so submission always needs
   explicit human approval.
5. Keep the credentials out of files, logs, issues, and pull requests.

The normal `main` workflow never receives AMO credentials and never uploads to
AMO.

## Create a public version

1. Complete [MANUAL_TESTS.md](MANUAL_TESTS.md) using disposable history.
2. Update `CHANGELOG.md`.
3. Choose a numeric three-part version, for example `0.3.0`.
4. Run `pnpm install --frozen-lockfile` and `pnpm verify`.
5. Tag the reviewed commit and push the tag:

   ```sh
   git tag v0.3.0
   git push origin v0.3.0
   ```

The CI workflow derives both `package.json` and manifest versions from the tag,
builds the package, validates it, and creates the GitHub release.

## Submit to AMO

1. Open GitHub Actions.
2. Run **Submit a tagged release to AMO**.
3. Enter the existing tag, such as `v0.3.0`.
4. Review and approve the protected `amo-production` environment.
5. Retain the signed XPI artifact if AMO makes it immediately available;
   otherwise download it from AMO after review.
6. Monitor the AMO Developer Hub until automated and human review are complete.

The manual workflow checks out the exact tag, reapplies its version, runs the
full verification chain, then calls `web-ext sign --channel listed`.

For an emergency manual submission, run:

```sh
WEB_EXT_API_KEY="$AMO_JWT_ISSUER" \
WEB_EXT_API_SECRET="$AMO_JWT_SECRET" \
pnpm exec web-ext sign \
  --source-dir src \
  --artifacts-dir artifacts \
  --channel listed \
  --amo-metadata amo/metadata.json
```

## Relevant Mozilla resources

- [Add-on Policies](https://extensionworkshop.com/documentation/publish/add-on-policies/)
- [Submitting an add-on](https://extensionworkshop.com/documentation/publish/submitting-an-add-on/)
- [web-ext command reference](https://extensionworkshop.com/documentation/develop/web-ext-command-reference/)
- [Built-in data consent](https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/)
- [Manifest browser-specific settings](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings)
