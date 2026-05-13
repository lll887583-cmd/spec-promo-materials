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

    function styleAnchorPreview(node, anchor) {
      if (!node || !anchor) return;
      node.style.left = formatPct(anchor.x);
      node.style.top = formatPct(anchor.y);
      node.style.width = formatPct(anchor.w);
      node.style.height = formatPct(anchor.h);
      node.style.setProperty('--anchor-cta-x', formatPct(anchor.x));
      node.style.setProperty('--anchor-cta-h', formatPct(anchor.h));
    }

    function fitTextElement(element, minSize = 6) {
      if (!element || !element.offsetParent) return;
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
