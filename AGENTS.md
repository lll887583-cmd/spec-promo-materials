# Agent Notes

This repo is a static promo-material template tool. Keep the codebase simple and browser-first.

## Scope

- Preserve the current interface and interaction model in `index.html`, `assets/app.css`, and `assets/app.js` unless the user explicitly asks for a UI change.
- When implementing template work, prefer changes in template/style data and renderer logic over redesigning the product UI.
- Keep the app as a static browser tool; do not introduce backend dependencies or package workflow changes unless requested.
- Use `/Users/macbookpro/Documents/New project/spec-promo-materials` as the only local project path.
- Preview local changes with Live Server at `http://127.0.0.1:5500/index.html`.
- Do not push to GitHub unless the user explicitly asks to publish.
- There is no `test` branch workflow.
- When publishing is requested, push the updated static site to both `main` and `gh-pages`.
- Do not push to any extra branch such as `gh-main` unless the user explicitly requests it.

## Product Direction

- Recreate 18 Figma size templates in code.
- Separate template geometry from style presets.
- Template logic owns sizes, layout, anchors, and text/image regions.
- Style logic owns color, logo variant, and small visual tuning.
- Product images fill each size's visual area (`imageVisibleArea` / `imageVisualArea`) first, falling back to the visible intersection of the `image` frame and canvas.

## Key Files

- `assets/config/defaults.js` - default sizes, languages, copy, template anchors, and style constants.
- `assets/config/layout-rules.js` - fallback generated layout rules before Figma frame layout overrides.
- `assets/config/translations.js` - default copy translation map.
- `assets/modules/product-image.js` - product image cover geometry, visual area fitting, drag, and zoom interactions.
- `assets/poster-core.js` - template/layout core helpers.
- `assets/poster-renderer.js` - DOM preview rendering.
- `assets/poster-canvas.js` - canvas/export rendering helpers.
- `assets/frame-store.js` - local browser persistence for frame/template state.
- `assets/frame-editor.js` - frame/template editing helpers.
- `assets/export-assets.js` - export utilities.
- `assets/rules-parser.js` - rule document parsing utilities.
- `assets/spec-ui-foundation.css` - SPEC UI foundation styles.

## Working Rules

- Prefer changing the real shared component or renderer path over patching only one visible instance.
- If an asset is referenced through `index.html` with a cache-busting query string, bump the version when you modify that asset.
- Keep changes scoped to the minimal files required for the fix.

## Testing And Verification

- Any visible behavior change must be verified in a browser against the local page, not just by reading code.
- If the same issue still is not correct after two code edits, stop making blind changes and run a full local test:
  - reload the page from a fresh browser state
  - reproduce the user path from the start
  - inspect the full affected UI, not only the one element being edited
  - check console, network, and DOM state if the result still looks wrong
- Treat that as a hard rule: two failed attempts on the same issue means global verification before the third edit.

## Out Of Scope

- The old Python poster generator
- Local backend server work
- Playwright test-suite expansion
- Node package workflow changes
