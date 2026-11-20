// Each drawer refresh connects new line elements. Keep the status with its own image.
if (!customElements.get('gravuru-cart-preview')) {
  customElements.define('gravuru-cart-preview',class extends HTMLElement {
    connectedCallback() {
      const image = this.querySelector('img');
      const status = this.querySelector('[role="status"]');
      if (!image || !status) return;
      const update = () => {
        if (!image.complete) return;
        status.hidden = image.naturalWidth > 0;
        if (!status.hidden) status.textContent = 'Die persönliche Vorschau konnte nicht geladen werden.';
      };
      image.addEventListener('load',update,{once:true});
      image.addEventListener('error',update,{once:true});
      update();
    }
  });
}
