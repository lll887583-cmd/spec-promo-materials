(function () {
  'use strict';

  function createFrameEditorHelpers(options = {}) {
    const { posterCore, formatPct, getAnchorCanvas } = options;

    function fitAnchorCanvasPreview(size, parent) {
      const anchorCanvas = getAnchorCanvas();
      if (!anchorCanvas || !size?.width || !size?.height || !parent) return;
      const parentRect = parent.getBoundingClientRect();
      if (!parentRect?.width) return;
      const parentStyle = getComputedStyle(parent);
      const paddingX = parseFloat(parentStyle.paddingLeft) + parseFloat(parentStyle.paddingRight);
      const maxWidth = Math.max(120, Math.min(980, parentRect.width - paddingX));
      const canvasTop = anchorCanvas.getBoundingClientRect().top || parentRect.top;
      const viewportHeight = Math.max(180, window.innerHeight - canvasTop - 24);
      const maxHeight = Math.max(180, Math.min(posterCore.generatedPreviewFrameHeight(maxWidth), viewportHeight));
      const dimensions = posterCore.previewFitDimensions(size, maxWidth, maxHeight);
      anchorCanvas.style.setProperty('--anchor-preview-w', `${dimensions.width}px`);
      anchorCanvas.style.setProperty('--anchor-preview-h', `${dimensions.height}px`);
    }

    function styleAnchorPreview(node, anchor, isCta = false) {
      if (!node || !anchor) return;
      node.hidden = Boolean(anchor.hidden);
      node.style.display = anchor.hidden ? 'none' : '';
      if (anchor.hidden) return;
      node.style.left = formatPct(anchor.x);
      node.style.top = formatPct(anchor.y);
      node.style.width = isCta && anchor.autoWidth === true ? 'max-content' : formatPct(anchor.w);
      node.style.height = formatPct(anchor.h);
      node.style.setProperty('--anchor-cta-x', formatPct(anchor.x));
      node.style.setProperty('--anchor-cta-w', formatPct(anchor.w));
      node.style.setProperty('--anchor-cta-h', formatPct(anchor.h));
      if (Number.isFinite(Number(anchor.padX))) {
        node.style.setProperty('--anchor-cta-pad-x', `${Number(anchor.padX)}cqw`);
      } else {
        node.style.removeProperty('--anchor-cta-pad-x');
      }
      if (Number.isFinite(Number(anchor.padY))) {
        node.style.setProperty('--anchor-cta-pad-y', `${Number(anchor.padY)}cqh`);
      } else {
        node.style.removeProperty('--anchor-cta-pad-y');
      }
      if (Number.isFinite(Number(anchor.lineHeight))) {
        node.style.setProperty('--anchor-cta-line-height', String(Number(anchor.lineHeight)));
      } else {
        node.style.removeProperty('--anchor-cta-line-height');
      }
    }

    function fitTextElement(element, minSize = 6) {
      if (!element || !element.offsetParent) return;
      element.style.overflow = 'visible';
      element.style.whiteSpace = 'pre-wrap';
      element.style.lineHeight = '1.4';
    }

    function axisLockedDelta(dx, dy, dragState, lockAxis, threshold = 0) {
      if (!lockAxis) {
        if (dragState) dragState.lockAxis = null;
        return { dx, dy };
      }
      if (dragState && !dragState.lockAxis && Math.max(Math.abs(dx), Math.abs(dy)) >= threshold) {
        dragState.lockAxis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
      }
      const axis = dragState?.lockAxis || (Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y');
      return axis === 'x' ? { dx, dy: 0 } : { dx: 0, dy };
    }

    return { fitAnchorCanvasPreview, styleAnchorPreview, fitTextElement, axisLockedDelta };
  }

  window.createFrameEditorHelpers = createFrameEditorHelpers;
}());
