(function () {
  'use strict';

  function createProductImageController(options = {}) {
    const {
      clamp,
      getCurrentSize,
      getMaterialCard,
      getProductFrame,
      getProductImage,
      getHasImage,
      getIsGenerating,
      getAdjustments,
      getPosterRenderer,
      getEffectivePosterAnchorsForSize,
      axisLockedDelta,
      pushPosterEditHistory,
      beginProductWheelUndo,
      finishProductWheelUndoSoon
    } = options;

    function productAdjustmentKey(size = getCurrentSize?.()) {
      return size?.id || 'default';
    }

    function defaultProductAdjustment() {
      return { scale: 1, x: 0, y: 0 };
    }

    function currentProductAdjustment(size = getCurrentSize?.()) {
      const adjustments = getAdjustments?.() || {};
      const key = productAdjustmentKey(size);
      adjustments[key] = adjustments[key] || defaultProductAdjustment();
      return adjustments[key];
    }

    function anchorRectInCard(anchor, cardRect) {
      return {
        left: cardRect.left + ((Number(anchor.x) || 0) / 100) * cardRect.width,
        top: cardRect.top + ((Number(anchor.y) || 0) / 100) * cardRect.height,
        width: ((Number(anchor.w) || 0) / 100) * cardRect.width,
        height: ((Number(anchor.h) || 0) / 100) * cardRect.height
      };
    }

    function productImageGeometry(size = getCurrentSize?.(), frameRect = getProductFrame?.()?.getBoundingClientRect()) {
      const image = getProductImage?.();
      if (!image?.naturalWidth || !image?.naturalHeight || !frameRect?.width || !frameRect?.height) return null;
      const cardRect = getMaterialCard?.()?.getBoundingClientRect();
      const anchors = getEffectivePosterAnchorsForSize?.(size) || {};
      const visualAnchor = getPosterRenderer?.()?.imageVisualAnchor(anchors);
      const visualRect = cardRect && visualAnchor ? anchorRectInCard(visualAnchor, cardRect) : frameRect;
      if (!visualRect?.width || !visualRect?.height) return null;
      const visualW = visualRect.width;
      const visualH = visualRect.height;
      const frameToVisualX = visualRect.left - frameRect.left;
      const frameToVisualY = visualRect.top - frameRect.top;
      const frameRatio = visualW / visualH;
      const imageRatio = image.naturalWidth / image.naturalHeight;
      let baseW = visualW;
      let baseH = visualH;
      if (imageRatio > frameRatio) baseW = visualH * imageRatio;
      else baseH = visualW / imageRatio;
      const adjustment = currentProductAdjustment(size);
      const scale = Number(adjustment.scale) || 1;
      const drawW = baseW * scale;
      const drawH = baseH * scale;
      return {
        frameW: frameRect.width,
        frameH: frameRect.height,
        visualW,
        visualH,
        frameToVisualX,
        frameToVisualY,
        baseW,
        baseH,
        drawW,
        drawH,
        adjustment
      };
    }

    function clampProductAdjustment(adjustment = currentProductAdjustment()) {
      const geometry = productImageGeometry();
      if (!geometry) return adjustment;
      adjustment.scale = clamp(Number(adjustment.scale) || 1, 1, 4);
      const drawW = geometry.baseW * adjustment.scale;
      const drawH = geometry.baseH * adjustment.scale;
      const maxX = Math.max(0, (drawW - geometry.visualW) / (2 * geometry.visualW));
      const maxY = Math.max(0, (drawH - geometry.visualH) / (2 * geometry.visualH));
      adjustment.x = clamp(Number(adjustment.x) || 0, -maxX, maxX);
      adjustment.y = clamp(Number(adjustment.y) || 0, -maxY, maxY);
      return adjustment;
    }

    function updateProductImageFrame() {
      const productFrame = getProductFrame?.();
      const image = getProductImage?.();
      if (!productFrame || !image || !getHasImage?.() || !image.naturalWidth) return;
      const geometry = productImageGeometry();
      if (!geometry) return;
      const adjustment = clampProductAdjustment(geometry.adjustment);
      const drawW = geometry.baseW * adjustment.scale;
      const drawH = geometry.baseH * adjustment.scale;
      image.style.width = `${drawW}px`;
      image.style.height = `${drawH}px`;
      image.style.left = `${geometry.frameToVisualX + (geometry.visualW - drawW) / 2 + adjustment.x * geometry.visualW}px`;
      image.style.top = `${geometry.frameToVisualY + (geometry.visualH - drawH) / 2 + adjustment.y * geometry.visualH}px`;
    }

    function selectProductFrame(selected = true) {
      const productFrame = getProductFrame?.();
      if (!productFrame || (selected && !getHasImage?.())) return;
      productFrame.classList.toggle('is-selected', selected);
    }

    function updateProductAdjustment(next) {
      const adjustment = currentProductAdjustment();
      Object.assign(adjustment, next);
      clampProductAdjustment(adjustment);
      updateProductImageFrame();
    }

    function zoomProductImage(delta, origin = null) {
      if (!getHasImage?.() || getIsGenerating?.()) return;
      const productFrame = getProductFrame?.();
      const adjustment = currentProductAdjustment();
      const beforeScale = adjustment.scale || 1;
      const nextScale = clamp(beforeScale * delta, 1, 4);
      if (origin && productFrame) {
        const geometry = productImageGeometry();
        const rect = productFrame.getBoundingClientRect();
        const visualLeft = rect.left + (geometry?.frameToVisualX || 0);
        const visualTop = rect.top + (geometry?.frameToVisualY || 0);
        const visualW = geometry?.visualW || rect.width;
        const visualH = geometry?.visualH || rect.height;
        const offsetX = clamp(((origin.clientX - visualLeft) / visualW) - 0.5, -0.5, 0.5);
        const offsetY = clamp(((origin.clientY - visualTop) / visualH) - 0.5, -0.5, 0.5);
        adjustment.x -= offsetX * (nextScale - beforeScale) / nextScale;
        adjustment.y -= offsetY * (nextScale - beforeScale) / nextScale;
      }
      adjustment.scale = nextScale;
      clampProductAdjustment(adjustment);
      updateProductImageFrame();
    }

    function initProductImageInteractions() {
      const productFrame = getProductFrame?.();
      if (!productFrame) return;
      let productImageDragState = null;
      productFrame.addEventListener('pointerdown', event => {
        if (!getHasImage?.() || getIsGenerating?.()) return;
        selectProductFrame(true);
        const rect = productFrame.getBoundingClientRect();
        const geometry = productImageGeometry(undefined, rect);
        const adjustment = currentProductAdjustment();
        productImageDragState = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          visualW: geometry?.visualW || rect.width,
          visualH: geometry?.visualH || rect.height,
          x: adjustment.x,
          y: adjustment.y,
          historyCaptured: false
        };
        productFrame.classList.add('is-dragging');
        productFrame.setPointerCapture?.(event.pointerId);
        event.preventDefault();
      });

      productFrame.addEventListener('pointermove', event => {
        if (!productImageDragState || productImageDragState.pointerId !== event.pointerId) return;
        if (!productImageDragState.historyCaptured) {
          pushPosterEditHistory?.();
          productImageDragState.historyCaptured = true;
        }
        const delta = axisLockedDelta(
          event.clientX - productImageDragState.startX,
          event.clientY - productImageDragState.startY,
          productImageDragState,
          event.shiftKey,
          2
        );
        updateProductAdjustment({
          x: productImageDragState.x + delta.dx / productImageDragState.visualW,
          y: productImageDragState.y + delta.dy / productImageDragState.visualH
        });
      });

      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => {
        productFrame.addEventListener(type, () => {
          productImageDragState = null;
          productFrame.classList.remove('is-dragging');
        });
      });

      productFrame.addEventListener('wheel', event => {
        if (!getHasImage?.() || getIsGenerating?.()) return;
        selectProductFrame(true);
        event.preventDefault();
        beginProductWheelUndo?.();
        zoomProductImage(event.deltaY < 0 ? 1.08 : 0.925, event);
        finishProductWheelUndoSoon?.();
      }, { passive: false });

      productFrame.addEventListener('keydown', event => {
        if (!getHasImage?.() || getIsGenerating?.()) return;
        const step = event.shiftKey ? 0.04 : 0.015;
        const adjustment = currentProductAdjustment();
        if (event.key === '+' || event.key === '=') {
          event.preventDefault();
          pushPosterEditHistory?.();
          zoomProductImage(1.08);
        } else if (event.key === '-' || event.key === '_') {
          event.preventDefault();
          pushPosterEditHistory?.();
          zoomProductImage(0.925);
        } else if (event.key === 'ArrowLeft') {
          event.preventDefault();
          pushPosterEditHistory?.();
          updateProductAdjustment({ x: adjustment.x - step });
        } else if (event.key === 'ArrowRight') {
          event.preventDefault();
          pushPosterEditHistory?.();
          updateProductAdjustment({ x: adjustment.x + step });
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          pushPosterEditHistory?.();
          updateProductAdjustment({ y: adjustment.y - step });
        } else if (event.key === 'ArrowDown') {
          event.preventDefault();
          pushPosterEditHistory?.();
          updateProductAdjustment({ y: adjustment.y + step });
        } else if (event.key === '0') {
          event.preventDefault();
          pushPosterEditHistory?.();
          updateProductAdjustment(defaultProductAdjustment());
        }
      });
    }

    return {
      productAdjustmentKey,
      defaultProductAdjustment,
      currentProductAdjustment,
      productImageGeometry,
      clampProductAdjustment,
      updateProductImageFrame,
      selectProductFrame,
      updateProductAdjustment,
      zoomProductImage,
      initProductImageInteractions
    };
  }

  window.createProductImageController = createProductImageController;
}());
