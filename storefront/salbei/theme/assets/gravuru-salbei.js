/* gravuru storefront interactions. Native links/forms/details remain usable without JS. */
if (!customElements.get('gravuru-header')) {
  customElements.define('gravuru-header', class extends HTMLElement {
    connectedCallback() {
      this.controller?.abort();
      this.controller = new AbortController();
      const { signal } = this.controller;
      const close = (details, restoreFocus = false) => {
        details.removeAttribute('open');
        if (restoreFocus) details.querySelector(':scope > summary')?.focus();
      };
      this.addEventListener('toggle', (event) => {
        const current = event.target;
        if (!(current instanceof HTMLDetailsElement) || !current.open || !current.matches('[data-g-menu]')) return;
        this.querySelectorAll('[data-g-menu][open]').forEach((item) => {
          if (item !== current && !item.contains(current)) close(item);
        });
      }, { capture: true, signal });
      this.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        const opened = event.target.closest('details[open]');
        if (opened && this.contains(opened)) { event.preventDefault(); close(opened, true); }
      }, { signal });
      document.addEventListener('pointerdown', (event) => {
        if (!this.contains(event.target)) this.querySelectorAll('details[open]').forEach((item) => close(item));
      }, { signal });
      this.addEventListener('focusout', () => {
        queueMicrotask(() => {
          if (!this.contains(document.activeElement)) this.querySelectorAll('details[open]').forEach((item) => close(item));
        });
      }, { signal });
      const viewport = window.matchMedia('(min-width: 990px)');
      viewport.addEventListener('change', () => this.querySelectorAll('details[open]').forEach((item) => close(item)), { signal });
      document.addEventListener('shopify:block:select', (event) => {
        const block = event.target.closest('.g-nav-item');
        if (block && this.contains(block)) {
          block.closest('[data-g-mobile]')?.setAttribute('open', '');
          block.querySelector('[data-g-menu]')?.setAttribute('open', '');
        }
      }, { signal });
    }
    disconnectedCallback() { this.controller?.abort(); }
  });
}
