# Agent Notes

This project is a static, browser-first SPEC promotional-material generator. It builds editable poster/banner creatives from code-defined frame layouts, style presets, copy translations, and uploaded product images. Keep the app simple: plain HTML/CSS/JS, no build step, no backend requirement.

## Scope

- Work inside `/Users/macbookpro/Documents/New project/spec-promo-materials` unless the user explicitly approves changes elsewhere.
- Preserve the current product UI and interaction model unless the user requests a design change.
- Prefer changing shared config, frame-layout data, or renderer/export logic instead of patching one visible instance.
- Do not introduce package managers, bundlers, backend services, or test frameworks unless the user explicitly asks.
- Do not push to GitHub unless the user explicitly asks to publish.

## Product Description

- Main workflow: choose a style, enter title/subtitle/CTA copy, upload a product image, select sizes and languages, generate previews, adjust anchors, and download one or all assets.
- The app currently supports 18 creative sizes and 9 languages.
- Frame/template settings define geometry, anchors, text boxes, and image/logo/CTA regions.
- Style settings define colors, background mode, logo variant, and related visual tuning.
- Product image behavior is browser-side only: upload, preview, cover-fit, drag/pan, zoom, and export rendering.
- Persistence is local-first through IndexedDB with legacy localStorage compatibility; optional `/api` persistence is only used when available.

## Local Preview

- Preferred command from this folder: `./start.command`.
- The project preview service uses Python's static server at `http://127.0.0.1:4173/index.html`.
- VS Code Live Server is acceptable for quick checks, but use the real port shown by the running server when reporting preview links.
- After any visible change, start or confirm the preview service and report the actual usable localhost URL.

## GitHub Rules

- There is no `test` branch workflow.
- When the user asks to publish or push GitHub updates, check `git status` first and describe the change scope.
- Publish the updated static site to both `main` and `gh-pages`.
- Do not push to extra branches such as `gh-main` unless the user explicitly requests it.
- Stop and ask before rebase, force push, overwrite, or any operation that could discard unconfirmed local or remote work.

## Key Files

- `index.html` - app shell, controls, view structure, script/style asset version query strings.
- `assets/app.css` - main product UI, responsive layout, control styling, preview/editor styling.
- `assets/spec-ui-foundation.css` - shared SPEC foundation styles.
- `assets/app.js` - main interaction wiring, generation flow, selection state, settings panels, editor behavior not yet split out.
- `assets/modules/dom-refs.js` - central DOM reference map.
- `assets/modules/persistence.js` - IndexedDB, legacy localStorage, and optional `/api` persistence helpers.
- `assets/modules/app-state.js` - documented runtime state groups for future refactors.
- `assets/modules/product-image.js` - product image upload, cover geometry, drag/pan, zoom, and adjustment state.
- `assets/config/defaults.js` - default sizes, languages, copy, templates, style presets, and constants.
- `assets/config/layout-rules.js` - fallback generated layout rules used when exact frame layout data is absent.
- `assets/config/translations.js` - language copy defaults and translation map.
- `assets/frame-layouts/*.js` - exact per-size frame/layout definitions synced from the Figma template intent.
- `assets/frame-layouts/registry.js` - frame-layout registration and lookup.
- `assets/poster-core.js` - template/layout/style helper primitives.
- `assets/poster-renderer.js` - DOM preview rendering.
- `assets/poster-canvas.js` - canvas and PNG export rendering.
- `assets/frame-store.js` - browser-side frame/template persistence helpers.
- `assets/frame-editor.js` - frame/template editing helpers.
- `assets/export-assets.js` - single/all export and archive helpers.
- `assets/rules-parser.js` - rule document parsing helpers.
- `docs/where-to-change.md` - task-to-file maintenance map.
- `docs/state-model.md` - runtime state and persistence ownership notes.
- `scripts/bump-asset-version.py` - helper for updating `index.html` cache-busting asset versions.
- `start.command` - local static preview launcher.

## Working Rules

- Check `docs/where-to-change.md` before editing if ownership is unclear.
- Check `docs/state-model.md` before adding, moving, or persisting runtime state.
- For layout defects, update `assets/frame-layouts/*.js` when the issue is size-specific; update `assets/poster-renderer.js` and `assets/poster-canvas.js` together when preview/export behavior must match.
- For text or CTA behavior, keep DOM preview and canvas export logic consistent.
- If an edited asset is loaded by `index.html` with a cache-busting query string, update the version manually or run `scripts/bump-asset-version.py <version>`.
- Keep changes scoped to the minimal files needed and avoid editing generated or unrelated files.

## Verification

- Any visible behavior change must be verified in a browser against the local page, not only by reading code.
- For export-affecting changes, verify both on-screen preview and downloaded/canvas output when practical.
- If the same visual issue is still wrong after two edits, stop blind patching and run a full local test: fresh reload, reproduce from the start, inspect console/network/DOM, and compare all affected sizes.
- After completing a modification, report changed files, effect, preview link, and where future edits should continue.

## Out Of Scope Unless Requested

- The old Python poster generator outside this folder.
- Backend/server implementation work.
- New package or Node-based build workflows.
- Playwright or large automated test-suite expansion.
- Recreating deleted duplicate `test/` app copies.
