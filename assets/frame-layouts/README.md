# Frame Layouts

Each file registers one poster size layout. The layout model no longer uses safe areas.

## Text Rules

- Title, subtitle, and CTA use `lineHeight: 1.4`.
- Text boxes keep their editable `x`, `y`, `w`, and `h`, but there are no `maxW`, `textMaxW`, `textMaxH`, `minFontPx`, or shrink-to-fit rules.
- Title and subtitle use `wrap: true`, `overflow: "visible"`, and `resizeMode: "box-and-font"`.
- CTA uses `autoWidth: true` by default, `overflow: "visible"`, and `resizeMode: "box-and-font"`.

## Layout Rules

- Most sizes use `contentStack.direction: "vertical"` for Logo, copy, and CTA with left alignment.
- The three small banners (`320x50`, `720x90`, `728x90`) use `contentStack.direction: "horizontal"` for side-by-side spacing and vertical centering.
- Logo uses `resizeMode: "proportional"` and should be scaled from corners only.
