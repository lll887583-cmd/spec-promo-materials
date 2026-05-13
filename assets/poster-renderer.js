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
      const titleFont = Number(anchors.title.font) || Math.max(1, anchors.title.h * 0.58 * textScale);
      const subtitleFont = Number(anchors.subtitle.font) || Math.max(1, anchors.subtitle.h * 0.30 * textScale);
      const ctaFont = Number(anchors.cta.font) || Math.max(1, anchors.cta.h * 0.38);
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
      fitTextElement(previewTitle, 6, true);
      fitTextElement(previewSubtitle, 5, true);
      fitTextElement(previewCta, 5, true);
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

    function canvasAnchorFontSize(anchor, fallbackSize, canvasHeight) {
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

    function productDrawGeometry(image, rect, adjustment = { scale: 1, x: 0, y: 0 }) {
      const imageRatio = image.naturalWidth / image.naturalHeight;
      const targetRatio = rect.w / rect.h;
      let baseW = rect.w;
      let baseH = rect.h;
      if (imageRatio > targetRatio) baseW = rect.h * imageRatio;
      else baseH = rect.w / imageRatio;
      const scale = posterCore.clamp(Number(adjustment.scale) || 1, 1, 4);
      const drawW = baseW * scale;
      const drawH = baseH * scale;
      const maxX = Math.max(0, (drawW - rect.w) / (2 * rect.w));
      const maxY = Math.max(0, (drawH - rect.h) / (2 * rect.h));
      const x = posterCore.clamp(Number(adjustment.x) || 0, -maxX, maxX);
      const y = posterCore.clamp(Number(adjustment.y) || 0, -maxY, maxY);
      return {
        x: rect.x + (rect.w - drawW) / 2 + x * rect.w,
        y: rect.y + (rect.h - drawH) / 2 + y * rect.h,
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
      canvasAnchorFontSize,
      canvasBackgroundFill,
      drawRoundedRectPath,
      productDrawGeometry,
      setAnchorVisibility
    };
  }

  window.createPosterRenderer = createPosterRenderer;
}());
