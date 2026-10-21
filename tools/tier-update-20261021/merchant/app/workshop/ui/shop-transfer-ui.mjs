import {merchantRequest} from './merchant-request.mjs';

export function createShopTransferUI({onBound = () => {}} = {}) {
  const section = document.createElement('section');
  section.innerHTML = '<h3>Als Shopify-Entwurf übertragen</h3><p>Titel, SEO und gespeicherte Grundausführungen übernehmen. Keine Veröffentlichung. Bilder und individuelle Aufpreise werden damit noch nicht übertragen.</p><p role="status" aria-live="polite"></p><button type="button" data-create disabled>Shopify-Entwurf anlegen</button> <button type="button" data-check disabled>Status prüfen</button><p data-result></p>';
  document.querySelector('#checks').after(section);
  const status = section.querySelector('[role=status]'), create = section.querySelector('[data-create]'), check = section.querySelector('[data-check]'), result = section.querySelector('[data-result]');
  let plan = null, serial = 0, busy = false, state = null;
  const route = id => '/api/workshop/products/' + id + '/shop-transfer';
  function controls() {create.disabled = busy || !state?.enabled || !plan?.sourceReady || Boolean(state.transfer); check.disabled = busy || !state?.enabled || !state.transfer || state.bindingsConfirmed || state.transfer.sourceSha256!==plan?.sha256; check.textContent=state?.transfer?.state==='completed'&&!state.bindingsConfirmed?'Zuordnungen übernehmen':'Status prüfen';}
  async function api(path, data) {
    let options = {};
    if (data) {
      const response = await merchantRequest('/api/workshop/session'), session = await response.json();
      if (!response.ok) throw Error(session.error?.message || 'Händleranmeldung nicht bestätigt.');
      options = {method: 'POST', headers: {'Content-Type': 'application/json', 'X-Gravuru-CSRF': session.csrfToken}, body: JSON.stringify(data)};
    }
    const response = await merchantRequest(path, options), value = await response.json();
    if (!response.ok) throw Error(value.error?.message || 'Übertragung nicht bestätigt.'); return value;
  }
  function render() {
    controls(); result.textContent = '';
    if (!state?.enabled) {status.textContent = 'Die sichere Shopify-Händleranbindung ist hier noch nicht eingerichtet.'; return;}
    const transfer = state.transfer;
    status.textContent = !transfer ? 'Ziel: ' + state.shopDomain + '. Erst die Schaltfläche legt einen Entwurf an.' : transfer.state === 'completed' ? 'Shopify-Entwurf bestätigt. Gespeicherte IDs werden bei Wiederholung verwendet.' : 'Übertragung begonnen, Ergebnis noch unbestätigt. „Status prüfen“ liest den Shop; es legt kein zweites Produkt an.';
    if(transfer?.state==='completed'&&!state.bindingsConfirmed)status.textContent='Shopify-Entwurf bestätigt; lokale Varianten noch nicht vollständig zugeordnet. Gespeicherte IDs übernehmen, ohne erneut zu senden.';
    if (transfer?.result) {result.textContent = transfer.result.mappings.length + ' Ausführungen · Shopify-Entwurf · nicht veröffentlicht. ';const id=transfer.result.shopifyProductId.match(/^gid:\/\/shopify\/Product\/([0-9]+)$/)?.[1];if(id){const link=document.createElement('a');link.href='https://admin.shopify.com/store/'+state.shopDomain.replace('.myshopify.com','')+'/products/'+id;link.target='_blank';link.rel='noopener';link.textContent='Entwurf in Shopify öffnen →';result.append(link);}}
    if (transfer && transfer.sourceSha256 !== plan.sha256) status.textContent = 'Für dieses Produkt besteht ein anderer Übertragungsstand. Eine neue Revision wird nicht als zweites Produkt angelegt oder ungeprüft darübergeschrieben.';
  }
  async function run(action) {
    if (busy || !plan) return;
    const ticket = serial, current = plan; busy = true; controls(); status.textContent = action === 'create' ? 'Entwurf wird übertragen …' : 'Shop-Status wird gelesen …';
    try {
      const value = await api(route(current.configuration.id), {expectedRevision: current.configuration.revision, sourceSha256: current.sha256, action});
      if (ticket !== serial) return;
      state.transfer = value; state.bindingsConfirmed=value.bindingsConfirmed;render(); onBound();
    } catch (error) {
      if (ticket !== serial) return;
      try {const value = await api(route(current.configuration.id) + '?revision=' + current.configuration.revision); if (ticket === serial) state = value;} catch { /* Preserve original failure. */ }
      if (ticket === serial) status.textContent = error.message;
    } finally {busy = false; controls();}
  }
  create.onclick = () => run('create'); check.onclick = () => run('reconcile');
  return {async select(value) {
    plan = value; state = null; const ticket = ++serial; controls(); result.textContent = ''; status.textContent = ''; if (!value) return;
    try {const loaded = await api(route(value.configuration.id) + '?revision=' + value.configuration.revision); if (ticket !== serial) return; state = loaded; render();}
    catch (error) {if (ticket === serial) status.textContent = error.message;}
  }};
}
