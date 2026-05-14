# SPEC Promo Materials

A static browser tool for creating promo material previews and exports.

## Preview Links

- Main preview: https://lll887583-cmd.github.io/spec-promo-materials/
- Test preview: https://lll887583-cmd.github.io/spec-promo-materials/test/

## Current Direction

The project is being narrowed to a simple Figma-template mapping tool:

- Recreate 18 Figma size templates in code.
- Keep template layout/positioning separate from visual styles.
- Let style presets adjust colors, logo variants, and small visual details.
- Preserve the existing UI/UX while replacing or extending the template data model.

## Runtime Files

- `index.html` - the app shell and controls.
- `assets/app.css` - UI and editor styling.
- `assets/app.js` - page interactions and state wiring.
- `assets/poster-core.js` - template/style primitives.
- `assets/poster-renderer.js` - preview rendering.
- `assets/poster-canvas.js` - canvas/export helper logic.
- `assets/frame-store.js` - browser-side frame/template persistence.
- `assets/frame-editor.js` - template/frame editor helpers.
- `assets/export-assets.js` - export helpers.
- `assets/rules-parser.js` - rule document parsing helpers.
- `assets/*.png` - logo and brand assets used by the UI.

## Local Use

Open `index.html` directly in a browser, or serve the folder with any static file server.

No Python script, local backend, Playwright test suite, or Node dependency install is required for the current workflow.
