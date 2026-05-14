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

    function ellipsizeCanvasText(ctx, text, maxWidth) {
      const clean = String(text || '').replace(/\s+/g, ' ').trim();
      if (ctx.measureText(clean).width <= maxWidth) return clean;
      const ellipsis = '…';
      let low = 0;
      let high = clean.length;
      let best = '';
      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const candidate = clean.slice(0, mid).trimEnd() + ellipsis;
        if (ctx.measureText(candidate).width <= maxWidth) {
          best = candidate;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }
      return best || ellipsis;
    }

    function isShortWideLayout(size) {
      const width = Number(size?.width) || 0;
      const height = Number(size?.height) || 0;
      return height > 0 && width / height >= 3 && height > 180 && height <= 300;
    }

    function fillCanvasBackground(ctx, styles, width, height) {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = posterRenderer.canvasBackgroundFill(ctx, styles, width, height);
      const area = styles?.backgroundArea || {};
      const hasArea = ['x', 'y', 'w', 'h'].every(key => Number.isFinite(Number(area[key])));
      if (!hasArea) {
        ctx.fillRect(0, 0, width, height);
        return;
      }
      ctx.fillRect(
        (Number(area.x) / 100) * width,
        (Number(area.y) / 100) * height,
        (Number(area.w) / 100) * width,
        (Number(area.h) / 100) * height
      );
    }

    function horizontalOverlapRatio(a, b) {
      const overlap = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
      return overlap / Math.max(1, Math.min(a.w, b.w));
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
      let imageRect = posterRenderer.canvasRect(posterAnchors.image, width, height);
      let imageVisualRect = posterRenderer.canvasRect(posterRenderer.imageVisualAnchor(posterAnchors), width, height);
      const titleRect = posterRenderer.canvasRect(posterAnchors.title, width, height);
      const subtitleRect = posterRenderer.canvasRect(posterAnchors.subtitle, width, height);
      const ctaRect = posterRenderer.canvasRect(posterAnchors.cta, width, height);
      const logoRect = posterRenderer.canvasRect(posterAnchors.logo, width, height);

      fillCanvasBackground(ctx, posterStyles, width, height);

      if (!isShortWideLayout(size) && !posterAnchors.subtitle.hidden && !posterAnchors.title.hidden) {
        const textScale = posterCore.posterTextScale(size);
        const titleStartSize = posterRenderer.canvasAnchorFontSize(posterAnchors.title, Math.round(titleRect.h * 0.58 * textScale), height);
        ctx.font = `700 ${titleStartSize}px ${CANVAS_FONT_FAMILY}`;
        const titleLines = wrapCanvasText(ctx, copy.title, titleRect.w, Number.POSITIVE_INFINITY);
        const titleLineHeight = titleStartSize * 1.06;
        let titleSubtitleGap = Math.max(4, subtitleRect.y - (titleRect.y + titleRect.h));
        const subtitleStartSize = posterRenderer.canvasAnchorFontSize(posterAnchors.subtitle, Math.max(8, Math.round(subtitleRect.h * 0.30 * textScale)), height);
        ctx.font = `400 ${subtitleStartSize}px ${CANVAS_FONT_FAMILY}`;
        const subtitleLines = wrapCanvasText(ctx, copy.subtitle, subtitleRect.w, Number.POSITIVE_INFINITY);
        const subtitleLineHeight = subtitleStartSize * 1.48;
        let subtitleCtaGap = Math.max(6, ctaRect.y - (subtitleRect.y + subtitleRect.h));
        const ctaPaddingScale = Math.max(0.08, Math.min(width / 1200, height / 628));
        const ctaPaddingX = Number.isFinite(Number(posterAnchors.cta.padX))
          ? Math.max(1, (Number(posterAnchors.cta.padX) / 100) * width)
          : Math.max(4, 40 * ctaPaddingScale);
        const ctaFontSize = posterRenderer.canvasAnchorFontSize(posterAnchors.cta, Math.max(8, Math.round(ctaRect.h * 0.38)), height);
        const ctaText = String(copy.cta || '').replace(/\s+/g, ' ').trim();
        ctx.font = `700 ${ctaFontSize}px ${CANVAS_FONT_FAMILY}`;
        const ctaDrawW = Math.min(width, Math.max(1, ctx.measureText(ctaText).width + ctaPaddingX * 2));
        const ctaDrawX = Math.max(0, Math.min(ctaRect.x, width - ctaDrawW));
        let subtitleDrawY = titleRect.y + titleLines.length * titleLineHeight + titleSubtitleGap;
        let ctaDrawY = subtitleDrawY + subtitleLines.length * subtitleLineHeight + subtitleCtaGap;
        const bottomPadding = Math.max(4, height * 0.04);
        const overflow = ctaDrawY + ctaRect.h - (height - bottomPadding);
        if (overflow > 0) {
          const minTitleSubtitleGap = Math.max(4, height * 0.016);
          const minSubtitleCtaGap = Math.max(6, height * 0.024);
          const titleGapReduce = Math.min(Math.max(0, titleSubtitleGap - minTitleSubtitleGap), overflow);
          const ctaGapReduce = Math.min(Math.max(0, subtitleCtaGap - minSubtitleCtaGap), overflow - titleGapReduce);
          titleSubtitleGap -= titleGapReduce;
          subtitleCtaGap -= ctaGapReduce;
          subtitleDrawY = titleRect.y + titleLines.length * titleLineHeight + titleSubtitleGap;
          ctaDrawY = subtitleDrawY + subtitleLines.length * subtitleLineHeight + subtitleCtaGap;
        }
        const contentLeft = Math.min(titleRect.x, subtitleRect.x, ctaDrawX);
        const contentRight = Math.max(titleRect.x + titleRect.w, subtitleRect.x + subtitleRect.w, ctaDrawX + ctaDrawW);
        const contentRect = { x: contentLeft, w: contentRight - contentLeft };
        if (horizontalOverlapRatio(contentRect, imageRect) >= 0.18) {
          const imageGap = Math.max(6, height * 0.035);
          const nextTop = Math.max(imageRect.y, ctaDrawY + ctaRect.h + imageGap);
          if (nextTop > imageRect.y + 1) {
            const visibleBottom = Math.min(imageRect.y + imageRect.h, height - bottomPadding);
            imageRect = {
              ...imageRect,
              y: nextTop,
              h: Math.max(height * 0.12, visibleBottom - nextTop)
            };
            const visualTop = Math.max(imageVisualRect.y, nextTop);
            imageVisualRect = {
              ...imageVisualRect,
              y: visualTop,
              h: Math.max(height * 0.12, Math.min(imageVisualRect.y + imageVisualRect.h, height - bottomPadding) - visualTop)
            };
          }
        }
      }

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
      if (posterAnchors.safeArea) {
        const titleStartSize = posterRenderer.canvasAnchorFontSize(posterAnchors.title, Math.round(titleRect.h * 0.58 * textScale), height);
        const titleMinSize = Math.max(1, Number(posterAnchors.title.minFontPx) || 6);
        const titleLineHeight = Number(posterAnchors.title.lineHeight) || 1.06;
        const titleFit = fitWrappedCanvasText(ctx, copy.title, titleRect.w, titleRect.h, titleStartSize, titleMinSize, 700, titleLineHeight);
        titleFit.lines.forEach((line, index) => {
          ctx.font = `700 ${titleFit.size}px ${CANVAS_FONT_FAMILY}`;
          ctx.fillText(line, titleX, titleRect.y + index * titleFit.size * titleLineHeight);
        });

        if (!subtitleHidden) {
          const subtitleStartSize = posterRenderer.canvasAnchorFontSize(posterAnchors.subtitle, Math.max(7, Math.round(subtitleRect.h * 0.30 * textScale)), height);
          const subtitleMinSize = Math.max(1, Number(posterAnchors.subtitle.minFontPx) || 5);
          const subtitleLineHeight = Number(posterAnchors.subtitle.lineHeight) || 1.48;
          const subtitleFit = fitWrappedCanvasText(ctx, copy.subtitle, subtitleRect.w, subtitleRect.h, subtitleStartSize, subtitleMinSize, 400, subtitleLineHeight);
          subtitleFit.lines.forEach((line, index) => {
            ctx.font = `400 ${subtitleFit.size}px ${CANVAS_FONT_FAMILY}`;
            ctx.fillText(line, subtitleX, subtitleRect.y + index * subtitleFit.size * subtitleLineHeight);
          });
        }

        if (!posterAnchors.cta.hidden) {
          const safeRight = ((Number(posterAnchors.safeArea.x) + Number(posterAnchors.safeArea.w)) / 100) * width;
          const maxCtaW = Number.isFinite(Number(posterAnchors.cta.maxW))
            ? (Number(posterAnchors.cta.maxW) / 100) * width
            : Math.max(1, safeRight - ctaRect.x);
          const minCtaFont = Math.max(1, Number(posterAnchors.cta.minFontPx) || 5);
          let drawPadX = ctaPaddingX;
          const minPadX = Number.isFinite(Number(posterAnchors.cta.minPadX))
            ? Math.max(1, (Number(posterAnchors.cta.minPadX) / 100) * width)
            : Math.max(1, ctaPaddingX * 0.45);
          let fittedCtaText = ctaText;
          for (let sizePx = ctaFontSize; sizePx >= minCtaFont; sizePx -= 1) {
            const progress = (sizePx - minCtaFont) / Math.max(1, ctaFontSize - minCtaFont);
            drawPadX = minPadX + (ctaPaddingX - minPadX) * Math.max(0, Math.min(1, progress));
            ctx.font = `700 ${sizePx}px ${CANVAS_FONT_FAMILY}`;
            if (ctx.measureText(ctaText).width + drawPadX * 2 <= maxCtaW + 1) {
              ctaFontSize = sizePx;
              break;
            }
            ctaFontSize = minCtaFont;
          }
          ctx.font = `700 ${ctaFontSize}px ${CANVAS_FONT_FAMILY}`;
          const textMaxW = Math.max(1, maxCtaW - drawPadX * 2);
          fittedCtaText = ellipsizeCanvasText(ctx, ctaText, textMaxW);
          const strictCtaW = Math.min(maxCtaW, Math.max(ctaRect.w, ctx.measureText(fittedCtaText).width + drawPadX * 2));
          const strictCtaX = Math.max(0, Math.min(ctaRect.x, safeRight - strictCtaW, width - strictCtaW));
          ctx.fillStyle = posterStyles.buttonColor || '#72DBF1';
          ctx.beginPath();
          posterRenderer.drawRoundedRectPath(ctx, strictCtaX, ctaRect.y, strictCtaW, ctaDrawH, ctaDrawH / 2);
          ctx.fill();
          ctx.fillStyle = posterStyles.buttonTextColor || '#27376F';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = `700 ${ctaFontSize}px ${CANVAS_FONT_FAMILY}`;
          ctx.fillText(fittedCtaText, strictCtaX + strictCtaW / 2, ctaRect.y + ctaDrawH / 2);
        }
        ctx.textBaseline = 'alphabetic';
        return;
      }
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
        let subtitleStartSize = 0;
        let subtitleDrawY = 0;
        let subtitleLines = [];
        let subtitleLineHeight = 0;
        if (!subtitleHidden) {
          let titleSubtitleGap = Math.max(4, subtitleRect.y - (titleRect.y + titleRect.h));
          subtitleStartSize = posterRenderer.canvasAnchorFontSize(posterAnchors.subtitle, Math.max(8, Math.round(subtitleRect.h * 0.30 * textScale)), height);
          subtitleDrawY = titleStartY + titleFit.lines.length * titleLineHeight + titleSubtitleGap;
          ctx.font = `400 ${subtitleStartSize}px ${CANVAS_FONT_FAMILY}`;
          subtitleLines = wrapCanvasText(ctx, copy.subtitle, subtitleRect.w, Number.POSITIVE_INFINITY);
          subtitleLineHeight = subtitleStartSize * 1.48;
          let subtitleCtaGap = Math.max(6, ctaRect.y - (subtitleRect.y + subtitleRect.h));
          ctaDrawY = subtitleDrawY + subtitleLines.length * subtitleLineHeight + subtitleCtaGap;
          const bottomPadding = Math.max(4, height * 0.04);
          const overflow = ctaDrawY + ctaDrawH - (height - bottomPadding);
          if (isShortWideLayout(size) && overflow > 0) {
            const safeTop = logoRect.y + logoRect.h + Math.max(4, height * 0.016);
            const shift = Math.min(overflow, Math.max(0, titleStartY - safeTop));
            titleStartY -= shift;
            ctaDrawY -= shift;
            subtitleDrawY -= shift;
          }
          const remainingOverflow = ctaDrawY + ctaDrawH - (height - bottomPadding);
          if (remainingOverflow > 0) {
            const minTitleSubtitleGap = Math.max(4, height * 0.016);
            const minSubtitleCtaGap = Math.max(6, height * 0.024);
            const titleGapReduce = Math.min(Math.max(0, titleSubtitleGap - minTitleSubtitleGap), remainingOverflow);
            const ctaGapReduce = Math.min(Math.max(0, subtitleCtaGap - minSubtitleCtaGap), remainingOverflow - titleGapReduce);
            titleSubtitleGap -= titleGapReduce;
            subtitleCtaGap -= ctaGapReduce;
            subtitleDrawY = titleStartY + titleFit.lines.length * titleLineHeight + titleSubtitleGap;
            ctaDrawY = subtitleDrawY + subtitleLines.length * subtitleLineHeight + subtitleCtaGap;
          }
        }
        titleFit.lines.forEach((line, index) => {
          ctx.font = `700 ${titleFit.size}px ${CANVAS_FONT_FAMILY}`;
          ctx.fillText(line, isCenter ? titleLeft + titleWidth / 2 : titleLeft, titleStartY + index * titleLineHeight);
        });
        if (!subtitleHidden) {
          subtitleLines.forEach((line, index) => {
            ctx.font = `400 ${subtitleStartSize}px ${CANVAS_FONT_FAMILY}`;
            ctx.fillText(line, subtitleX, subtitleDrawY + index * subtitleLineHeight);
          });
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
