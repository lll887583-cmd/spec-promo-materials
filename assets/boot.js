(function () {
  'use strict';

  const ASSET_VERSION = '20260520-ui-language-switch';
  const withVersion = path => `${path}?v=${ASSET_VERSION}`;

  const coreScripts = [
    'assets/poster-core.js',
    'assets/frame-store.js',
    'assets/poster-renderer.js',
    'assets/frame-editor.js',
    'assets/poster-canvas.js',
    'assets/export-assets.js',
    'assets/modules/dependency-loader.js',
    'assets/rules-parser.js'
  ];

  const frameLayoutScripts = [
    'assets/frame-layouts/120x600.js',
    'assets/frame-layouts/320x50.js',
    'assets/frame-layouts/320x100.js',
    'assets/frame-layouts/720x90.js',
    'assets/frame-layouts/728x90.js',
    'assets/frame-layouts/160x600.js',
    'assets/frame-layouts/300x250.js',
    'assets/frame-layouts/300x600.js',
    'assets/frame-layouts/320x480.js',
    'assets/frame-layouts/800x800.js',
    'assets/frame-layouts/628x1200.js',
    'assets/frame-layouts/828x1200.js',
    'assets/frame-layouts/970x250.js',
    'assets/frame-layouts/980x250.js',
    'assets/frame-layouts/990x250.js',
    'assets/frame-layouts/1200x628.js',
    'assets/frame-layouts/1200x1500.js',
    'assets/frame-layouts/1200x1200.js'
  ];

  const configAndModuleScripts = [
    'assets/config/defaults.js',
    'assets/config/layout-rules.js',
    'assets/config/translations.js',
    'assets/modules/dom-refs.js',
    'assets/modules/persistence.js',
    'assets/modules/app-state.js',
    'assets/modules/product-image.js',
    'assets/modules/help-popover.js'
  ];

  window.SpecPromoAssetVersion = ASSET_VERSION;
  window.SpecPromoFrameLayoutRules = {
    alignmentParameterSource: 'figma',
    figmaUrl: 'https://www.figma.com/design/PN1Aikh14mpsA21sLVmHnU/%E6%8E%A8%E5%B9%BF%E7%B4%A0%E6%9D%90?node-id=3-464&t=sdlYeGCManUsCYVt-11',
    figmaNodeId: '3:464',
    rule: 'When creating or updating assets/frame-layouts/*.js, fetch and apply alignment coordinates from this Figma node for each size.'
  };

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = withVersion(src);
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.body.appendChild(script);
    });
  }

  async function boot() {
    for (const script of coreScripts) await loadScript(script);
    await loadScript('assets/frame-layouts/registry.js');
    await Promise.all(frameLayoutScripts.map(loadScript));
    await Promise.all(configAndModuleScripts.map(loadScript));
    await loadScript('assets/app.js');
  }

  boot().catch(error => {
    console.error('Promo app failed to start', error);
    const toast = document.getElementById('toast');
    if (toast) {
      toast.textContent = '页面资源加载失败，请刷新重试';
      toast.classList.add('visible');
    }
  });
}());
