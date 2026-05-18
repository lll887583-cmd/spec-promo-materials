# SPEC Promo Materials

A static browser tool for creating promo material previews and exports.

## Preview Links

- Local preview: http://127.0.0.1:5500/index.html
- GitHub Pages preview: https://lll887583-cmd.github.io/spec-promo-materials/

## Current Direction

The project is being narrowed to a simple Figma-template mapping tool:

- Recreate 18 Figma size templates in code.
- Keep template layout/positioning separate from visual styles.
- Let style presets adjust colors, logo variants, and small visual details.
- Preserve the existing UI/UX while replacing or extending the template data model.

## Runtime Files

- `index.html` - the app shell and controls.
- `assets/app.css` - UI and editor styling.
- `assets/boot.js` - ordered static asset loader and shared asset version.
- `assets/app.js` - page interactions and state wiring that has not been split yet.
- `assets/modules/dom-refs.js` - centralized DOM reference map.
- `assets/modules/persistence.js` - IndexedDB, legacy localStorage, and optional server persistence helpers.
- `assets/modules/app-state.js` - documented state groups for future refactors.
- `assets/modules/dependency-loader.js` - lazy third-party dependency loading.
- `assets/modules/help-popover.js` - help popover interactions.
- `assets/poster-core.js` - template/style primitives.
- `assets/poster-renderer.js` - preview rendering.
- `assets/poster-canvas.js` - canvas/export helper logic.
- `assets/frame-store.js` - browser-side frame/template persistence.
- `assets/frame-editor.js` - template/frame editor helpers.
- `assets/export-assets.js` - export helpers.
- `assets/rules-parser.js` - rule document parsing helpers.
- `assets/*.png` - logo and brand assets used by the UI.
- `docs/where-to-change.md` - task-to-file maintenance map.
- `docs/state-model.md` - runtime state and persistence ownership notes.
- `scripts/bump-asset-version.py` - helper for updating `index.html` asset query versions.

## Local Use

Use the built-in static server for the local workflow:

1. Run `npm run serve`.
2. Open `http://127.0.0.1:4173/index.html`.
3. Save local file changes and refresh the browser.

VS Code Live Server still works if preferred: open `index.html` at `http://127.0.0.1:5500/index.html`.

Do not use the deleted `test` branch workflow. Publish to GitHub Pages only when explicitly requested.

## Deprecated Copies

The old `test/` duplicate app folder has been removed. Keep all future edits in the root app files and `assets/` so preview and publish paths stay consistent.

## Testing

- Run `npm run test:smoke` for the minimal browser smoke test.

## Maintenance Notes

- Check `docs/where-to-change.md` before editing if you are unsure where a change belongs.
- Check `docs/state-model.md` before adding or persisting runtime state.
- After editing assets referenced by `index.html`, update the cache query manually or run `scripts/bump-asset-version.py <version>`.
