# AGENTS.md

Last updated: 2026-05-09 (Asia/Shanghai)

## Project

`spec-promo-materials` is a local Promo Materials UI demo for generating SPEC Markets promotional posters.

Primary entry points:

- `index.html` - main interactive UI demo.
- `assets/spec-ui-foundation.css` - shared SPEC UI design foundation extracted from local `spec-ui-demo/index.html`.
- `docs/spec-ui-dependency.md` - documented SPEC UI tokens, components, and responsive rules.
- `assets/logo.png` and logo assets - brand images used by the demo.
- `generate_exness_posters.py` - Python/Pillow poster-generation helper.

## Run / Preview

Use a local HTTP server instead of opening the file directly when testing in browser automation:

```bash
cd "/Users/macbookpro/Documents/spec-promo-materials"
python3 -m http.server 4173
```

Then open:

```text
http://127.0.0.1:4173/index.html
```

The in-app browser may block `file://` navigation, so prefer the local server URL for verification.

## Design Source Of Truth

This project must align with the local SPEC UI demo and the extracted dependency files:

- Source reference: `/Users/macbookpro/Documents/Codex/2026-05-07/file-users-macbookpro-documents-codex-2026/spec-ui-demo/index.html`
- Shared CSS dependency: `assets/spec-ui-foundation.css`
- Written rules: `docs/spec-ui-dependency.md`

Design principles:

- Keep the UI simple, professional, restrained, and business-focused.
- Use SPEC primary color `#1F3472` through `--spec-color-primary` / `--primary`.
- Use responsive web layout; do not use a fixed 1920px canvas or global scale wrappers.
- Prefer white cards, light borders, clear typography, and restrained shadows.
- Avoid decorative emoji in UI copy.
- New UI should reuse `--spec-*` tokens and existing component patterns before adding page-specific styles.

## Current Product Decisions From 2026-05-09

- Logo selector does not include a `No Logo` option.
- Upload helper sentence `已载入商品图层，可批量适配 17 个尺寸。` has been removed.
- Deleting an uploaded image is immediate; do not show a second confirmation modal.
- Default state has no product image layer:
  - Left upload section shows the upload/crop card.
  - Right poster preview shows only a light gray checkerboard background.
  - No default phone/product layer is shown.
- Uploaded image crop target is `530 x 628`.
- The uploaded/cropped image is rendered as the poster's right-side product layer:
  - Poster canvas is `1200 x 628`.
  - Product image area is `x=670, y=0, width=530, height=628`.
- The generated/downloaded PNG must also draw the uploaded product image in the same `530 x 628` right-side area.
- Size preview thumbnails should not have background fills, borders, or active outlines.
- Size checkbox rows should stay compact; avoid large vertical row gaps.

## Implementation Notes

- `index.html` is a single-file demo with inline CSS and JS. Keep edits localized and readable.
- Keep `assets/spec-ui-foundation.css` as the shared foundation; page-specific overrides can remain in `index.html`.
- Cropper.js is loaded from CDN and used for image cropping.
- The upload flow uses these key concepts:
  - `uploadedImageSrc` stores the cropped image data URL.
  - `phoneHand` currently refers to the right-side poster product image element for compatibility with existing code.
  - `setUploadImage(...)` should update preview state and sync the uploaded image into the poster.
  - `setUploadEmpty()` should return the UI to the checkerboard empty state.
- If changing download behavior, keep the preview and canvas export visually consistent.

## Validation Checklist

Before handing off UI changes:

- Start a local server with `python3 -m http.server 4173`.
- Open `http://127.0.0.1:4173/index.html` in the in-app browser.
- Check initial state: upload card is visible and poster is checkerboard only.
- Check upload flow: crop modal uses `530 x 628`; applying crop shows the image on the poster right side.
- Check delete flow: image deletes immediately, with no confirmation modal.
- Check browser console for warnings/errors.
- Run a quick CSS brace balance check if editing inline styles.

Example CSS brace check:

```bash
python3 - <<'PY'
from pathlib import Path
s = Path('index.html').read_text()
css = s[s.index('<style>') + len('<style>'):s.index('</style>')]
bal = 0
minbal = 0
for ch in css:
    if ch == '{':
        bal += 1
    elif ch == '}':
        bal -= 1
        minbal = min(minbal, bal)
print('css brace balance:', bal, 'min:', minbal)
PY
```

## Editing Guidelines

- Preserve user changes; do not reset or revert unrelated files.
- Prefer `rg` for searching.
- Keep CSS and JS ASCII unless existing file content requires otherwise.
- Avoid adding new dependencies unless necessary.
- If using a temporary local server for verification, stop it after testing.
