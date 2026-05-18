(function () {
  'use strict';

  function createSpecPromoHelpPopover({ doc = document } = {}) {
    const helpWidget = doc.getElementById('helpWidget');
    const helpButton = doc.getElementById('helpButton');
    if (!helpWidget || !helpButton) return { close: () => {}, toggle: () => {} };

    function close() {
      helpWidget.classList.remove('open');
      helpButton.setAttribute('aria-expanded', 'false');
    }

    function toggle() {
      const isOpen = helpWidget.classList.toggle('open');
      helpButton.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    }

    helpButton.addEventListener('click', event => {
      event.stopPropagation();
      toggle();
    });

    doc.addEventListener('click', event => {
      if (!event.target.closest('#helpWidget')) close();
    });

    doc.addEventListener('keydown', event => {
      if (event.key === 'Escape') close();
    });

    return { close, toggle };
  }

  window.createSpecPromoHelpPopover = createSpecPromoHelpPopover;
}());
