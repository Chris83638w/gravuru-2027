// K8 (Ü9.1): „Bearbeiten“ aus dem Warenkorb. Der Link trägt ?config=<id>&rev=<n>&line=<Warenkorbzeile>;
// der Editor lädt genau diese Revision vom Server (nur mit dem privaten Entwurfszugriff dieses Geräts)
// und merkt sich den Bearbeiten-Kontext für „Warenkorb aktualisieren“. Nichts davon liegt in URLs oder Storage
// außer den bereits vorhandenen privaten Entwurfszugängen.
import {cleanObject} from './contract.mjs';

const CONFIG = /^konfig_[a-f0-9-]{36}$/, STORAGE_PREFIXES = ['gravuru-acrylic-private:','gravuru-form-draft:'];

export function cartEditParams(search) {
  const params = new URLSearchParams(search), configId = params.get('config'), rev = Number(params.get('rev')), line = params.get('line');
  if (!configId || !CONFIG.test(configId) || !Number.isSafeInteger(rev) || rev < 1) return null;
  return {configId, rev, cartLineId: line && line.length <= 512 && !/[\x00-\x1f\x7f]/.test(line) ? line : null};
}

// Private Entwurfszugänge dieses Tabs (gleiche Ablage wie der Acryl-Entwurfsclient); nie aus der URL.
function storedTokens(storage) {
  const tokens = [];
  try {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i); if (!STORAGE_PREFIXES.some(prefix=>key?.startsWith(prefix))) continue;
      const value = JSON.parse(storage.getItem(key) || 'null');
      if (value && /^[a-f0-9]{64}$/.test(value.token || '')) tokens.push(value.token);
    }
  } catch { /* Kein Browserspeicher: dann kein Zugang auf diesem Gerät. */ }
  return [...new Set(tokens)];
}

export async function loadCartRevision({request, storage, params}) {
  const endpoint = '/api/workshop/cart-configurations/' + params.configId + '/' + params.rev;
  let denied = false;
  for (const token of storedTokens(storage)) {
    const response = await request(endpoint, {headers: {'X-Gravuru-Draft': token}});
    const body = await response.json().catch(() => ({}));
    if (response.ok) return {...body, token};
    if (response.status === 404) {denied = true; continue;}
    throw Error(body.error?.message || 'Die gespeicherte Gestaltung konnte nicht geladen werden.');
  }
  throw Error(denied || !storedTokens(storage).length
    ? 'Diese Gestaltung ist auf diesem Gerät nicht mehr zugänglich. Bitte die Gestaltung neu anlegen; die Warenkorbzeile bleibt bis dahin unverändert.'
    : 'Die gespeicherte Gestaltung konnte nicht geladen werden.');
}

async function photoFile(request, endpoint, token, uploadId, edited) {
  const response = await request(endpoint + '/photos/' + encodeURIComponent(uploadId) + (edited ? '?edited=1' : ''), {headers: {'X-Gravuru-Draft': token}});
  if (!response.ok) throw Error('Ein gespeichertes Foto konnte nicht geladen werden. Bitte erneut hochladen.');
  const blob = await response.blob(), type = blob.type || 'image/png';
  return new File([blob], (edited ? 'bearbeitet-' : 'original-') + uploadId + '.' + (type.split('/')[1] || 'png'), {type});
}

// Stellt Gestaltung, Ausführung, Menge und Fotos der Revision im Editor her. Passt der Produkt-/Profilstand nicht,
// bleibt der Editor leer und der Kunde sieht den Hinweis (readDraft lehnt fremde Profilrevisionen ab).
export async function installCartEdit(api, {request = window.parent?.GravuruMerchantRequest || fetch, storage = sessionStorage, search = location.search} = {}) {
  const params = cartEditParams(search);
  if (!params || !api.config || !api.el?.import) return null;
  const say = message => {const node = api.r.querySelector('.fk-order-status') || api.r.querySelector('[data-ux-status]'); if (node) {node.textContent = message; node.style.removeProperty('display');}};
  try {
    const loaded = await loadCartRevision({request, storage, params}), endpoint = '/api/workshop/cart-configurations/' + params.configId + '/' + params.rev;
    if(loaded.editorKind&&loaded.editorKind!=='native')throw Error('Diese gespeicherte Gestaltung benötigt den Formeditor.');
    const blocking = loaded.hints.filter(h => !/bereits Revision/.test(h));
    if (blocking.length) {say(blocking.join(' ')); return null;}
    for (const photo of loaded.photos) {
      const file = await photoFile(request, endpoint, loaded.token, photo.uploadId, false), url = URL.createObjectURL(file);
      const entry = {file, url, editSourceUrl:url, width: photo.width, height: photo.height};
      if (photo.edited) {const blob = await photoFile(request, endpoint, loaded.token, photo.uploadId, true); Object.assign(entry, {blob, edited: true, originalUrl: url, url: URL.createObjectURL(blob), width: photo.edited.width, height: photo.edited.height});}
      api.files.set(photo.uploadId, entry);
    }
    await api.el.import(new File([JSON.stringify(loaded.document)], 'revision-' + params.rev + '.json', {type: 'application/json'}));
    const expected = JSON.stringify(loaded.document.design.objects.map(cleanObject)), actual = JSON.stringify(api.el.state.objects.map(cleanObject));
    if (actual !== expected) throw Error(api.r.querySelector('.status')?.textContent || 'Die gespeicherte Gestaltung passt nicht zu diesem Produkt.');
    const quantity = api.r.querySelector('[data-fk-quantity]');
    if (quantity && Number.isSafeInteger(loaded.quantity)) {quantity.value = String(loaded.quantity); quantity.dispatchEvent(new Event('input', {bubbles: true}));}
    const legacyStatus = api.r.querySelector('.status'); if (legacyStatus) legacyStatus.textContent = '';
    api.el.sync();
    const context = {configId: params.configId, rev: params.rev, cartLineId: params.cartLineId==='theme'&&window.parent?.GravuruShopEntry?.cartMode==='theme'?'theme':params.cartLineId && loaded.configuration.cartLineId ? loaded.configuration.cartLineId : null,
      draftId: loaded.draft.id, draftToken: loaded.token, draftRevision: loaded.draft.revision};
    api.el.cartEdit = context;
    say('Deine Gestaltung aus dem Warenkorb (Revision ' + params.rev + ') ist geladen.' + (context.cartLineId ? ' „Warenkorb aktualisieren“ ersetzt die bestehende Position.' : ' Die Warenkorbposition wurde nicht gefunden; die Gestaltung wird neu hinzugefügt.') + (loaded.hints.length ? ' ' + loaded.hints.join(' ') : ''));
    return context;
  } catch (error) {say(error.message); return null;}
}
