# Privacy Policy

Effective: July 30, 2026

History Keyword Cleaner does not collect, transmit, sell, or share personal
data, browsing activity, keywords, technical data, or usage analytics.

The add-on processes Firefox history only inside the local browser. Rules,
operation state, and aggregate deletion counters are stored only in the local
Firefox profile. A bounded diagnostic event log is also stored locally. It
records operation types, timestamps, capabilities, counts, and structured
error codes, but deliberately excludes keywords, exceptions, URLs, and page
titles. None of this data is synchronized or sent to a server.

The add-on contains no telemetry, advertising, tracking pixel, remote script,
account, or network endpoint. Firefox controls removal of extension storage
when the add-on is uninstalled.

A user-initiated export creates a plain-text JSON file on the local device.
That file can contain sensitive keywords and exceptions, so users should store
and share it with the same care as other private data. Import reads only the
selected local JSON file.

A separate user-initiated debug export creates a local JSON file containing the
sanitized diagnostic log and runtime capability information. It does not
contain rules, exceptions, URLs, page titles, or browsing records. Users can
inspect the file before sharing it.

For product questions, use
[GitHub Issues](https://github.com/cpfaffinger/Firefox-History-Keyword-Cleaner/issues).
For vulnerabilities, use a
[private GitHub Security Advisory](https://github.com/cpfaffinger/Firefox-History-Keyword-Cleaner/security/advisories/new).
