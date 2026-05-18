# State Model

The app is still browser-first and static. State is grouped here to make future edits easier to locate without changing current runtime behavior.

## Runtime State Groups

- Generation: `generated`, `isGenerating`, `generationToken`, `generatedAssets`, `generatedSizeIndices`, `generatedLanguageIndices`.
- Selection: `currentSizeIndex`, `currentLanguageIndex`, `frameworkSizeIndex`, `selectedTemplate`, `selectedStyle`.
- Template/style editing: `templates`, `stylePresets`, `templateAnchorMaps`, `templateAnchors`, `draftTemplateAnchors`, `styleMaps`, `templateStyles`, `draftTemplateStyles`.
- Upload: `hasImage`, `uploadedImageSrc`, `uploadedImageName`, `uploadCropper`, `uploadCropFile`.
- Poster editor: `activeAnchor`, `selectedAnchorKeys`, `activePosterAnchor`, `selectedPosterAnchorKeys`, `posterAnchorOverrides`, `posterEditUndoStack`, `productImageAdjustments`.
- Rules documents: `rulesDocuments`, `spreadsheetGenerationRules`, `rulesPreviewIndex`, `rulesReplaceIndex`.

The same grouping is recorded in `assets/modules/app-state.js` for maintainers and future refactors.

## Persistence Layers

- Primary local state uses IndexedDB through `assets/modules/persistence.js`.
- Legacy compatibility mirrors selected records into `localStorage` so older saved data can still be read.
- Server persistence is attempted through `/api` only when the page runs on HTTP(S). Static previews without that API fall back to browser storage.
- `newestAvailableState` chooses the newest state by `updatedAt` when server, IndexedDB, and legacy data overlap.

## Adding State

1. Add the runtime variable near its group in `assets/app.js`.
2. Add the variable name to `assets/modules/app-state.js`.
3. If it must persist, include it in the relevant snapshot and normalization logic.
4. Update this document with the state owner and restore priority.
