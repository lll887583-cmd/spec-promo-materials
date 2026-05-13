# Agent Notes

This repo is intentionally scoped as a static promo-material template tool.

## Do Not Change UI/UX Unless Asked

Preserve the existing interface and interaction model in:

- `index.html`
- `assets/app.css`
- `assets/app.js`

When implementing Figma template work, prefer changes in template/style data and renderer logic instead of redesigning the product UI.

## Current Product Direction

- Recreate 17 Figma size templates in code.
- Separate template geometry from style presets.
- Template layer handles sizes, layout, anchors, and text/image regions.
- Style layer handles color, logo variant, and light visual tuning.
- Keep the app a simple static browser tool.

## Important Files

- `assets/poster-core.js` - template/style definitions and shared constants.
- `assets/poster-renderer.js` - DOM preview rendering.
- `assets/poster-canvas.js` - canvas/export rendering helpers.
- `assets/frame-store.js` - local browser persistence for frame/template state.
- `assets/frame-editor.js` - frame/template editing helpers.
- `assets/export-assets.js` - export utilities.
- `assets/rules-parser.js` - rule document parsing utilities.
- `assets/spec-ui-foundation.css` - SPEC UI foundation styles.

## Out Of Scope

The old Python poster generator, local backend server, Playwright test suite, and Node package workflow are not part of the current implementation path.
