# AMO screenshots

These JPEG files are captures of the real add-on UI running through
`tests/ui/preview.html`. The harness supplies deterministic sample data, so no
real history URL or keyword is exposed.

Recommended order and captions:

1. `01-automatic-cleaning.jpg` (1265 × 791) — “Configure private automatic
   cleanup, matching scopes, and protected exceptions.”
2. `02-preview-matches.jpg` (1265 × 791) — “Preview matching history URLs
   without deleting anything.”
3. `03-wipe-confirmation.jpg` (1265 × 791) — “Review the exact match count and
   risk before permanent deletion.”
4. `04-popup-mobile.jpg` (390 × 720) — “Quickly add a local rule or start a
   preview-first wipe from the compact popup.”

Run `pnpm screenshots:amo` to validate the required JPEG files and dimensions.
To refresh an image, serve the repository locally, open
`tests/ui/preview.html?surface=options` or `?surface=popup`, select the target
viewport, and capture the rendered page.
