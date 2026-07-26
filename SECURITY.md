# Security

## Reporting a vulnerability

Use a
[private GitHub Security Advisory](https://github.com/cpfaffinger/Firefox-History-Keyword-Cleaner/security/advisories/new).
Do not open a public issue for an unpatched vulnerability and do not attach
private URLs, keywords, exports, or browsing records.

You can expect acknowledgement through GitHub after the report is reviewed.
Normal product defects belong in
[GitHub Issues](https://github.com/cpfaffinger/Firefox-History-Keyword-Cleaner/issues).

## Supported versions

Only the latest AMO version receives security fixes. A fix is released as a new
version; previously published packages are not modified.

## Security model

- no host permissions, content scripts, network endpoints, or remote code;
- no `eval`, dynamic function construction, or inline scripts;
- imported JSON is size-limited, validated, and normalized;
- broad-rule and destructive-action confirmations;
- preview tokens bind a wipe to the exact saved settings;
- serialized mutations prevent overlapping scans and deletions;
- cooperative cancellation and bounded deletion concurrency;
- best-effort UI messaging cannot abort background history work;
- readable source code is packaged directly from `src/`.
