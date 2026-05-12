# AGENTS.md

Last updated: 2026-05-12 (Asia/Shanghai)

## Project Snapshot

`spec-promo-materials` is a local SPEC Markets Promo Materials UI demo for uploading product imagery, managing layout templates, parsing generation-rule documents, and exporting localized PNG promotional assets.

Primary entry points:

- `index.html` - single-page interactive UI demo with inline CSS and JS.
- `server.py` - local HTTP server plus SQLite API for persistent data.
- `data/spec_promo_materials.sqlite3` - local SQLite database, generated at runtime and ignored by git.
- `assets/spec-ui-foundation.css` - shared SPEC UI design foundation from the local SPEC UI demo.
- `docs/spec-ui-dependency.md` - SPEC UI tokens, component rules, and responsive guidance.
- `assets/logo*.png` and `assets/trustpilot.png` - brand and trust assets used by the generator.
- `tests/promo-materials.spec.js` - Playwright regression coverage.
- `generate_exness_posters.py` - legacy Python/Pillow poster-generation helper.

## Run / Preview

Prefer the app server when validating real product behavior, because it enables the SQLite persistence API:

```bash
cd "/Users/macbookpro/Documents/spec-promo-materials"
npm start
```

Open:

```text
http://127.0.0.1:4173
```

Notes:

- `npm start` and `npm run serve` both run `python3 server.py`.
- The server port defaults to `4173`; override with `PORT=4174 npm start` if needed.
- Use `npm run serve:static` only for quick static UI checks. Without `server.py`, `/api/*` is unavailable and the app falls back to browser IndexedDB/localStorage.
- Do not rely on `file://` for feature validation. Browser APIs, persistence, and downloads behave differently outside HTTP.
- Stop any temporary server after verification.

## Persistence Model

Server-backed persistence is available only through `server.py`:

- `GET /api/health` confirms the database path and server availability.
- `GET /api/state/size-language` / `PUT /api/state/size-language` stores sizes, languages, and localized copy.
- `GET /api/rules-documents` / `PUT /api/rules-documents` stores uploaded rule documents, extracted text, ordering, and blobs.

Browser fallback persistence remains in place:

- `spec-promo-materials-database-v1` IndexedDB stores local app state and rule documents.
- Legacy `localStorage` keys are mirrored for compatibility.
- Template state (`spec-promo-template-state-v1`) is currently local browser state, not server SQLite state.
- The app restores the newest available server, IndexedDB, or legacy local state where applicable.

## Design Source Of Truth

Keep this project aligned with the local SPEC UI demo and extracted dependency files:

- Source reference: `/Users/macbookpro/Documents/Codex/2026-05-07/file-users-macbookpro-documents-codex-2026/spec-ui-demo/index.html`
- Shared CSS dependency: `assets/spec-ui-foundation.css`
- Written rules: `docs/spec-ui-dependency.md`

Design principles:

- Keep the UI simple, professional, restrained, and business-focused.
- Use SPEC primary color `#1F3472` through `--spec-color-primary` / `--primary`.
- Reuse `--spec-*` tokens and existing component patterns before adding page-specific styles.
- Prefer white cards, light borders, clear hierarchy, and restrained shadows.
- Avoid decorative emoji in UI copy.
- Use responsive web layout; do not introduce fixed 1920px canvases or global scale wrappers.

## Current Product Behavior

Core generator:

- Default material sizes: 17 IAB/social-style outputs, sorted by width.
- Default languages: 9 (`English`, `日本語`, `简体中文`, `繁體中文`, `Tiếng Việt`, `ภาษาไทย`, `한국어`, `Indonesia`, `Melayu`).
- The ungenerated preview should align with the `1200 x 628` template preview size.
- Generating without parsed rule documents creates every selected size/language combination.
- Generating with parsed rule documents creates rule-driven assets and shows `已按生成规则准备 N 张素材。`.

Upload/product image flow:

- Default state has no product image layer.
- The upload panel shows the upload/crop card until an image is applied.
- The poster preview should show only its placeholder/checkerboard state before upload.
- Cropper.js targets a `530 x 628` product layer for the `1200 x 628` base poster.
- Deleting an uploaded image is immediate; do not add a second confirmation modal.
- During generation, image deletion is blocked.

Template and poster editing:

- Templates start with light and dark defaults; manager supports add, delete, rename, drag reorder, and visual anchor editing.
- Template anchors are independent for `image`, `title`, `subtitle`, `cta`, `logo`, and `trust`.
- `title` and `subtitle` replace the older single `text` editing surface for visible anchor work.
- Committing template mapping syncs the selected template to material generation.
- Generated posters support per-size editable anchors for `logo`, `title`, `subtitle`, `cta`, and `trust`, plus undo.

Generation-rule documents:

- Accepted upload types: Markdown/text, PDF, Word (`.doc`/`.docx`), and XLSX.
- Text-like documents are parsed for structured key/value rules; XLSX rows are parsed as rule rows.
- Supported rule concepts include size, language, template, output file name, title, subtitle, CTA, logo variant, Trustpilot visibility, colors, and element anchors.
- Rule-provided sizes/languages may be synced into the size/language settings.
- Rules are persisted to IndexedDB and, when `server.py` is running, SQLite.

Download/export:

- Single download exports the currently previewed PNG.
- Bulk download exports generated assets grouped by language folder.
- If the File System Access API is available, the default bulk method is folder save; otherwise fallback is ZIP.
- Downloaded PNG dimensions must match the selected asset size exactly.

## Testing

Install once if dependencies are missing:

```bash
npm install
npx playwright install chromium
```

Run regression tests:

```bash
npm test
```

Targeted run:

```bash
npm run test:smoke
```

Testing notes:

- `playwright.config.js` currently starts `python3 -m http.server 4173` and reuses an existing server when present.
- If a `server.py` process is already running at `4173`, tests may exercise server-backed persistence; otherwise they exercise static-server browser fallback behavior.
- Test coverage includes initial state, rule document upload/preview/parsing, size/language persistence, template manager anchors, generated asset ZIP/PNG dimensions, desktop sidebar, and mobile navigation.
- `test-results/`, `playwright-report/`, `node_modules/`, `data/`, and `.DS_Store` are ignored and should not be committed.

## Validation Checklist

Before handing off UI or behavior changes:

- Confirm `git status --short` and preserve unrelated user changes.
- Start `npm start` for persistence-sensitive validation; use static serve only when persistence is irrelevant.
- Open `http://127.0.0.1:4173` in the in-app browser or another browser.
- Check initial state: upload card visible, no default product image, poster placeholder/checkerboard only.
- Check upload flow: crop modal says `530×628`; applying crop shows the image on the poster right side.
- Check delete flow: uploaded image deletes immediately without a confirmation dialog.
- Check rule flow when touched: upload MD/PDF/Word/XLSX, preview parsed text/rules, generate rule-driven output.
- Check template flow when touched: add/rename/reorder templates, move anchors, commit mapping, confirm material generation uses it.
- Check downloads when touched: single PNG and bulk ZIP/folder export match expected dimensions and names.
- Check browser console for warnings/errors.
- Run `npm test` or a narrower Playwright command when behavior changes.

Quick inline CSS brace check after editing styles:

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
- Prefer `rg` for search and keep edits localized, especially in the single-file `index.html`.
- Keep `assets/spec-ui-foundation.css` as the shared foundation; put page-specific overrides in `index.html` unless the token/component foundation itself changes.
- Avoid new dependencies unless necessary; CDN usage already exists for Cropper.js and XLSX.
- Keep JavaScript and CSS ASCII where practical; existing Chinese UI copy is expected.
- Keep preview rendering and canvas export visually consistent whenever layout, image, or text behavior changes.
- When changing persistence, validate both server-backed SQLite mode and browser fallback mode.
- When changing rule parsing, add or update Playwright fixtures for each affected file type.
