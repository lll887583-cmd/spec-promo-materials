# Agent Notes

This repo is a static promo-material template tool. Keep the codebase simple and browser-first.

## Scope

- Preserve the current interface and interaction model in `index.html`, `assets/app.css`, and `assets/app.js` unless the user explicitly asks for a UI change.
- When implementing template work, prefer changes in template/style data and renderer logic over redesigning the product UI.
- Keep the app as a static browser tool; do not introduce backend dependencies or package workflow changes unless requested.
- Use `/Users/macbookpro/Documents/New project/spec-promo-materials` as the only local project path.
- Preview local changes with `npm run serve`, then open `http://127.0.0.1:4173/`.
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
- Do not change self-test files, smoke tests, or manual self-test documents unless the user explicitly asks for test updates.

## Edit And Export Parity Rules

- The editor preview must be the source of truth for downloads: what the user sees in the current size/language preview should be what single-image and batch downloads render.
- Single download and batch download must use the same DOM export path. Do not add a separate canvas-only rendering path for CTA/text unless it is proven pixel-matched to the DOM preview.
- CTA/button wrapping must be scoped to the current size and current language. Changing one size's button width, wrapping, padding, or text override must not make every size for that language wrap.
- When CTA width is manually resized or a CTA size preset is applied, persist it as fixed-width behavior for that size/language instead of letting `autoWidth` re-expand it during export.
- Avoid global language-level copy overrides for inline canvas edits. Inline edits on the generated preview should write to a size+language scoped override.
- If export output differs from the editor preview, stop patching isolated CSS and inspect the full path: preview state -> export snapshot -> export card layout -> html2canvas output.

## Current Official 9-Language Gold Copy

Use this latest copy for formal gold promo exports unless the user provides newer copy:

| Language | Title | Subtitle | CTA |
| --- | --- | --- | --- |
| English | Trade Gold with Confidence | Low Spreads, High Liquidity, 24/5 Access | Start Trading |
| 日本語 | 自信を持って金取引を | 低スプレッド・高流動性・24時間5日取引可能 | 今すぐ取引 |
| 简体中文 | 稳健交易黄金 | 低点差・高流动性・全天候交易 | 立即交易 |
| 繁體中文 | 穩健交易黃金 | 低點差・高流動性・全天候交易 | 立即交易 |
| Tiếng Việt | Tự Tin Giao Dịch Vàng | Spread thấp, thanh khoản cao, giao dịch 24/5 | Giao dịch ngay |
| ภาษาไทย | เทรดทองคำอย่างมั่นใจ | สเปรดต่ำ สภาพคล่องสูง เข้าถึงได้ 24/5 | เทรดเลย |
| 한국어 | 자신 있게 골드 트레이딩 | 낮은 스프레드・높은 유동성・24/5 거래 가능 | 거래 시작 |
| Indonesia | Trading Emas dengan Percaya Diri | Spread Rendah, Likuiditas Tinggi, Akses 24/5 | Mulai Trade |
| Melayu | Niaga Emas dengan Yakin | Spread Rendah, Kecairan Tinggi, Akses 24/5 | Mula Trade |

## Before Each Change: Plan And Impact Review

Before making actual code changes, first turn the user's idea into a clear execution plan and wait for user confirmation before editing.

The plan must include two parts:

### 1. Todo List For This Change

List every concrete change you plan to make as a todo list. Each item must explain:

- Change goal: what this step is meant to solve.
- Before state: what the current behavior or limitation is.
- After state: what the user should see or how the behavior should change after completion.
- Expected files: the specific file paths likely to be modified.
- Risk level: whether this item may affect existing functionality.

Example format:

- [ ] Adjust button text styling
  - Change goal: make button text clearer in small ad sizes.
  - Before state: button text is too small or cramped in some sizes.
  - After state: button font size and spacing are more stable.
  - Expected files: `assets/app.css`
  - Risk level: medium risk, because shared button styles may affect all ad sizes.

### 2. Impact Todo List For This Change

Before editing, proactively list the features, pages, sizes, interactions, or export results that may be affected. Each item must explain:

- Impact area: the feature or area that may be affected.
- Impact reason: why this change could affect it.
- Check method: how to verify it still works after the change.
- Test requirement: mark it as "must test" or "recommended test".

Example format:

- [ ] Multi-size ad layouts
  - Impact reason: button styles or layout rules are often reused across multiple sizes.
  - Check method: check common sizes such as 300x250, 300x600, 728x90, and 1200x1200.
  - Test requirement: must test.

- [ ] Image export
  - Impact reason: style or DOM structure changes may affect canvas rendering or exported output.
  - Check method: generate a preview and try exporting an image once.
  - Test requirement: must test.

- [ ] Mobile top action bar
  - Impact reason: global CSS or responsive layout changes may affect mobile controls.
  - Check method: narrow the browser width and check whether top buttons are misaligned, covered, or unclickable.
  - Test requirement: recommended test.

### Execution Rules

- Do not start editing code until the user confirms the plan.
- If the user explicitly says "directly change it", "do it this way", or "no need to confirm", confirmation can be skipped, but the impact review still must be done internally.
- Keep the change scope tight and prioritize files inside this repo.
- Avoid changing global logic, global styles, or shared configuration for a local issue. If it is necessary, explain the reason and risk before editing.
- After each change, verify the items listed in the impact todo list and report which checks passed, which were not checked, and why.
- End the plan with a short recommendation summary explaining the preferred approach, then ask the user whether they agree before starting implementation.

## Testing And Verification

- Any visible behavior change must be verified in a browser against the local page, not just by reading code.
- When the user asks to self-test the tool, run the manual workflow in `docs/manual-self-test.md`.
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
