/* Gravuru Konfigurator · „Jetzt personalisieren“ (Theme-App-Block). Hält den Start-Link auf der aktuell
   gewählten Variante: beim Klick wird die Varianten-ID aus dem Produktformular (name="id"), sonst aus
   ?variant= in der Adresse, sonst aus dem Block gelesen. Keine Preise, keine SKUs, keine Speicherung. */
(function () {
  'use strict';
  var ID = /^[1-9][0-9]{0,19}$/;
  function currentVariant(block) {
    var form = document.querySelector('form[action*="/cart/add"] [name="id"], product-form [name="id"], variant-selects [name="id"]');
    if (form && ID.test(String(form.value || ''))) return String(form.value);
    var fromUrl = new URLSearchParams(location.search).get('variant');
    if (fromUrl && ID.test(fromUrl)) return fromUrl;
    return block.getAttribute('data-variant-id') || '';
  }
  function update(block) {
    var link = block.querySelector('[data-gravuru-start]'), product = block.getAttribute('data-product-id'), variant = currentVariant(block);
    if (!link || !ID.test(String(product || '')) || !ID.test(variant)) return;
    var back = block.getAttribute('data-back') || '';
    link.href = block.getAttribute('data-start') + '?product=' + encodeURIComponent(product) + '&variant=' + encodeURIComponent(variant) + (back ? '&back=' + encodeURIComponent(back) : '');
    block.setAttribute('data-variant-id', variant);
  }
  function install() {
    var blocks = document.querySelectorAll('[data-gravuru-personalisieren]');
    if (!blocks.length) return;
    var refresh = function () { blocks.forEach(update); };
    refresh();
    document.addEventListener('change', function (event) { if (event.target && event.target.name === 'id') refresh(); }, true);
    // Dawn/Horizon und ähnliche Themes melden den Variantenwechsel per Ereignis oder über die Adresse.
    ['variant:change', 'variant:update', 'variantChange', 'product:variant-change'].forEach(function (name) { document.addEventListener(name, refresh, true); });
    var pushState = history.pushState, replaceState = history.replaceState;
    history.pushState = function () { var result = pushState.apply(this, arguments); setTimeout(refresh, 0); return result; };
    history.replaceState = function () { var result = replaceState.apply(this, arguments); setTimeout(refresh, 0); return result; };
    window.addEventListener('popstate', refresh);
    blocks.forEach(function (block) { block.addEventListener('click', function (event) { if (event.target.closest && event.target.closest('[data-gravuru-start]')) update(block); }, true); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
})();
