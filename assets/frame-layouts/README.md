# Frame layouts

Each file registers one Figma-derived promo material frame in `window.SpecPromoFrameLayouts`.

The app loads `registry.js` first, then the 17 frame files, and `assets/app.js` merges these layouts into the generator rules.

Frame anchors use percentages so the same config works in preview, editing, and canvas export. `cta.padX` / `cta.padY` keep the button self-sizing from its text instead of locking width and height.
