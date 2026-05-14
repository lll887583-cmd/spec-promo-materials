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
      if (!posterAnchors.title.hidden) {
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
      }

      const textScale = posterCore.posterTextScale(size);
      if (!posterAnchors.subtitle.hidden) {
        const subtitleFit = fitWrappedCanvasText(
          ctx,
          copy.subtitle,
          subtitleRect.w,
          subtitleRect.h,
          posterRenderer.canvasAnchorFontSize(posterAnchors.subtitle, Math.max(8, Math.round(subtitleRect.h * 0.30 * textScale)), height),
          Math.max(7, Math.round(subtitleRect.h * 0.16)),
          400,
          1.48
        );
        subtitleFit.lines.forEach((line, index) => {
          ctx.fillText(line, subtitleX, subtitleRect.y + index * subtitleFit.size * 1.48);
        });
      }

      const ctaPaddingScale = Math.max(0.08, Math.min(width / 1200, height / 628));
      const ctaPaddingX = Number.isFinite(Number(posterAnchors.cta.padX))
        ? Math.max(1, (Number(posterAnchors.cta.padX) / 100) * width)
        : Math.max(4, 40 * ctaPaddingScale);
      const ctaPaddingY = Number.isFinite(Number(posterAnchors.cta.padY))
        ? Math.max(1, (Number(posterAnchors.cta.padY) / 100) * height)
        : Math.max(2, 20 * ctaPaddingScale);
      const ctaStartSize = posterRenderer.canvasAnchorFontSize(posterAnchors.cta, Math.max(8, Math.round(ctaRect.h * 0.38)), height);
      const ctaDrawW = ctaRect.w;
      const ctaDrawH = ctaRect.h;
      const ctaDrawY = ctaRect.y;
      const ctaFontSize = fitCanvasFont(
        ctx,
        copy.cta,
        Math.max(8, ctaDrawW - ctaPaddingX * 2),
        ctaStartSize,
        Math.max(6, Math.round(ctaDrawH * 0.18)),
        700
      );
      ctx.font = `700 ${ctaFontSize}px ${CANVAS_FONT_FAMILY}`;
      const ctaText = String(copy.cta || '');
      if (!posterAnchors.cta.hidden) {
        ctx.fillStyle = posterStyles.buttonColor || '#72DBF1';
        ctx.beginPath();
        posterRenderer.drawRoundedRectPath(ctx, ctaRect.x, ctaDrawY, ctaDrawW, ctaDrawH, ctaDrawH / 2);
        ctx.fill();
        ctx.fillStyle = posterStyles.buttonTextColor || '#27376F';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `700 ${ctaFontSize}px ${CANVAS_FONT_FAMILY}`;
        ctx.fillText(ctaText, ctaRect.x + ctaDrawW / 2, ctaDrawY + ctaDrawH / 2);
      }
      ctx.textBaseline = 'alphabetic';
    }

    return { drawPosterToCanvas };
  }

  window.createPosterCanvasRenderer = createPosterCanvasRenderer;
}());
