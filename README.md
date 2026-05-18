# SPEC Promo Materials

SPEC Promo Materials is a static browser tool for creating and exporting SPEC promotional posters and banner creatives. It runs from plain HTML/CSS/JavaScript, stores work in the browser, and does not require a backend or build step.

## What It Does

- Generates promo materials from code-defined templates for 18 creative sizes.
- Supports multi-language copy generation for 9 languages.
- Lets users edit title, subtitle, CTA text, style preset, background, colors, and logo variant.
- Supports product-image upload with cover-fit, drag/pan, zoom, and per-size positioning adjustments.
- Provides frame/template management for exact layout anchors and element geometry.
- Exports a single creative or all generated assets from the browser.

## Preview Links

- Local preview: `http://127.0.0.1:4173/index.html`
- GitHub Pages preview: `https://lll887583-cmd.github.io/spec-promo-materials/`

## Local Use

Use the included launcher from this folder:

```bash
./start.command
```

The launcher starts a Python static server on `127.0.0.1:4173` when needed, opens `http://127.0.0.1:4173/index.html`, and writes logs to `/tmp/spec-promo-materials-4173.log`.

VS Code Live Server can also be used for quick checks, but the maintained local preview command is `./start.command`.

## Project Structure

- `index.html` - app shell, navigation, controls, preview/editor panels, and asset includes.
- `assets/app.css` - main app styling, responsive layout, controls, panels, and preview/editor UI.
- `assets/spec-ui-foundation.css` - shared SPEC UI foundation styles.
- `assets/app.js` - main browser interaction wiring and generation/editor state that has not been split out.
- `assets/config/defaults.js` - default sizes, languages, copy, template/style presets, and constants.
- `assets/config/layout-rules.js` - fallback layout generation rules.
- `assets/config/translations.js` - default translation/copy map.
- `assets/frame-layouts/` - exact per-size frame layout files and layout registry.
- `assets/modules/dom-refs.js` - central DOM element references.
- `assets/modules/persistence.js` - IndexedDB, legacy localStorage, and optional `/api` persistence helpers.
- `assets/modules/app-state.js` - documented state grouping for maintainers.
- `assets/modules/product-image.js` - product image upload, geometry, drag/pan, zoom, and adjustment behavior.
- `assets/poster-core.js` - shared template, layout, style, and measurement helpers.
- `assets/poster-renderer.js` - on-screen DOM poster rendering.
- `assets/poster-canvas.js` - canvas/PNG export rendering.
- `assets/frame-store.js` - browser-side frame/template persistence helpers.
- `assets/frame-editor.js` - template/frame editor helpers.
- `assets/export-assets.js` - download/export helpers.
- `assets/rules-parser.js` - rule document parsing utilities.
- `assets/*.png` - logo and brand assets.
- `docs/where-to-change.md` - map of common tasks to source files.
- `docs/state-model.md` - runtime state and persistence ownership notes.
- `scripts/bump-asset-version.py` - helper for updating asset query versions in `index.html`.
- `start.command` - local preview launcher.

## Maintenance Notes

- Keep future edits in this folder; do not recreate deleted duplicate app folders.
- Use `docs/where-to-change.md` to decide where a change belongs before editing.
- Use `docs/state-model.md` before adding or persisting runtime state.
- Keep preview rendering and canvas export rendering consistent, especially for layout, text wrapping, CTA sizing, and image positioning.
- After editing assets referenced by `index.html`, update the cache-busting query version manually or run:

```bash
python3 scripts/bump-asset-version.py <version>
```

## Publishing

Do not publish automatically. When publishing is explicitly requested, check local Git status first, then sync the static site to both `main` and `gh-pages` without force-pushing or overwriting unconfirmed remote history.
