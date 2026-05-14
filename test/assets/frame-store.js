(function () {
  'use strict';

  function createFrameStore(options = {}) {
    const {
      storageKey,
      normalizeState,
      getState,
      applyState,
      resetState,
      loadStateRecord,
      persistStateRecord,
      loadLegacyJsonState,
      mirrorStateToLegacyStorage,
      newestState,
      appDatabaseTransaction,
      appStateStore,
      cloneState,
      cloneAnchors,
      cloneStyles,
      defaultTemplates,
      defaultStylePresets,
      defaultTemplateStyles,
      darkTemplateStyles,
      templateIndex,
      styleIndex
    } = options;

    function validTemplate(template) {
      return template && /^template-\d+$/.test(String(template.id || ''));
    }

    function validStyle(style) {
      return style && /^style-\d+$/.test(String(style.id || ''));
    }

    function cleanSavedTemplates(savedTemplates = []) {
      return savedTemplates
        .filter(validTemplate)
        .map(template => ({
          id: String(template.id),
          name: String(template.name || '').trim() || `框架 ${templateIndex(template.id)}`,
          variant: template.variant === 'dark' ? 'dark' : 'light'
        }));
    }

    function cleanSavedStyles(savedStyles = []) {
      return savedStyles
        .filter(validStyle)
        .map(style => ({
          id: String(style.id),
          name: String(style.name || '').trim() || `样式 ${styleIndex(style.id)}`
        }));
    }

    function buildSnapshot() {
      const state = getState();
      return {
        version: 1,
        updatedAt: Date.now(),
        selectedTemplate: state.selectedTemplate,
        selectedStyle: state.selectedStyle,
        templates: cloneState(state.templates),
        styles: cloneState(state.stylePresets),
        templateAnchorMaps: cloneState(state.templateAnchorMaps),
        styleMaps: cloneState(state.styleMaps)
      };
    }

    function restoreSnapshot(saved) {
      const cleanTemplates = cleanSavedTemplates(saved.templates);
      if (!cleanTemplates.length) return null;

      const templates = defaultTemplates();
      const templateAnchorMaps = saved.templateAnchorMaps && typeof saved.templateAnchorMaps === 'object'
        ? cloneAnchors(saved.templateAnchorMaps)
        : {};
      const selectedTemplate = templates.some(template => template.id === saved.selectedTemplate)
        ? saved.selectedTemplate
        : templates[0].id;

      let stylePresets;
      let styleMaps;
      let selectedStyle;
      if (Array.isArray(saved.styles)) {
        stylePresets = cleanSavedStyles(saved.styles);
        styleMaps = saved.styleMaps && typeof saved.styleMaps === 'object'
          ? cloneStyles(saved.styleMaps)
          : {};
        selectedStyle = stylePresets.some(style => style.id === saved.selectedStyle)
          ? saved.selectedStyle
          : (stylePresets[0]?.id || 'style-1');
      } else {
        const legacyMaps = saved.styleMaps && typeof saved.styleMaps === 'object' ? saved.styleMaps : {};
        const legacyStyleIds = cleanTemplates.map(template => template.id).filter(templateKey => legacyMaps[templateKey]);
        stylePresets = (legacyStyleIds.length ? legacyStyleIds : ['template-1', 'template-2'])
          .map((legacyId, index) => ({ id: `style-${index + 1}`, name: `样式 ${index + 1}`, legacyId }));
        styleMaps = {};
        stylePresets.forEach((style, index) => {
          styleMaps[style.id] = cloneStyles(legacyMaps[style.legacyId] || (index === 1 ? darkTemplateStyles : defaultTemplateStyles));
          delete style.legacyId;
        });
        const selectedIndex = Math.max(0, legacyStyleIds.indexOf(saved.selectedTemplate));
        selectedStyle = stylePresets[selectedIndex]?.id || stylePresets[0]?.id || 'style-1';
      }

      return { templates, templateAnchorMaps, selectedTemplate, stylePresets, styleMaps, selectedStyle };
    }

    async function save() {
      let snapshot = null;
      try {
        normalizeState();
        snapshot = buildSnapshot();
        mirrorStateToLegacyStorage(storageKey, snapshot);
        await persistStateRecord(storageKey, snapshot);
        return true;
      } catch (error) {
        console.warn('Template state failed to persist', error);
        if (snapshot) mirrorStateToLegacyStorage(storageKey, snapshot);
        return false;
      }
    }

    async function restore() {
      try {
        const dbState = await loadStateRecord(storageKey);
        const legacyState = loadLegacyJsonState(storageKey);
        const saved = newestState(dbState, legacyState);
        if (!saved || saved.version !== 1 || !Array.isArray(saved.templates)) {
          normalizeState();
          await save();
          return;
        }
        const restored = restoreSnapshot(saved);
        if (!restored) return;
        applyState(restored);
        normalizeState();
        await save();
      } catch (error) {
        console.warn('Template state failed to restore', error);
        normalizeState();
      }
    }

    async function clear() {
      try {
        localStorage.removeItem(storageKey);
        await appDatabaseTransaction(appStateStore, 'readwrite', store => store.delete(storageKey));
      } catch (error) {
        console.warn('Template state failed to clear', error);
      }
      resetState();
    }

    return { save, restore, clear };
  }

  window.createFrameStore = createFrameStore;
}());
