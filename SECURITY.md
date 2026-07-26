# Security

## Security model

- no host permissions, content scripts, or website manipulation
- no network access or remote code execution
- no `eval` or `Function` construction and no inline scripts
- all dynamic text is rendered with `textContent`
- imported data is normalized and limited to 500 keywords of 256 characters
  each
- bounded deletion concurrency prevents unnecessary browser load
- the distributed package contains only files from `src/`

## Reporting a vulnerability

A private security contact address must be configured before production
security support is offered. Do not include sensitive browsing data in a
vulnerability report.

## Supported versions

Only the latest version is maintained during local development. Security fixes
for a store release should always be published as a new patch version.
