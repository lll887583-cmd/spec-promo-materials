(function () {
  'use strict';

  const loaded = new Map();

  function loadStyleOnce(href) {
    if (!href || document.querySelector(`link[href="${href}"]`)) return Promise.resolve();
    const key = `style:${href}`;
    if (loaded.has(key)) return loaded.get(key);
    const promise = new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.onload = resolve;
      link.onerror = () => reject(new Error(`Failed to load ${href}`));
      document.head.appendChild(link);
    });
    loaded.set(key, promise);
    return promise;
  }

  function loadScriptOnce(src, globalName) {
    if (globalName && window[globalName]) return Promise.resolve(window[globalName]);
    if (loaded.has(src)) return loaded.get(src);
    const promise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => resolve(globalName ? window[globalName] : true);
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(script);
    });
    loaded.set(src, promise);
    return promise;
  }

  async function ensureCropper() {
    await loadStyleOnce('https://cdn.jsdelivr.net/npm/cropperjs@1.6.2/dist/cropper.min.css');
    return loadScriptOnce('https://cdn.jsdelivr.net/npm/cropperjs@1.6.2/dist/cropper.min.js', 'Cropper');
  }

  async function ensureXlsx() {
    return loadScriptOnce('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js', 'XLSX');
  }

  window.SpecPromoDependencies = { ensureCropper, ensureXlsx };
}());
