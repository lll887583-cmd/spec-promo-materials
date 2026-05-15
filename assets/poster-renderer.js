(function () {
  'use strict';

  function createPosterRenderer(options = {}) {
    const { posterCore, formatPct, materialCard, previewTitle, previewSubtitle, previewCta, getPreviewFontPercents = null } = options;
    let currentSize = null;
    let currentAnchors = null;

    function isShortWideLayout(size = currentSize) {
      const width = Number(size?.width) || 0;
      const height = Number(size?.height) || 0;
      return height > 0 && width / height >= 3 && height > 180 && height <= 300;
    }

    function setAnchorVars(prefix, anchor) {
      materialCard.style.setProperty(`--${prefix}-x`, formatPct(anchor.x));
      materialCard.style.setProperty(`--${prefix}-y`, formatPct(anchor.y));
      materialCard.style.setProperty(`--${prefix}-w`, formatPct(anchor.w));
      materialCard.style.setProperty(`--${prefix}-h`, formatPct(anchor.h));
    }

    function cardPixelsFromPercent(percent, axis = 'x') {
      const rect = materialCard.getBoundingClientRect();
      const basis = axis === 'y' ? rect.height : rect.width;
      return (Number(percent) / 100) * Math.max(1, basis);
    }

    function anchorRect(anchor, fallback = null) {
      const cardRect = materialCard.getBoundingClientRect();
      if (!anchor) return fallback || { left: cardRect.left, top: cardRect.top, right: cardRect.right, bottom: cardRect.bottom, width: cardRect.width, height: cardRect.height };
      const left = cardRect.left + (Number(anchor.x) || 0) / 100 * cardRect.width;
      const top = cardRect.top + (Number(anchor.y) || 0) / 100 * cardRect.height;
      const width = Math.max(1, (Number(anchor.w) || 0) / 100 * cardRect.width);
      const height = Math.max(1, (Number(anchor.h) || 0) / 100 * cardRect.height);
      return { left, top, right: left + width, bottom: top + height, width, height };
    }

    function setManualAdjustState(needsManualAdjust, reason = '') {
      materialCard.classList.toggle('needs-manual-adjust', Boolean(needsManualAdjust));
      materialCard.dataset.adjustmentState = needsManualAdjust ? '需手动调整' : '';
      materialCard.dataset.adjustmentReason = reason || '';
      materialCard.dispatchEvent(new CustomEvent('poster-layout-status', {
        detail: { needsManualAdjust: Boolean(needsManualAdjust), reason }
      }));
    }

    function setPosterFontVars(anchors, size) {
      const textScale = posterCore.posterTextScale(size);
      const sizeHeight = Math.max(1, Number(size?.height) || 1);
      const fontPercentForPreview = (anchor, fallbackPercent) => {
        const fontPx = Number(anchor?.fontPx);
        const fontScale = Number(anchor?.fontScale);
        if (Number.isFinite(fontPx) && fontPx > 0) {
          return (fontPx * (Number.isFinite(fontScale) && fontScale > 0 ? fontScale : 1) / sizeHeight) * 100;
        }
        return Number(anchor?.font) || fallbackPercent;
      };
      const stableFonts = typeof getPreviewFontPercents === 'function' ? getPreviewFontPercents(size, anchors) : null;
      const hasExplicitFont = anchor => (Number.isFinite(Number(anchor?.fontPx)) && Number(anchor.fontPx) > 0) || (Number.isFinite(Number(anchor?.font)) && Number(anchor.font) > 0);
      const titleFont = hasExplicitFont(anchors.title) ? fontPercentForPreview(anchors.title, Math.max(1, anchors.title.h * 0.58 * textScale)) : (Number(stableFonts?.title) || Math.max(1, anchors.title.h * 0.58 * textScale));
      const subtitleFont = hasExplicitFont(anchors.subtitle) ? fontPercentForPreview(anchors.subtitle, Math.max(1, anchors.subtitle.h * 0.30 * textScale)) : (Number(stableFonts?.subtitle) || Math.max(1, anchors.subtitle.h * 0.30 * textScale));
      const ctaFont = hasExplicitFont(anchors.cta) ? fontPercentForPreview(anchors.cta, Math.max(1, anchors.cta.h * 0.38)) : (Number(stableFonts?.cta) || Math.max(1, anchors.cta.h * 0.38));
      materialCard.style.setProperty('--title-font', `max(1px, ${titleFont}cqh)`);
      materialCard.style.setProperty('--subtitle-font', `max(1px, ${subtitleFont}cqh)`);
      materialCard.style.setProperty('--cta-font', `max(1px, ${ctaFont}cqh)`);
      if (Number.isFinite(Number(anchors.cta.padX))) {
        materialCard.style.setProperty('--cta-pad-x', `${Number(anchors.cta.padX)}cqw`);
      } else {
        materialCard.style.removeProperty('--cta-pad-x');
      }
      if (Number.isFinite(Number(anchors.cta.padY))) {
        materialCard.style.setProperty('--cta-pad-y', `${Number(anchors.cta.padY)}cqh`);
      } else {
        materialCard.style.removeProperty('--cta-pad-y');
      }
      if (Number.isFinite(Number(anchors.cta.lineHeight))) {
        materialCard.style.setProperty('--cta-line-height', String(Number(anchors.cta.lineHeight)));
      } else {
        materialCard.style.setProperty('--cta-line-height', '1.4');
      }
      if (Number.isFinite(Number(anchors.title.lineHeight))) {
        materialCard.style.setProperty('--title-line-height', String(Number(anchors.title.lineHeight)));
      } else {
        materialCard.style.setProperty('--title-line-height', '1.4');
      }
      if (Number.isFinite(Number(anchors.subtitle.lineHeight))) {
        materialCard.style.setProperty('--subtitle-line-height', String(Number(anchors.subtitle.lineHeight)));
      } else {
        materialCard.style.setProperty('--subtitle-line-height', '1.4');
      }
      materialCard.style.removeProperty('--cta-max-w');
    }

    function setAnchorVisibility(anchors) {
      ['image', 'logo', 'title', 'subtitle', 'cta'].forEach(key => {
        materialCard.classList.toggle(`hide-poster-${key}`, Boolean(anchors[key]?.hidden));
      });
    }

    function fitTextElement(element, minSize = 6, resetFontSize = true) {
      if (!element || !element.offsetParent) return;
      if (resetFontSize) element.style.removeProperty('font-size');
      element.style.overflow = 'visible';
      element.style.whiteSpace = 'pre-wrap';
      element.style.lineHeight = '1.4';
    }

    function keepElementInsideCard(element) {
      if (!element || !element.offsetParent) return;
      element.style.removeProperty('transform');
      const cardRect = materialCard.getBoundingClientRect();
      const rect = element.getBoundingClientRect();
      let offsetX = 0;
      if (rect.right > cardRect.right) offsetX -= rect.right - cardRect.right;
      if (rect.left + offsetX < cardRect.left) offsetX += cardRect.left - (rect.left + offsetX);
      if (offsetX) element.style.transform = `translateX(${offsetX}px)`;
    }

    function fitCtaElement() {
      if (!previewCta || !previewCta.offsetParent) return;
      previewCta.style.removeProperty('font-size');
      previewCta.style.removeProperty('transform');
      previewCta.style.overflow = 'visible';
      previewCta.style.textOverflow = 'clip';
      previewCta.style.whiteSpace = 'normal';
    }

    function fitCtaElementInsideSafeArea(anchor = currentAnchors?.cta || {}) {
      if (!previewCta || !previewCta.offsetParent) return;
      previewCta.style.removeProperty('font-size');
      previewCta.style.removeProperty('transform');
      previewCta.style.removeProperty('padding-left');
      previewCta.style.removeProperty('padding-right');
      previewCta.style.removeProperty('max-width');
      previewCta.style.overflow = 'visible';
      previewCta.style.textOverflow = 'clip';
      previewCta.style.whiteSpace = 'normal';

      const defaultWidth = Math.max(1, cardPixelsFromPercent(Number(anchor.w) || 1, 'x'));
      const isAutoWidth = anchor.autoWidth === true;
      previewCta.style.width = isAutoWidth ? 'max-content' : `${defaultWidth}px`;

      const computed = window.getComputedStyle(previewCta);
      const startSize = Number.parseFloat(computed.fontSize) || 6;
      previewCta.style.fontSize = `${startSize}px`;
    }

    function resetTitleAvoidance() {
      if (!previewTitle) return;
      previewTitle.style.removeProperty('left');
      previewTitle.style.removeProperty('width');
      previewTitle.style.removeProperty('height');
      previewTitle.style.removeProperty('display');
      previewTitle.style.removeProperty('overflow');
      previewTitle.style.removeProperty('white-space');
    }

    function resetVerticalTextFlow() {
      [previewTitle, previewSubtitle].forEach(element => {
        if (!element) return;
        element.style.removeProperty('max-height');
        element.style.removeProperty('height');
        element.style.removeProperty('display');
        element.style.removeProperty('overflow');
        element.style.removeProperty('white-space');
        element.style.removeProperty('font-size');
        element.style.removeProperty('line-height');
        element.style.removeProperty('-webkit-line-clamp');
        element.style.removeProperty('-webkit-box-orient');
      });
      if (previewSubtitle) previewSubtitle.style.removeProperty('top');
      if (previewCta) previewCta.style.removeProperty('top');
      if (previewCta) {
        previewCta.style.removeProperty('max-width');
        previewCta.style.removeProperty('padding-left');
        previewCta.style.removeProperty('padding-right');
        previewCta.style.removeProperty('text-overflow');
        previewCta.style.removeProperty('overflow');
      }
      if (currentAnchors?.image) setAnchorVars('image', currentAnchors.image);
      else {
        materialCard.style.removeProperty('--image-y');
        materialCard.style.removeProperty('--image-h');
      }
      setManualAdjustState(false);
    }

    function horizontalOverlapRatio(a, b) {
      const overlap = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
      return overlap / Math.max(1, Math.min(a.width, b.width));
    }

    function applyImageLetWay(bottomLimit) {
      if (isShortWideLayout() || !previewCta?.offsetParent) return;
      const imageLayer = [...materialCard.querySelectorAll('.poster-product-layer, .poster-image-placeholder')]
        .find(element => element.offsetParent);
      if (!imageLayer?.offsetParent) return;
      const cardRect = materialCard.getBoundingClientRect();
      const titleRect = previewTitle?.offsetParent ? previewTitle.getBoundingClientRect() : null;
      const subtitleRect = previewSubtitle?.offsetParent ? previewSubtitle.getBoundingClientRect() : null;
      const ctaRect = previewCta.getBoundingClientRect();
      const imageRect = imageLayer.getBoundingClientRect();
      const contentLeft = Math.min(titleRect?.left ?? ctaRect.left, subtitleRect?.left ?? ctaRect.left, ctaRect.left);
      const contentRight = Math.max(titleRect?.right ?? ctaRect.right, subtitleRect?.right ?? ctaRect.right, ctaRect.right);
      const contentRect = { left: contentLeft, right: contentRight, width: contentRight - contentLeft };
      if (horizontalOverlapRatio(contentRect, imageRect) < 0.18) return;
      const imageGap = Math.max(6, cardRect.height * 0.035);
      const nextTop = Math.max(imageRect.top, ctaRect.bottom + imageGap);
      if (nextTop <= imageRect.top + 1) return;
      const visibleBottom = Math.min(imageRect.bottom, bottomLimit);
      const nextHeight = Math.max(cardRect.height * 0.12, visibleBottom - nextTop);
      materialCard.style.setProperty('--image-y', `${((nextTop - cardRect.top) / cardRect.height) * 100}%`);
      materialCard.style.setProperty('--image-h', `${(nextHeight / cardRect.height) * 100}%`);
      materialCard.dispatchEvent(new CustomEvent('poster-layout-adjusted'));
    }

    function applyHorizontalTitleAvoidance() {
      if (!previewTitle || !previewTitle.offsetParent || !previewCta?.offsetParent) return false;
      const logo = materialCard.querySelector('.creative-logo');
      const cardRect = materialCard.getBoundingClientRect();
      const titleRect = previewTitle.getBoundingClientRect();
      const ctaRect = previewCta.getBoundingClientRect();
      const logoRect = logo?.offsetParent ? logo.getBoundingClientRect() : null;
      const gap = Math.max(4, cardRect.width * 0.015);
      const leftLimit = logoRect ? Math.max(titleRect.left, logoRect.right + gap) : titleRect.left;
      const rightLimit = Math.min(titleRect.right, ctaRect.left - gap);
      const nextWidth = rightLimit - leftLimit;
      if (nextWidth <= 1) return false;
      previewTitle.style.left = `${leftLimit - cardRect.left}px`;
      previewTitle.style.width = `${nextWidth}px`;
      previewTitle.style.whiteSpace = 'nowrap';
      return true;
    }

    function applyVerticalTextFlow() {
      if (!previewTitle?.offsetParent || !previewSubtitle?.offsetParent) return;
      const cardRect = materialCard.getBoundingClientRect();
      const originalTitleRect = previewTitle.getBoundingClientRect();
      const originalSubtitleRect = previewSubtitle.getBoundingClientRect();
      const originalCtaRect = previewCta?.offsetParent ? previewCta.getBoundingClientRect() : null;
      const titleSubtitleGap = Math.max(4, originalSubtitleRect.top - originalTitleRect.bottom);
      const subtitleCtaGap = originalCtaRect ? Math.max(6, originalCtaRect.top - originalSubtitleRect.bottom) : Math.max(6, cardRect.height * 0.035);

      previewTitle.style.height = 'auto';
      previewTitle.style.display = 'block';
      previewTitle.style.overflow = 'visible';
      previewTitle.style.whiteSpace = 'pre-wrap';
      previewSubtitle.style.height = 'auto';
      previewSubtitle.style.display = 'block';
      previewSubtitle.style.overflow = 'visible';
      previewSubtitle.style.whiteSpace = 'pre-wrap';

      const flowedTitleRect = previewTitle.getBoundingClientRect();
      previewSubtitle.style.top = `${flowedTitleRect.bottom - cardRect.top + titleSubtitleGap}px`;
      const flowedSubtitleRect = previewSubtitle.getBoundingClientRect();
      if (previewCta) previewCta.style.top = `${flowedSubtitleRect.bottom - cardRect.top + subtitleCtaGap}px`;
      fitCtaElement();
      const flowedCtaRect = previewCta?.offsetParent ? previewCta.getBoundingClientRect() : null;
      if (flowedCtaRect) {
        const bottomPadding = Math.max(4, cardRect.height * 0.04);
        const logo = materialCard.querySelector('.creative-logo');
        const logoRect = logo?.offsetParent ? logo.getBoundingClientRect() : null;
        const safeTop = logoRect ? logoRect.bottom - cardRect.top + Math.max(4, cardRect.height * 0.016) : 0;
        const allowGroupShift = isShortWideLayout();
        const overflow = flowedCtaRect.bottom - (cardRect.bottom - bottomPadding);
        if (allowGroupShift && overflow > 0) {
          const titleTop = previewTitle.getBoundingClientRect().top - cardRect.top;
          const shift = Math.min(overflow, Math.max(0, titleTop - safeTop));
          [previewTitle, previewSubtitle, previewCta].forEach(element => {
            if (!element) return;
            const nextTop = element.getBoundingClientRect().top - cardRect.top - shift;
            element.style.top = `${nextTop}px`;
          });
          fitCtaElement();
        }
        const adjustedCtaRect = previewCta?.offsetParent ? previewCta.getBoundingClientRect() : null;
        const remainingOverflow = adjustedCtaRect ? adjustedCtaRect.bottom - (cardRect.bottom - bottomPadding) : 0;
        if (remainingOverflow > 0) {
          const adjustedTitleRect = previewTitle.getBoundingClientRect();
          const adjustedSubtitleRect = previewSubtitle.getBoundingClientRect();
          const minTitleSubtitleGap = Math.max(4, cardRect.height * 0.016);
          const minSubtitleCtaGap = Math.max(6, cardRect.height * 0.024);
          const currentTitleSubtitleGap = Math.max(0, adjustedSubtitleRect.top - adjustedTitleRect.bottom);
          const currentSubtitleCtaGap = adjustedCtaRect ? Math.max(0, adjustedCtaRect.top - adjustedSubtitleRect.bottom) : 0;
          const titleGapReduce = Math.min(Math.max(0, currentTitleSubtitleGap - minTitleSubtitleGap), remainingOverflow);
          const ctaGapReduce = Math.min(Math.max(0, currentSubtitleCtaGap - minSubtitleCtaGap), remainingOverflow - titleGapReduce);
          if (titleGapReduce > 0 || ctaGapReduce > 0) {
            previewSubtitle.style.top = `${adjustedSubtitleRect.top - cardRect.top - titleGapReduce}px`;
            if (previewCta) previewCta.style.top = `${adjustedCtaRect.top - cardRect.top - titleGapReduce - ctaGapReduce}px`;
            fitCtaElement();
          }
        }
        applyImageLetWay(cardRect.bottom - bottomPadding);
      }
    }

    function fitPosterTextBoxes() {
      resetTitleAvoidance();
      resetVerticalTextFlow();
      [previewTitle, previewSubtitle].forEach(element => {
        if (!element) return;
        element.style.removeProperty('font-size');
        element.style.removeProperty('max-height');
        element.style.removeProperty('-webkit-line-clamp');
        element.style.removeProperty('-webkit-box-orient');
        element.style.overflow = 'visible';
        element.style.whiteSpace = 'pre-wrap';
        element.style.lineHeight = '1.4';
      });
      fitCtaElementInsideSafeArea(currentAnchors?.cta || {});
      setManualAdjustState(false);
    }

    function applyLayoutVariables(anchors, size) {
      currentSize = size;
      currentAnchors = anchors;
      setAnchorVars('image', anchors.image);
      setAnchorVars('text', anchors.text);
      setAnchorVars('title', anchors.title);
      setAnchorVars('subtitle', anchors.subtitle);
      setAnchorVars('cta', anchors.cta);
      setAnchorVars('logo', anchors.logo);
      setAnchorVars('trust', anchors.trust);
      setAnchorVisibility(anchors);
      materialCard.style.setProperty('--text-align', anchors.title.align || anchors.subtitle.align || anchors.text.align || 'left');
      materialCard.style.setProperty('--title-v-justify', anchors.title.vAlign === 'center' ? 'center' : 'flex-start');
      setPosterFontVars(anchors, size);
    }

    function canvasRect(anchor, width, height) {
      return {
        x: (anchor.x / 100) * width,
        y: (anchor.y / 100) * height,
        w: (anchor.w / 100) * width,
        h: (anchor.h / 100) * height
      };
    }

    function visibleAnchorWithinCanvas(anchor) {
      if (!anchor || anchor.hidden) return anchor;
      const left = posterCore.clamp(Number(anchor.x) || 0, 0, 100);
      const top = posterCore.clamp(Number(anchor.y) || 0, 0, 100);
      const right = posterCore.clamp((Number(anchor.x) || 0) + (Number(anchor.w) || 0), 0, 100);
      const bottom = posterCore.clamp((Number(anchor.y) || 0) + (Number(anchor.h) || 0), 0, 100);
      if (right <= left || bottom <= top) return anchor;
      return { ...anchor, x: left, y: top, w: right - left, h: bottom - top };
    }

    function imageVisualAnchor(anchors = {}) {
      return anchors.imageVisibleArea || anchors.imageVisualArea || visibleAnchorWithinCanvas(anchors.image);
    }

    function canvasAnchorFontSize(anchor, fallbackSize, canvasHeight) {
      const fontPx = Number(anchor?.fontPx);
      const fontScale = Number(anchor?.fontScale);
      if (Number.isFinite(fontPx) && fontPx > 0) {
        return Math.max(1, Math.round(fontPx * (Number.isFinite(fontScale) && fontScale > 0 ? fontScale : 1)));
      }
      const font = Number(anchor?.font);
      return Number.isFinite(font) && font > 0 ? Math.round((font / 100) * canvasHeight) : fallbackSize;
    }

    function canvasBackgroundFill(ctx, styles, width, height) {
      if (styles.backgroundMode !== 'gradient') return styles.backgroundColor;
      const angle = (((Number(styles.gradientAngle) || 0) - 90) * Math.PI) / 180;
      const half = Math.abs(width * Math.cos(angle)) + Math.abs(height * Math.sin(angle));
      const centerX = width / 2;
      const centerY = height / 2;
      const gradient = ctx.createLinearGradient(
        centerX - Math.cos(angle) * half / 2,
        centerY - Math.sin(angle) * half / 2,
        centerX + Math.cos(angle) * half / 2,
        centerY + Math.sin(angle) * half / 2
      );
      gradient.addColorStop(0, styles.gradientStart);
      gradient.addColorStop(1, styles.gradientEnd);
      return gradient;
    }

    function drawRoundedRectPath(ctx, x, y, width, height, radius) {
      const r = Math.max(0, Math.min(radius, width / 2, height / 2));
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, width, height, r);
        return;
      }
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + width - r, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + r);
      ctx.lineTo(x + width, y + height - r);
      ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
      ctx.lineTo(x + r, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
    }

    function productDrawGeometry(image, clipRect, adjustment = { scale: 1, x: 0, y: 0 }, visualRect = clipRect) {
      const targetRect = visualRect?.w > 0 && visualRect?.h > 0 ? visualRect : clipRect;
      const imageRatio = image.naturalWidth / image.naturalHeight;
      const targetRatio = targetRect.w / targetRect.h;
      let baseW = targetRect.w;
      let baseH = targetRect.h;
      if (imageRatio > targetRatio) baseW = targetRect.h * imageRatio;
      else baseH = targetRect.w / imageRatio;
      const scale = posterCore.clamp(Number(adjustment?.scale) || 1, 1, 4);
      const drawW = baseW * scale;
      const drawH = baseH * scale;
      const maxX = Math.max(0, (drawW - targetRect.w) / (2 * targetRect.w));
      const maxY = Math.max(0, (drawH - targetRect.h) / (2 * targetRect.h));
      const x = posterCore.clamp(Number(adjustment?.x) || 0, -maxX, maxX);
      const y = posterCore.clamp(Number(adjustment?.y) || 0, -maxY, maxY);
      return {
        x: targetRect.x + (targetRect.w - drawW) / 2 + x * targetRect.w,
        y: targetRect.y + (targetRect.h - drawH) / 2 + y * targetRect.h,
        w: drawW,
        h: drawH
      };
    }

    return {
      setAnchorVars,
      setPosterFontVars,
      fitTextElement,
      fitPosterTextBoxes,
      applyLayoutVariables,
      canvasRect,
      visibleAnchorWithinCanvas,
      imageVisualAnchor,
      canvasAnchorFontSize,
      canvasBackgroundFill,
      drawRoundedRectPath,
      productDrawGeometry,
      setAnchorVisibility
    };
  }

  window.createPosterRenderer = createPosterRenderer;
}());
