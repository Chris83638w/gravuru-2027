const parameters = new URLSearchParams(location.search);
const product = parameters.get('produkt') || 'ring';
const status = document.querySelector('#status');
const downloads = document.querySelector('#downloads');
let saved = null;
const cartPage = location.pathname === '/beta/cart';
const euro = new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'});
function cartAccess() {
  let key = sessionStorage.getItem('gravuru-beta-cart');
  if (!key) {
    key = Array.from(crypto.getRandomValues(new Uint8Array(32)),v => v.toString(16).padStart(2,'0')).join('');
    sessionStorage.setItem('gravuru-beta-cart',key);
  }
  return key;
}
async function showCart() {
  document.querySelector('#editor').hidden = true;
  document.querySelector('#cart').hidden = false;
  const response = await fetch('/beta-warenkorb',{headers:{'X-Beta-Cart':cartAccess()},cache:'no-store'});
  if (!response.ok) throw Error('Der Testwarenkorb konnte nicht geladen werden.');
  const {items,totalCents} = await response.json();
  status.textContent = items.length ? 'Eigener Testwarenkorb · alle Beträge sind Prüfwerte.' : 'Dein Testwarenkorb ist leer. Wähle oben ein Prüfprodukt.';
  for (const item of items) {
    const article = document.createElement('article');
    const heading = document.createElement('h2');
    heading.textContent = item.productName;
    const details = document.createElement('p');
    details.textContent = [item.design,item.lettering].filter(Boolean).join(' · ');
    const amount = document.createElement('p');
    amount.textContent = item.quantity + ' × ' + euro.format(item.unitCents/100) + ' · Revision ' + item.rev;
    const edit = document.createElement('a');
    edit.textContent = 'Bearbeiten';
    edit.href = '/?' + new URLSearchParams({produkt:item.product,config:item.id,rev:item.rev,line:'theme'});
    article.append(heading,details,amount,edit);
    for (const [format,label] of Object.entries({svg:'SVG',kontur:'Kontur-PDF',...(item.print ? {druck:'Druck-PDF'} : {}),zip:'Entwurf und Originale'})) {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
      button.addEventListener('click',() => downloadFile(button,format,{config:item.id,revision:item.rev},{'X-Beta-Cart':cartAccess()}));
      article.append(button);
    }
    document.querySelector('#items').append(article);
  }
  document.querySelector('#sum').textContent = 'Summe ' + euro.format(totalCents/100);
}

async function json(url) {
  const response = await fetch(url, {cache: 'no-store'});
  if (!response.ok) throw Error('Der lokale Produktstand ist nicht verfügbar.');
  return response.json();
}

try {
  if (cartPage) {
    history.replaceState(null,'','/beta/cart');
    await showCart();
  } else {
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
    productName: model.name, cartMode: 'theme', shopDomain:location.hostname, themeCartPath:'/beta/cart', request, csrfToken: session.csrfToken, backUrl: '/',
    async submitCart(body, {draftToken}) {
      const response = await request('/api/workshop/acrylic-drafts/' + encodeURIComponent(body.draftId), {headers: {'X-Gravuru-Draft': draftToken}});
      if (!response.ok) throw Error('Der lokale Entwurf konnte nicht bestätigt werden.');
      const {draft,review} = await response.json();
      if (draft.revision !== body.expectedRevision || draft.productId !== record.id || draft.productRevision !== record.revision) throw Error('Der gesicherte Entwurfsstand passt nicht zur Auswahl.');
      const transfer = await request('/beta-warenkorb',{method:'POST',headers:{'Content-Type':'application/json','X-Beta-Cart':cartAccess(),'X-Gravuru-Draft':draftToken,'X-Gravuru-CSRF':session.csrfToken},body:JSON.stringify({...body,product})});
      if (!transfer.ok) throw Error(await transfer.text());
      const line = await transfer.json();
      saved = {id: draft.id, revision: draft.revision, token: draftToken};
      downloads.querySelector('[data-format=druck]').hidden = review.product.method !== 'print';
      downloads.hidden = false;
      status.textContent = 'Prüfstand ' + draft.revision + ' gesichert. Die Dateien stehen zum Download bereit.';
      if (location.protocol === 'https:') return {mode:'theme',handoffUrl:location.origin+'/beta/cart#handoff='+line.handoff,totalCents:line.totalCents,paymentConfirmed:false};
      throw Error('Im Testwarenkorb gesichert. Du kannst ihn oben öffnen oder die Dateien herunterladen.');
    }
  });
  for (const link of document.querySelectorAll('nav a')) {
    if (new URL(link.href).searchParams.get('produkt') === product) link.setAttribute('aria-current', 'page');
  }
  const frame = document.createElement('iframe');
  frame.title = model.name;
  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== frame.contentWindow) return;
    if (event.data?.type === 'gravuru-ux-ready') status.textContent = 'Geschützter Prüfstand · bitte nur Beispieldaten verwenden.';
    if (event.data?.type === 'gravuru-ux-failed') status.textContent = 'Der Editor konnte nicht geladen werden.';
  });
  const edit = new URLSearchParams();
  for (const key of ['config','rev','line']) if (parameters.has(key)) edit.set(key,parameters.get(key));
  frame.src = '/editor.html' + (edit.size ? '?' + edit : '');
  document.querySelector('#editor').append(frame);
  }
} catch (error) { status.textContent = error.message; }

downloads.addEventListener('click', async event => {
  const button = event.target.closest('button[data-format]');
  if (!button || !saved) return;
  const {id, revision, token} = saved;
  await downloadFile(button,button.dataset.format,{entwurf:id,revision},{'X-Gravuru-Draft':token});
});
async function downloadFile(button,format,reference,headers) {
  button.disabled = true;
  try {
    const query = new URLSearchParams({...reference,format});
    const response = await fetch('/beta-datei?' + query,{headers});
    if (!response.ok) throw Error(await response.text());
    const href = URL.createObjectURL(await response.blob());
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = 'Pruefstand-' + reference.revision + '-' + format + '.' + (['kontur','druck'].includes(format) ? 'pdf' : format);
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(href), 30000);
  } catch (error) { status.textContent = error.message; }
  finally { button.disabled = false; }
}
