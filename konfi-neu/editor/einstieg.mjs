// Einstieg auf der Produktseite: wenige hundert Byte, die sofort geladen werden.
// Der eigentliche Editor wird erst geholt, wenn der Kunde Interesse zeigt (Zeiger über dem Knopf,
// Fokus, Berührung) – und spätestens beim Klick. Die Produktdatei wird dabei gleich mit angefordert.
//
// Einbindung im Theme (ein Block, für jedes Produkt mit Konfigurator gleich):
//   <button data-gravuru-konfi data-produkt="{{ product.metafields.custom.customization_id }}">Jetzt personalisieren</button>
//   <script type="module" src="{{ basis }}konfi.js" data-basis="{{ basis }}" data-api="/apps/konfigurator/api"></script>
const skript = document.currentScript || document.querySelector('script[data-gravuru-konfi-start]') || [...document.querySelectorAll('script[type=module]')].find(s => /konfi(\.[0-9a-f]+)?\.js/.test(s.src));
const konfig = window.GravuruKonfi || (window.GravuruKonfi = {});
konfig.basis ||= skript?.dataset.basis || new URL('.', import.meta.url).href;
konfig.api ||= skript?.dataset.api || '/apps/konfigurator/api';

let editor = null;
const geholt = new Set();
function vorbereiten(produkt) {
  editor ||= import(konfig.editor || new URL('./editor.js', import.meta.url).href);
  if (produkt && !geholt.has(produkt)) {
    geholt.add(produkt);
    // Gleiche Adresse wie später im Editor: Der Browser nimmt die Antwort dann aus seinem Zwischenspeicher.
    fetch(`${konfig.basis}p/${encodeURIComponent(produkt)}.json`).catch(() => geholt.delete(produkt));
  }
  return editor;
}

async function oeffnen(optionen) {
  const modul = await vorbereiten(optionen.produkt);
  return modul.oeffnen({basis: konfig.basis, api: konfig.api, shop: konfig.shop || shopify(), ...optionen});
}
konfig.oeffnen = oeffnen;
konfig.vorbereiten = vorbereiten;

/** Warenkorb des Shopify-Themes. Läuft im Shop selbst, also ohne fremde Domain und ohne Umweg. */
function shopify() {
  const wurzel = window.Shopify?.routes?.root || '/';
  const senden = async (pfad, body) => {
    const antwort = await fetch(wurzel + pfad, {method: 'POST', headers: {'content-type': 'application/json', accept: 'application/json'}, body: JSON.stringify(body)});
    const daten = await antwort.json().catch(() => ({}));
    if (!antwort.ok) throw Object.assign(new Error('Warenkorb ' + antwort.status + ' ' + (daten.description || daten.message || '')), {kundentext: 'Der Warenkorb hat die Position nicht angenommen. Bitte versuche es erneut.'});
    return daten;
  };
  const zeile = position => ({id: position.variante, quantity: position.menge, properties: position.eigenschaften});
  return {
    hinzufuegen: position => senden('cart/add.js', {items: [zeile(position)]}),
    // Erst die neue Position anlegen, dann die alte entfernen: Es geht nie etwas verloren.
    async ersetzen(alterSchluessel, position) {
      await senden('cart/add.js', {items: [zeile(position)]});
      await senden('cart/change.js', {id: alterSchluessel, quantity: 0});
    },
    zumWarenkorb: () => { location.href = wurzel + 'cart'; },
  };
}

for (const typ of ['pointerenter', 'focusin', 'touchstart']) {
  document.addEventListener(typ, event => {
    const knopf = event.target.closest?.('[data-gravuru-konfi]');
    if (knopf) vorbereiten(knopf.dataset.produkt);
  }, {capture: true, passive: true});
}
document.addEventListener('click', event => {
  const knopf = event.target.closest?.('[data-gravuru-konfi]');
  if (!knopf) return;
  event.preventDefault();
  oeffnen({produkt: knopf.dataset.produkt, wahl: {groesse: knopf.dataset.groesse, bef: knopf.dataset.bef}});
});
// „Bearbeiten“ aus dem Warenkorb: /products/…?konfi=<Gestaltung>&t=<Token>&zeile=<Warenkorbschlüssel>
const parameter = new URLSearchParams(location.search);
if (parameter.get('konfi') && parameter.get('t')) {
  const knopf = document.querySelector('[data-gravuru-konfi]');
  if (knopf) oeffnen({produkt: knopf.dataset.produkt, bearbeiten: {id: parameter.get('konfi'), token: parameter.get('t'), zeile: parameter.get('zeile')}});
}
