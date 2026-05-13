(function () {
  'use strict';

  const registry = window.SpecPromoFrameLayouts || {};
  registry.layouts = registry.layouts || {};
  registry.sizes = registry.sizes || [];

  registry.register = function register(frame) {
    if (!frame || !frame.id || !frame.layout) return;
    if (frame.layout.cta) {
      frame.layout.styles = {
        ...(frame.layout.styles || {}),
        buttonColor: frame.layout.styles?.buttonColor || '#72DBF1',
        buttonTextColor: frame.layout.styles?.buttonTextColor || '#27376F'
      };
    }
    registry.layouts[frame.id] = frame.layout;
    const size = frame.size;
    if (size && !registry.sizes.some(item => item.id === frame.id)) {
      registry.sizes.push({
        id: frame.id,
        label: size.label || `${size.width} x ${size.height}`,
        width: size.width,
        height: size.height
      });
    }
  };

  registry.getLayouts = function getLayouts() {
    return JSON.parse(JSON.stringify(registry.layouts));
  };

  registry.getSizes = function getSizes() {
    return JSON.parse(JSON.stringify(registry.sizes));
  };

  window.SpecPromoFrameLayouts = registry;
}());
