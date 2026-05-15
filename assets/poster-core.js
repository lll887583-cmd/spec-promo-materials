(function () {
  'use strict';

  function createPosterCore(config = {}) {
    const defaultAnchors = config.defaultAnchors || {};
    const layoutRules = config.layoutRules || {};
    const templateRatioSize = config.templateRatioSize || { width: 1200, height: 628 };
    const ctaMinWidthPercent = Number(config.ctaMinWidthPercent) || 1;

    function clamp(value, min, max) {
      return Math.min(max, Math.max(min, value));
    }

    function cloneAnchors(anchors) {
      return JSON.parse(JSON.stringify(anchors));
    }

    function sizeAspectRatio(size = templateRatioSize) {
      const width = Number(size?.width) || templateRatioSize.width;
      const height = Number(size?.height) || templateRatioSize.height;
      return width / Math.max(1, height);
    }

    function ctaMaxWidthPercentForSize(size = templateRatioSize) {
      return 100;
    }

    function normalizeCtaAnchorRatio(anchor, size = templateRatioSize) {
      if (!anchor) return anchor;
      const maxWidth = ctaMaxWidthPercentForSize(size);
      const w = clamp(Number(anchor.w) || 24, ctaMinWidthPercent, maxWidth);
      const h = clamp(Number(anchor.h) || 11.5, 4, 100);
      return {
        ...anchor,
        x: clamp(Number(anchor.x || 0), 0, 100 - w),
        y: clamp(Number(anchor.y || 0), 0, 100 - h),
        w,
        h
      };
    }

    function textAnchorFromChildren(anchors = defaultAnchors) {
      const title = anchors.title || defaultAnchors.title;
      const subtitle = anchors.subtitle || defaultAnchors.subtitle;
      const left = Math.min(title.x, subtitle.x);
      const top = Math.min(title.y, subtitle.y);
      const right = Math.max(title.x + title.w, subtitle.x + subtitle.w);
      const bottom = Math.max(title.y + title.h, subtitle.y + subtitle.h);
      return {
        x: left,
        y: top,
        w: right - left,
        h: bottom - top,
        align: title.align || subtitle.align || anchors.text?.align || 'left'
      };
    }

    function textChildAnchors(textAnchor = defaultAnchors.text, size = templateRatioSize) {
      const textHeight = textAnchor.h || 28;
      const compactVertical = sizeAspectRatio(size) <= 0.34;
      const titleH = compactVertical
        ? clamp(textHeight * 0.32, 7, Math.max(7, textHeight * 0.42))
        : clamp(textHeight * 0.4, 5, Math.max(5, textHeight * 0.58));
      const gap = compactVertical ? clamp(textHeight * 0.035, 0.8, 2) : clamp(textHeight * 0.08, 1.2, 5);
      const subtitleY = (textAnchor.y || 0) + titleH + gap;
      const subtitleH = Math.max(5, (textAnchor.y || 0) + textHeight - subtitleY);
      return {
        title: {
          x: textAnchor.x || 0,
          y: textAnchor.y || 0,
          w: textAnchor.w || 40,
          h: titleH,
          align: textAnchor.align || 'left',
          lineHeight: 1.4,
          wrap: true,
          overflow: 'visible',
          resizeMode: 'box-and-font'
        },
        subtitle: {
          x: textAnchor.x || 0,
          y: subtitleY,
          w: textAnchor.w || 40,
          h: subtitleH,
          align: textAnchor.align || 'left',
          lineHeight: 1.4,
          wrap: true,
          overflow: 'visible',
          resizeMode: 'box-and-font'
        }
      };
    }

    function ensureIndependentCopyAnchors(anchors = {}) {
      const next = { ...anchors };
      if ((!next.title || !next.subtitle) && next.text) {
        const children = textChildAnchors(next.text, templateRatioSize);
        next.title = next.title || children.title;
        next.subtitle = next.subtitle || children.subtitle;
      }
      next.title = next.title || cloneAnchors(defaultAnchors.title);
      next.subtitle = next.subtitle || cloneAnchors(defaultAnchors.subtitle);
      const align = next.title.align || next.subtitle.align || next.text?.align || 'left';
      next.title.align = align;
      next.subtitle.align = align;
      next.text = textAnchorFromChildren(next);
      return next;
    }

    function defaultCtaAnchorForText(textAnchor = textAnchorFromChildren(defaultAnchors), size = templateRatioSize) {
      return normalizeCtaAnchorRatio({
        x: textAnchor.x,
        y: Math.min(88, textAnchor.y + 36.8),
        w: Math.min(32, Math.max(20, textAnchor.w * 0.62)),
        h: 11.5,
        lineHeight: 1.4,
        autoWidth: true,
        overflow: 'visible',
        resizeMode: 'box-and-font'
      }, size);
    }

    function shouldResetCtaAnchor(anchors) {
      const cta = anchors?.cta;
      if (!cta) return true;
      const numericValues = [cta.x, cta.y, cta.w, cta.h].map(Number);
      if (numericValues.some(value => !Number.isFinite(value))) return true;
      return cta.w <= 0 || cta.h <= 0 || cta.x < 0 || cta.y < 0 || cta.x + cta.w > 100 || cta.y + cta.h > 100;
    }

    function completeAnchors(anchors = defaultAnchors) {
      const next = ensureIndependentCopyAnchors({
        ...cloneAnchors(defaultAnchors),
        ...cloneAnchors(anchors || {})
      });
      if (shouldResetCtaAnchor(next)) next.cta = defaultCtaAnchorForText(next.text);
      next.cta = normalizeCtaAnchorRatio(next.cta, templateRatioSize);
      next.text = textAnchorFromChildren(next);
      return next;
    }

    function generationRuleForSize(size) {
      if (size && layoutRules[size.id]) return layoutRules[size.id];
      const ratio = size ? size.width / size.height : templateRatioSize.width / templateRatioSize.height;
      if (size && size.width === size.height) return layoutRules.square_1080x1080;
      if (ratio < 0.75) return layoutRules.story_1080x1920;
      if (ratio < 1) return layoutRules.portrait_1080x1350;
      if (ratio > 1.8) return layoutRules.wide_1920x1080;
      return layoutRules.landscape_1024x768;
    }

    function mirroredAnchor(anchor) {
      return { ...anchor, x: 100 - anchor.x - anchor.w };
    }

    function shouldFlipHorizontalRule(size, base = defaultAnchors) {
      if (!size || size.width <= size.height) return false;
      const imageCenter = (base.image?.x || 0) + (base.image?.w || 0) / 2;
      const text = textAnchorFromChildren(ensureIndependentCopyAnchors(base));
      const textCenter = (text.x || 0) + (text.w || 0) / 2;
      return imageCenter < textCenter;
    }

    function layoutAnchorsForSize(size, base = defaultAnchors) {
      const rule = generationRuleForSize(size);
      if (rule.exact) {
        const anchors = {
          image: { ...rule.image },
          ...(rule.imageVisibleArea ? { imageVisibleArea: { ...rule.imageVisibleArea } } : {}),
          ...(rule.imageVisualArea ? { imageVisualArea: { ...rule.imageVisualArea } } : {}),
          ...(rule.contentStack ? { contentStack: { ...rule.contentStack } } : {}),
          logo: { ...rule.logo },
          title: { ...rule.title },
          subtitle: { ...rule.subtitle },
          text: { ...(rule.text || {}) },
          cta: normalizeCtaAnchorRatio({ ...(rule.cta || defaultCtaAnchorForText(rule.text, size)) }, size),
          trust: { ...rule.trust }
        };
        if (!Object.keys(anchors.text).length) {
          anchors.text = textAnchorFromChildren(anchors);
        }
        anchors.text.align = anchors.title.align || anchors.subtitle.align || base.text?.align || anchors.text.align || 'left';
        return anchors;
      }
      if (size?.id === 'landscape_1200x628' || (size?.width === 1200 && size?.height === 628)) {
        return completeAnchors(base);
      }
      const anchors = {
        image: { ...rule.image },
        ...(rule.imageVisibleArea ? { imageVisibleArea: { ...rule.imageVisibleArea } } : {}),
        ...(rule.imageVisualArea ? { imageVisualArea: { ...rule.imageVisualArea } } : {}),
        text: { ...rule.text },
        cta: normalizeCtaAnchorRatio({ ...(rule.cta || defaultCtaAnchorForText(rule.text, size)) }, size),
        logo: { ...rule.logo },
        trust: { ...rule.trust }
      };
      if (Number.isFinite(Number(base.cta?.font))) anchors.cta.font = Number(base.cta.font);
      if (shouldFlipHorizontalRule(size, base)) {
        anchors.image = mirroredAnchor(anchors.image);
        if (anchors.imageVisibleArea) anchors.imageVisibleArea = mirroredAnchor(anchors.imageVisibleArea);
        if (anchors.imageVisualArea) anchors.imageVisualArea = mirroredAnchor(anchors.imageVisualArea);
        anchors.text = mirroredAnchor(anchors.text);
        anchors.cta = mirroredAnchor(anchors.cta);
        anchors.logo = { ...anchors.logo, x: anchors.text.x };
        anchors.trust = { ...anchors.trust, x: anchors.text.x };
      }
      if (anchors.image.y > anchors.text.y && anchors.cta.y + anchors.cta.h > anchors.image.y - 2) {
        anchors.cta.y = clamp(anchors.image.y - anchors.cta.h - 2, 0, 100 - anchors.cta.h);
      }
      anchors.text.align = base.title?.align || base.subtitle?.align || base.text?.align || anchors.text.align || 'left';
      return anchors;
    }

    function posterTextScale(size = templateRatioSize) {
      const ratio = sizeAspectRatio(size);
      if (ratio <= 0.34) return 1.9;
      if (ratio < 0.55) return 1.45;
      if (ratio < 0.8) return 1.2;
      return 1;
    }

    function basePosterAnchorsForSize(size, base = defaultAnchors) {
      const anchors = layoutAnchorsForSize(size, base);
      if (anchors.title && anchors.subtitle) {
        anchors.text = textAnchorFromChildren(anchors);
        return anchors;
      }
      const children = textChildAnchors(anchors.text, size);
      if (Number.isFinite(Number(base.title?.font))) children.title.font = Number(base.title.font);
      if (Number.isFinite(Number(base.subtitle?.font))) children.subtitle.font = Number(base.subtitle.font);
      return {
        ...anchors,
        ...children
      };
    }

    function previewFitDimensions(size, maxWidth, maxHeight) {
      const scale = Math.min(maxWidth / size.width, maxHeight / size.height);
      return {
        width: Math.max(1, Math.round(size.width * scale)),
        height: Math.max(1, Math.round(size.height * scale))
      };
    }

    function generatedPreviewFrameHeight(maxWidth) {
      return Math.max(360, maxWidth * (templateRatioSize.height / templateRatioSize.width));
    }

    return {
      clamp,
      cloneAnchors,
      sizeAspectRatio,
      normalizeCtaAnchorRatio,
      textAnchorFromChildren,
      ensureIndependentCopyAnchors,
      defaultCtaAnchorForText,
      completeAnchors,
      generationRuleForSize,
      layoutAnchorsForSize,
      posterTextScale,
      textChildAnchors,
      basePosterAnchorsForSize,
      previewFitDimensions,
      generatedPreviewFrameHeight
    };
  }

  window.createPosterCore = createPosterCore;
}());
