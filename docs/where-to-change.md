# Where to Change Things

Use this map before editing so changes land in the shared source of truth instead of a visible one-off instance.

## Common Tasks

- Change page markup or top-level controls: `index.html`.
- Change main interaction wiring that has not been split yet: `assets/app.js`.
- Change DOM lookup names or add a new required element reference: `assets/modules/dom-refs.js` plus `index.html`.
- Change persistent storage behavior: `assets/modules/persistence.js`.
- Change state ownership or add a new state group: `assets/modules/app-state.js` and `docs/state-model.md`.
- Change default sizes, languages, default copy, and base styles: `assets/config/defaults.js`.
- Change fallback generated layouts: `assets/config/layout-rules.js`.
- Change exact Figma-synced frame geometry: `assets/frame-layouts/*.js`.
- Change frame-layout registration behavior: `assets/frame-layouts/registry.js`.
- Change preview rendering: `assets/poster-renderer.js`.
- Change canvas or PNG export rendering: `assets/poster-canvas.js`.
- Change product image pan/zoom behavior: `assets/modules/product-image.js`.
- Change ZIP or folder export helpers: `assets/export-assets.js`.
- Change browser persistence for template/frame data: `assets/frame-store.js`.
- Change rule document parsing: `assets/rules-parser.js`.
- Change product UI styling: `assets/app.css`.
- Change shared foundation styles: `assets/spec-ui-foundation.css`.

## Rules

- Do not recreate deleted `test/` copies. The root app and `assets/` are the only active static app path.
- Prefer config/layout files for template data changes before editing renderer code.
- After editing any asset referenced from `index.html`, update its query version or run `scripts/bump-asset-version.py`.
