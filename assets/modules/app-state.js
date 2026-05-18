(function () {
  'use strict';

  window.SpecPromoStateGroups = Object.freeze({
    generation: ['generated', 'isGenerating', 'generationToken', 'generatedAssets', 'generatedSizeIndices', 'generatedLanguageIndices'],
    selection: ['currentSizeIndex', 'currentLanguageIndex', 'frameworkSizeIndex', 'selectedTemplate', 'selectedStyle'],
    template: ['templates', 'stylePresets', 'templateAnchorMaps', 'templateAnchors', 'draftTemplateAnchors', 'styleMaps', 'templateStyles', 'draftTemplateStyles'],
    upload: ['hasImage', 'uploadedImageSrc', 'uploadedImageName', 'uploadCropper', 'uploadCropFile'],
    editor: ['activeAnchor', 'selectedAnchorKeys', 'activePosterAnchor', 'selectedPosterAnchorKeys', 'posterAnchorOverrides', 'posterEditUndoStack', 'productImageAdjustments'],
    rules: ['rulesDocuments', 'spreadsheetGenerationRules', 'rulesPreviewIndex', 'rulesReplaceIndex']
  });
}());
