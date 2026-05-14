(function () {
  'use strict';

  function createPosterRenderer(options = {}) {
    const { posterCore, formatPct, materialCard, previewTitle, previewSubtitle, previewCta } = options;

    function setAnchorVars(prefix, anchor) {
      materialCard.style.setProperty(`--${prefix}-x`, formatPct(anchor.x));
      materialCard.style.setProperty(`--${prefix}-y`, formatPct(anchor.y));
      materialCard.style.setProperty(`--${prefix}-w`, formatPct(anchor.w));
      materialCard.style.setProperty(`--${prefix}-h`, formatPct(anchor.h));
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
      const titleFont = fontPercentForPreview(anchors.title, Math.max(1, anchors.title.h * 0.58 * textScale));
      const subtitleFont = fontPercentForPreview(anchors.subtitle, Math.max(1, anchors.subtitle.h * 0.30 * textScale));
      const ctaFont = fontPercentForPreview(anchors.cta, Math.max(1, anchors.cta.h * 0.38));
      materialCard.style.setProperty('--title-font', `clamp(6px, ${titleFont}cqh, 84px)`);
      materialCard.style.setProperty('--subtitle-font', `clamp(5px, ${subtitleFont}cqh, 44px)`);
      materialCard.style.setProperty('--cta-font', `clamp(5px, ${ctaFont}cqh, 72px)`);
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
        materialCard.style.removeProperty('--cta-line-height');
      }
    }

    function setAnchorVisibility(anchors) {
      ['image', 'logo', 'title', 'subtitle', 'cta'].forEach(key => {
        materialCard.classList.toggle(`hide-poster-${key}`, Boolean(anchors[key]?.hidden));
      });
    }

    function fitTextElement(element, minSize = 6, resetFontSize = true) {
      if (!element || !element.offsetParent) return;
      if (resetFontSize) element.style.removeProperty('font-size');
      const computed = window.getComputedStyle(element);
      const startSize = Number.parseFloat(computed.fontSize) || minSize;
      let low = minSize;
      let high = startSize;
      let best = minSize;
      for (let index = 0; index < 8; index += 1) {
        const mid = (low + high) / 2;
        element.style.fontSize = `${mid}px`;
        const fits = element.scrollWidth <= element.clientWidth + 1 && element.scrollHeight <= element.clientHeight + 1;
        if (fits) {
          best = mid;
          low = mid;
        } else {
          high = mid;
        }
      }
      element.style.fontSize = `${best}px`;
    }

    function fitPosterTextBoxes() {
      fitTextElement(previewSubtitle, 5, true);
      const subtitleSize = previewSubtitle ? Number.parseFloat(window.getComputedStyle(previewSubtitle).fontSize) : 0;
      fitTextElement(previewTitle, Math.max(6, subtitleSize * 1.15), true);
      if (previewCta) previewCta.style.removeProperty('font-size');
    }

    function applyLayoutVariables(anchors, size) {
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
