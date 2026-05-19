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

    function rectWithin(inner, outer) {
      return inner.x >= outer.x - 1
        && inner.y >= outer.y - 1
        && inner.x + inner.w <= outer.x + outer.w + 1
        && inner.y + inner.h <= outer.y + outer.h + 1;
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
        const titleLineHeight = titleStartSize * 1.4;
        let titleSubtitleGap = Math.max(4, subtitleRect.y - (titleRect.y + titleRect.h));
        const subtitleStartSize = posterRenderer.canvasAnchorFontSize(posterAnchors.subtitle, Math.max(8, Math.round(subtitleRect.h * 0.30 * textScale)), height);
        ctx.font = `400 ${subtitleStartSize}px ${CANVAS_FONT_FAMILY}`;
        const subtitleLines = wrapCanvasText(ctx, copy.subtitle, subtitleRect.w, Number.POSITIVE_INFINITY);
        const subtitleLineHeight = subtitleStartSize * 1.4;
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
            const imageReachesCanvasBottom = imageRect.y + imageRect.h >= height - 1;
            const visualReachesCanvasBottom = imageVisualRect.y + imageVisualRect.h >= height - 1;
            const imageBottomLimit = imageReachesCanvasBottom ? height : height - bottomPadding;
            const visualBottomLimit = visualReachesCanvasBottom ? height : height - bottomPadding;
            const visibleBottom = Math.min(imageRect.y + imageRect.h, imageBottomLimit);
            imageRect = {
              ...imageRect,
              y: nextTop,
              h: Math.max(height * 0.12, visibleBottom - nextTop)
            };
            const visualTop = Math.max(imageVisualRect.y, nextTop);
            imageVisualRect = {
              ...imageVisualRect,
              y: visualTop,
              h: Math.max(height * 0.12, Math.min(imageVisualRect.y + imageVisualRect.h, visualBottomLimit) - visualTop)
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

      const titleAlign = ['left', 'center', 'right'].includes(posterAnchors.title.align)
        ? posterAnchors.title.align
        : (posterAnchors.text.align || 'left');
      const subtitleAlign = ['left', 'center', 'right'].includes(posterAnchors.subtitle.align)
        ? posterAnchors.subtitle.align
        : (posterAnchors.text.align || 'left');
      const anchorTextX = (rect, align) => {
        if (align === 'center') return rect.x + rect.w / 2;
        if (align === 'right') return rect.x + rect.w;
        return rect.x;
      };
      ctx.fillStyle = posterStyles.textColor;
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
      let ctaDrawW = posterAnchors.cta.autoWidth === true
        ? Math.max(1, ctx.measureText(ctaText).width + ctaPaddingX * 2)
        : ctaRect.w;
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
          ctx.font = `700 ${titleStartSize}px ${CANVAS_FONT_FAMILY}`;
          titleFit = { size: titleStartSize, lines: wrapCanvasText(ctx, copy.title, titleWidth, Number.POSITIVE_INFINITY) };
          titleLineHeight = titleStartSize * 1.4;
          titleStartY = posterAnchors.title.vAlign === 'center'
            ? titleRect.y + Math.max(0, (titleRect.h - titleLineHeight) / 2)
            : titleRect.y;
        } else {
          ctx.font = `700 ${titleStartSize}px ${CANVAS_FONT_FAMILY}`;
          titleFit = { size: titleStartSize, lines: wrapCanvasText(ctx, copy.title, titleWidth, Number.POSITIVE_INFINITY) };
          titleLineHeight = titleStartSize * 1.4;
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
          subtitleLineHeight = subtitleStartSize * 1.4;
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
          ctx.textAlign = titleAlign;
          ctx.fillText(line, anchorTextX({ x: titleLeft, w: titleWidth }, titleAlign), titleStartY + index * titleLineHeight);
        });
        if (!subtitleHidden) {
          subtitleLines.forEach((line, index) => {
            ctx.font = `400 ${subtitleStartSize}px ${CANVAS_FONT_FAMILY}`;
            ctx.textAlign = subtitleAlign;
            ctx.fillText(line, anchorTextX(subtitleRect, subtitleAlign), subtitleDrawY + index * subtitleLineHeight);
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
