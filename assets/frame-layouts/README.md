# Frame layouts

Each file registers one Figma-derived promo material frame in `window.SpecPromoFrameLayouts`.

The app loads `registry.js` first, then the 18 frame files, and `assets/app.js` merges these layouts into the generator rules.

Frame anchors use percentages so the same config works in preview, editing, and canvas export.

## Safe-area text model

Layouts synced from Figma node `3:464` include these safety constraints:

- `safeArea1`, `safeArea2`, `safeArea3` - the Figma safe-area hierarchy for brand/content/text stack boundaries.
- `safeArea` - alias of `safeArea3`, the hard boundary for title, subtitle, and CTA.
- `contentStack` - the full title/subtitle/button group area.
- `textGroup` - the Figma auto-layout frame for title and subtitle when a subtitle exists.
- `title.maxH`, `subtitle.maxH` - maximum text-box heights from Figma.
- `title.lineHeight`, `subtitle.lineHeight`, `cta.textLineHeight` - fixed at `1.4` to match the 140% Figma text rule.
- `cta.textMaxW`, `cta.textMaxH` - button text bounds from the Figma `Button Text` layer.
- `cta.maxW`, `cta.maxH` - outer button bounds inside the safe area; button width still auto-fits the text plus padding.

The renderer and canvas export shrink text, reduce CTA padding, and clamp/ellipsis overflow instead of letting multilingual copy break the frame.

## Display order

The 18 sizes follow the Figma overview image order in the UI: vertical, square, small banner, then horizontal. Within each group, sizes are shown left to right.
