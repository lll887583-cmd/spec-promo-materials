(function () {
  'use strict';

  const CANVAS_FONT_FAMILY = 'Arial, "Noto Sans CJK SC", "PingFang SC", sans-serif';

  function createPosterCanvasRenderer(options = {}) {
    const {
      posterCore,
      posterRenderer,
      loadCanvasImage,
      getUploadedImageSrc,
      getProductAdjustment,
      getPosterAnchors,
      getPosterStyles,
      getLogoBrand,
      getLogoSrc,
      getLogoVariant
    } = options;

    function wrapCanvasText(ctx, text, maxWidth, maxLines = 3) {
      const sourceLines = String(text || '').split('\n');
      const lines = [];
      sourceLines.forEach(sourceLine => {
        const hasSpaces = /\s/.test(sourceLine.trim());
        const parts = hasSpaces ? sourceLine.split(/(\s+)/).filter(Boolean) : [...sourceLine];
        let current = '';
        parts.forEach(part => {
          const next = current + part;
          if (current && ctx.measureText(next).width > maxWidth) {
            lines.push(current.trim());
            current = part.trimStart();
          } else {
            current = next;
          }
        });
        if (current) lines.push(current.trim());
      });
      return lines.slice(0, maxLines);
    }

    function fitWrappedCanvasText(ctx, text, maxWidth, maxHeight, startSize, minSize, weight = 700, lineHeight = 1.15) {
      const safeStartSize = Math.max(1, Number(startSize) || 1);
      const safeMinSize = Math.max(1, Math.min(Number(minSize) || safeStartSize, safeStartSize));
      let best = { size: safeMinSize, lines: [] };
      for (let size = safeStartSize; size >= safeMinSize; size -= 1) {
        ctx.font = `${weight} ${size}px ${CANVAS_FONT_FAMILY}`;
        const maxLines = Math.max(1, Math.floor(maxHeight / Math.max(1, size * lineHeight)));
        const lines = wrapCanvasText(ctx, text, maxWidth, Number.POSITIVE_INFINITY);
        const textHeight = lines.length * size * lineHeight;
        const fitsWidth = lines.every(line => ctx.measureText(line).width <= maxWidth + 1);
        if (lines.length <= maxLines && fitsWidth && textHeight <= maxHeight + 1) {
          best = { size, lines };
          break;
        }
        best = { size: safeMinSize, lines };
      }
      ctx.font = `${weight} ${best.size}px ${CANVAS_FONT_FAMILY}`;
      if (!best.lines.length) best.lines = wrapCanvasText(ctx, text, maxWidth, Number.POSITIVE_INFINITY);
      const visibleLines = Math.max(1, Math.floor(maxHeight / Math.max(1, best.size * lineHeight)));
      best.lines = best.lines.slice(0, visibleLines);
      return best;
    }

    function fitSingleLineCanvasText(ctx, text, maxWidth, startSize, minSize, weight = 700) {
      const safeStartSize = Math.max(1, Number(startSize) || 1);
      const safeMinSize = Math.max(1, Math.min(Number(minSize) || safeStartSize, safeStartSize));
      const line = String(text || '').replace(/\s+/g, ' ').trim();
      for (let size = safeStartSize; size >= safeMinSize; size -= 1) {
        ctx.font = `${weight} ${size}px ${CANVAS_FONT_FAMILY}`;
        if (ctx.measureText(line).width <= maxWidth + 1) return { size, lines: [line] };
      }
      ctx.font = `${weight} ${safeMinSize}px ${CANVAS_FONT_FAMILY}`;
      return { size: safeMinSize, lines: [line] };
    }

    function drawAdjustedProductImage(ctx, image, rect, visualRect, size) {
      const draw = posterRenderer.productDrawGeometry(image, rect, getProductAdjustment(size), visualRect);

      ctx.save();
      ctx.beginPath();
      ctx.rect(rect.x, rect.y, rect.w, rect.h);
      ctx.clip();
      ctx.drawImage(image, draw.x, draw.y, draw.w, draw.h);
      ctx.restore();
    }

    async function drawPosterToCanvas(canvas, size, copy, languageIndex, asset = null) {
      const width = size.width;
      const height = size.height;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      const posterAnchors = getPosterAnchors(size, asset);
      const posterStyles = getPosterStyles(asset);
      const imageRect = posterRenderer.canvasRect(posterAnchors.image, width, height);
      const imageVisualRect = posterRenderer.canvasRect(posterRenderer.imageVisualAnchor(posterAnchors), width, height);
      const titleRect = posterRenderer.canvasRect(posterAnchors.title, width, height);
      const subtitleRect = posterRenderer.canvasRect(posterAnchors.subtitle, width, height);
      const ctaRect = posterRenderer.canvasRect(posterAnchors.cta, width, height);
      const logoRect = posterRenderer.canvasRect(posterAnchors.logo, width, height);

      ctx.fillStyle = posterRenderer.canvasBackgroundFill(ctx, posterStyles, width, height);
      ctx.fillRect(0, 0, width, height);

      const uploadedImageSrc = getUploadedImageSrc();
      if (!posterAnchors.image.hidden && uploadedImageSrc) {
        try {
          const productImage = await loadCanvasImage(uploadedImageSrc);
          drawAdjustedProductImage(ctx, productImage, imageRect, imageVisualRect, size);
        } catch (error) {
          console.warn('Uploaded image failed to load for download', error);
        }
      }

      if (!posterAnchors.logo.hidden) {
        try {
          const logo = await loadCanvasImage(getLogoSrc(getLogoBrand(languageIndex), getLogoVariant(asset, posterStyles)));
          const logoW = logoRect.w;
          const logoH = Math.min(logoRect.h, logoW * (logo.naturalHeight / logo.naturalWidth));
          ctx.drawImage(logo, logoRect.x, logoRect.y, logoW, logoH);
        } catch (error) {
          console.warn('Logo failed to load for download', error);
        }
      }

      const isCenter = (posterAnchors.title.align || posterAnchors.text.align) === 'center';
      const titleX = isCenter ? titleRect.x + titleRect.w / 2 : titleRect.x;
      const subtitleX = isCenter ? subtitleRect.x + subtitleRect.w / 2 : subtitleRect.x;
      ctx.fillStyle = posterStyles.textColor;
      ctx.textAlign = isCenter ? 'center' : 'left';
      ctx.textBaseline = 'top';
      const textScale = posterCore.posterTextScale(size);
      const ctaPaddingScale = Math.max(0.08, Math.min(width / 1200, height / 628));
      const ctaPaddingX = Number.isFinite(Number(posterAnchors.cta.padX))
        ? Math.max(1, (Number(posterAnchors.cta.padX) / 100) * width)
        : Math.max(4, 40 * ctaPaddingScale);
      const ctaPaddingY = Number.isFinite(Number(posterAnchors.cta.padY))
        ? Math.max(1, (Number(posterAnchors.cta.padY) / 100) * height)
        : Math.max(2, 20 * ctaPaddingScale);
      let ctaFontSize = posterRenderer.canvasAnchorFontSize(posterAnchors.cta, Math.max(8, Math.round(ctaRect.h * 0.38)), height);
      const ctaDrawH = ctaRect.h;
      let ctaDrawY = ctaRect.y;
      const ctaText = String(copy.cta || '').replace(/\s+/g, ' ').trim();
      ctx.font = `700 ${ctaFontSize}px ${CANVAS_FONT_FAMILY}`;
      let ctaDrawW = Math.max(1, ctx.measureText(ctaText).width + ctaPaddingX * 2);
      if (ctaDrawW > width) {
        const targetTextWidth = Math.max(1, width - ctaPaddingX * 2);
        const ratio = targetTextWidth / Math.max(1, ctx.measureText(ctaText).width);
        ctaFontSize = Math.max(6, Math.floor(ctaFontSize * Math.max(0.7, ratio)));
        ctx.font = `700 ${ctaFontSize}px ${CANVAS_FONT_FAMILY}`;
        ctaDrawW = Math.min(width, Math.max(1, ctx.measureText(ctaText).width + ctaPaddingX * 2));
      }
      const ctaDrawX = Math.max(0, Math.min(ctaRect.x, width - ctaDrawW));
      const subtitleHidden = Boolean(posterAnchors.subtitle.hidden);
      if (!posterAnchors.title.hidden) {
        const titleGap = Math.max(4, width * 0.015);
        const titleLeft = subtitleHidden ? Math.max(titleRect.x, logoRect.x + logoRect.w + titleGap) : titleRect.x;
        const titleWidth = subtitleHidden ? Math.max(1, Math.min(titleRect.x + titleRect.w, ctaDrawX - titleGap) - titleLeft) : titleRect.w;
        const titleStartSize = posterRenderer.canvasAnchorFontSize(posterAnchors.title, Math.round(titleRect.h * 0.58 * textScale), height);
        let titleFit;
        let titleLineHeight;
        let titleStartY;
        if (subtitleHidden) {
          titleFit = fitSingleLineCanvasText(ctx, copy.title, titleWidth, titleStartSize, 6, 700);
          titleLineHeight = titleFit.size * 1.06;
          titleStartY = posterAnchors.title.vAlign === 'center'
            ? titleRect.y + Math.max(0, (titleRect.h - titleLineHeight) / 2)
            : titleRect.y;
        } else {
          ctx.font = `700 ${titleStartSize}px ${CANVAS_FONT_FAMILY}`;
          titleFit = { size: titleStartSize, lines: wrapCanvasText(ctx, copy.title, titleWidth, Number.POSITIVE_INFINITY) };
          titleLineHeight = titleStartSize * 1.06;
          titleStartY = titleRect.y;
        }
        titleFit.lines.forEach((line, index) => {
          ctx.font = `700 ${titleFit.size}px ${CANVAS_FONT_FAMILY}`;
          ctx.fillText(line, isCenter ? titleLeft + titleWidth / 2 : titleLeft, titleStartY + index * titleLineHeight);
        });

        if (!subtitleHidden) {
          const titleSubtitleGap = Math.max(4, subtitleRect.y - (titleRect.y + titleRect.h));
          const subtitleStartSize = posterRenderer.canvasAnchorFontSize(posterAnchors.subtitle, Math.max(8, Math.round(subtitleRect.h * 0.30 * textScale)), height);
          const subtitleDrawY = titleStartY + titleFit.lines.length * titleLineHeight + titleSubtitleGap;
          ctx.font = `400 ${subtitleStartSize}px ${CANVAS_FONT_FAMILY}`;
          const subtitleLines = wrapCanvasText(ctx, copy.subtitle, subtitleRect.w, Number.POSITIVE_INFINITY);
          const subtitleLineHeight = subtitleStartSize * 1.48;
          subtitleLines.forEach((line, index) => {
            ctx.font = `400 ${subtitleStartSize}px ${CANVAS_FONT_FAMILY}`;
            ctx.fillText(line, subtitleX, subtitleDrawY + index * subtitleLineHeight);
          });
          const subtitleCtaGap = Math.max(6, ctaRect.y - (subtitleRect.y + subtitleRect.h));
          ctaDrawY = subtitleDrawY + subtitleLines.length * subtitleLineHeight + subtitleCtaGap;
        }
      }

      if (!posterAnchors.cta.hidden) {
        ctx.fillStyle = posterStyles.buttonColor || '#72DBF1';
        ctx.beginPath();
        posterRenderer.drawRoundedRectPath(ctx, ctaDrawX, ctaDrawY, ctaDrawW, ctaDrawH, ctaDrawH / 2);
        ctx.fill();
        ctx.fillStyle = posterStyles.buttonTextColor || '#27376F';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `700 ${ctaFontSize}px ${CANVAS_FONT_FAMILY}`;
        ctx.fillText(ctaText, ctaDrawX + ctaDrawW / 2, ctaDrawY + ctaDrawH / 2);
      }
      ctx.textBaseline = 'alphabetic';
    }

    return { drawPosterToCanvas };
  }

  window.createPosterCanvasRenderer = createPosterCanvasRenderer;
}());
