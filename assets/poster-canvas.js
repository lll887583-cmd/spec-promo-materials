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

    function fitCanvasFont(ctx, text, maxWidth, startSize, minSize, weight = 700) {
      let size = startSize;
      while (size > minSize) {
        ctx.font = `${weight} ${size}px ${CANVAS_FONT_FAMILY}`;
        if (ctx.measureText(text).width <= maxWidth) return size;
        size -= 2;
      }
      ctx.font = `${weight} ${minSize}px ${CANVAS_FONT_FAMILY}`;
      return minSize;
    }

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
      let best = { size: minSize, lines: [] };
      for (let size = startSize; size >= minSize; size -= 1) {
        ctx.font = `${weight} ${size}px ${CANVAS_FONT_FAMILY}`;
        const maxLines = Math.max(1, Math.floor(maxHeight / Math.max(1, size * lineHeight)));
        const lines = wrapCanvasText(ctx, text, maxWidth, Number.POSITIVE_INFINITY);
        const textHeight = lines.length * size * lineHeight;
        const fitsWidth = lines.every(line => ctx.measureText(line).width <= maxWidth + 1);
        if (lines.length <= maxLines && fitsWidth && textHeight <= maxHeight + 1) {
          best = { size, lines };
          break;
        }
        best = { size: minSize, lines };
      }
      ctx.font = `${weight} ${best.size}px ${CANVAS_FONT_FAMILY}`;
      const visibleLines = Math.max(1, Math.floor(maxHeight / Math.max(1, best.size * lineHeight)));
      best.lines = best.lines.slice(0, visibleLines);
      return best;
    }

    function drawAdjustedProductImage(ctx, image, rect, size) {
      const draw = posterRenderer.productDrawGeometry(image, rect, getProductAdjustment(size));
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
      const titleRect = posterRenderer.canvasRect(posterAnchors.title, width, height);
      const subtitleRect = posterRenderer.canvasRect(posterAnchors.subtitle, width, height);
      const ctaRect = posterRenderer.canvasRect(posterAnchors.cta, width, height);
      const logoRect = posterRenderer.canvasRect(posterAnchors.logo, width, height);

      ctx.fillStyle = posterRenderer.canvasBackgroundFill(ctx, posterStyles, width, height);
      ctx.fillRect(0, 0, width, height);

      const uploadedImageSrc = getUploadedImageSrc();
      if (uploadedImageSrc) {
        try {
          const productImage = await loadCanvasImage(uploadedImageSrc);
          drawAdjustedProductImage(ctx, productImage, imageRect, size);
        } catch (error) {
          console.warn('Uploaded image failed to load for download', error);
        }
      }

      try {
        const logo = await loadCanvasImage(getLogoSrc(getLogoBrand(languageIndex), getLogoVariant(asset, posterStyles)));
        const logoW = logoRect.w;
        const logoH = Math.min(logoRect.h, logoW * (logo.naturalHeight / logo.naturalWidth));
        ctx.drawImage(logo, logoRect.x, logoRect.y, logoW, logoH);
      } catch (error) {
        console.warn('Logo failed to load for download', error);
      }

      const isCenter = (posterAnchors.title.align || posterAnchors.text.align) === 'center';
      const titleX = isCenter ? titleRect.x + titleRect.w / 2 : titleRect.x;
      const subtitleX = isCenter ? subtitleRect.x + subtitleRect.w / 2 : subtitleRect.x;
      ctx.fillStyle = posterStyles.textColor;
      ctx.textAlign = isCenter ? 'center' : 'left';
      ctx.textBaseline = 'top';
      const titleFit = fitWrappedCanvasText(
        ctx,
        copy.title,
        titleRect.w,
        titleRect.h,
        posterRenderer.canvasAnchorFontSize(posterAnchors.title, Math.round(titleRect.h * 0.58 * posterCore.posterTextScale(size)), height),
        Math.max(8, Math.round(titleRect.h * 0.22)),
        700,
        1.06
      );
      titleFit.lines.forEach((line, index) => {
        ctx.fillText(line, titleX, titleRect.y + index * titleFit.size * 1.06);
      });

      const textScale = posterCore.posterTextScale(size);
      const subtitleFit = fitWrappedCanvasText(
        ctx,
        copy.subtitle,
        subtitleRect.w,
        subtitleRect.h,
        posterRenderer.canvasAnchorFontSize(posterAnchors.subtitle, Math.max(8, Math.round(subtitleRect.h * 0.30 * textScale)), height),
        Math.max(7, Math.round(subtitleRect.h * 0.16)),
        500,
        1.48
      );
      subtitleFit.lines.forEach((line, index) => {
        ctx.fillText(line, subtitleX, subtitleRect.y + index * subtitleFit.size * 1.48);
      });

      const ctaPaddingScale = Math.max(0.08, Math.min(width / 1200, height / 628));
      const ctaPaddingX = Math.max(4, 40 * ctaPaddingScale);
      const ctaPaddingY = Math.max(2, 20 * ctaPaddingScale);
      const ctaStartSize = posterRenderer.canvasAnchorFontSize(posterAnchors.cta, Math.max(8, Math.round(ctaRect.h * 0.38)), height);
      const ctaAvailableW = Math.max(8, width - ctaRect.x - Math.max(2, 12 * ctaPaddingScale));
      const ctaFontSize = fitCanvasFont(
        ctx,
        copy.cta,
        Math.max(8, ctaAvailableW - ctaPaddingX * 2),
        ctaStartSize,
        Math.max(6, Math.round(ctaRect.h * 0.18)),
        700
      );
      ctx.font = `700 ${ctaFontSize}px ${CANVAS_FONT_FAMILY}`;
      const ctaText = String(copy.cta || '');
      const ctaTextWidth = ctx.measureText(ctaText).width;
      const ctaDrawW = posterCore.clamp(ctaTextWidth + ctaPaddingX * 2, ctaRect.h * 2.2, ctaAvailableW);
      const ctaDrawH = Math.max(ctaRect.h, ctaFontSize * 1.15 + ctaPaddingY * 2);
      const ctaDrawY = posterCore.clamp(ctaRect.y, 0, Math.max(0, height - ctaDrawH));
      ctx.fillStyle = posterStyles.buttonColor;
      ctx.beginPath();
      posterRenderer.drawRoundedRectPath(ctx, ctaRect.x, ctaDrawY, ctaDrawW, ctaDrawH, ctaDrawH / 2);
      ctx.fill();
      ctx.fillStyle = posterStyles.buttonTextColor || '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.font = `700 ${ctaFontSize}px ${CANVAS_FONT_FAMILY}`;
      const ctaTextStartY = ctaDrawY + (ctaDrawH - ctaFontSize * 1.15) / 2;
      ctx.fillText(ctaText, ctaRect.x + ctaDrawW / 2, ctaTextStartY);
      ctx.textBaseline = 'alphabetic';
    }

    return { drawPosterToCanvas };
  }

  window.createPosterCanvasRenderer = createPosterCanvasRenderer;
}());
