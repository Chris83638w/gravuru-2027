const parameters = new URLSearchParams(location.search);
const product = parameters.get('produkt') || 'ring';
const status = document.querySelector('#status');
const downloads = document.querySelector('#downloads');
let saved = null;

async function json(url) {
  const response = await fetch(url, {cache: 'no-store'});
  if (!response.ok) throw Error('Der lokale Produktstand ist nicht verfügbar.');
  return response.json();
}

try {
  const [record, session] = await Promise.all([json('/beta-produkt?produkt=' + encodeURIComponent(product)), json('/api/workshop/session')]);
  const [model] = await json('/models.json?' + new URLSearchParams({configuration: record.id, revision: record.revision}));
  if (model.configuration.id !== record.id || model.configuration.revision !== record.revision) throw Error('Produktrevision stimmt nicht überein.');
  const binding = {productId: record.id, productRevision: record.revision};
  const request = (url, options) => fetch(url, options);
  window.UniversalConfig = model.universal;
  window.GravuruModelProfile = model.legacy;
  window.GravuruWorkshopReview = binding;
  window.GravuruMerchantRequest = request;
  window.GravuruShopEntry = Object.freeze({
    ...binding, ...(parameters.get('ansicht') === 'nativ' ? {} : {presentation: 'prio-r15'}),
    productName: model.name, cartMode: 'theme', request, csrfToken: session.csrfToken, backUrl: '/',
    async submitCart(body, {draftToken}) {
      const response = await request('/api/workshop/acrylic-drafts/' + encodeURIComponent(body.draftId), {headers: {'X-Gravuru-Draft': draftToken}});
      if (!response.ok) throw Error('Der lokale Entwurf konnte nicht bestätigt werden.');
      const {draft,review} = await response.json();
      if (draft.revision !== body.expectedRevision || draft.productId !== record.id || draft.productRevision !== record.revision) throw Error('Der gesicherte Entwurfsstand passt nicht zur Auswahl.');
      saved = {id: draft.id, revision: draft.revision, token: draftToken};
      downloads.querySelector('[data-format=druck]').hidden = review.product.method !== 'print';
      downloads.hidden = false;
      status.textContent = 'Prüfstand ' + draft.revision + ' gesichert. Die Dateien stehen zum Download bereit.';
      throw Error('Lokaler Prüfstand gesichert. Die Dateien stehen über dem Editor bereit. Der Shopify-Warenkorb benötigt die F02-Anbindung.');
    }
  });
  for (const link of document.querySelectorAll('nav a')) {
    if (new URL(link.href).searchParams.get('produkt') === product) link.setAttribute('aria-current', 'page');
  }
  const frame = document.createElement('iframe');
  frame.title = model.name;
  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== frame.contentWindow) return;
    if (event.data?.type === 'gravuru-ux-ready') status.textContent = 'Warenkorb sichert hier einen lokalen Prüfstand. Nur Testdaten verwenden.';
    if (event.data?.type === 'gravuru-ux-failed') status.textContent = 'Der Editor konnte nicht geladen werden.';
  });
  frame.src = '/editor.html';
  document.querySelector('#editor').append(frame);
} catch (error) { status.textContent = error.message; }

downloads.addEventListener('click', async event => {
  const button = event.target.closest('button[data-format]');
  if (!button || !saved) return;
  button.disabled = true;
  const {id, revision, token} = saved;
  const format = button.dataset.format;
  try {
    const query = new URLSearchParams({entwurf: id, revision, format});
    const response = await fetch('/beta-datei?' + query, {headers: {'X-Gravuru-Draft': token}});
    if (!response.ok) throw Error(await response.text());
    const href = URL.createObjectURL(await response.blob());
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = 'Pruefstand-' + revision + '-' + format + '.' + (['kontur','druck'].includes(format) ? 'pdf' : format);
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(href), 30000);
  } catch (error) { status.textContent = error.message; }
  finally { button.disabled = false; }
});
