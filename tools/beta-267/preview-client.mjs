const params = new URLSearchParams(location.search);
const product = params.get('produkt') || 'ring';
const status = document.querySelector('#status');
const drawer = document.querySelector('#drawer');
const euro = new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'});
const section = document.querySelector('#cart');
const isCart = location.pathname === '/beta/cart';
const isFiles = location.pathname === '/beta/dateien';
const objectUrls = new WeakMap();
let cartKey = sessionStorage.getItem('gravuru-beta-cart');
if (!cartKey) {
  cartKey = Array.from(crypto.getRandomValues(new Uint8Array(32)),v=>v.toString(16).padStart(2,'0')).join('');
  sessionStorage.setItem('gravuru-beta-cart',cartKey);
}
const cartHeaders = {'X-Beta-Cart':cartKey};
async function request(url,options={}) {
  const response = await fetch(url,{cache:'no-store',...options});
  if (!response.ok) throw Error(await response.text() || 'Der Prüfstand ist gerade nicht erreichbar.');
  return response;
}
const json = async (url,options)=> (await request(url,options)).json();
function el(tag,text,cls) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (cls) node.className = cls;
  return node;
}
function clearList(list) {
  for (const a of list.querySelectorAll('.image-box a')) {
    const url = objectUrls.get(a);
    if (url) URL.revokeObjectURL(url);
  }
  list.replaceChildren();
}
async function showImage(item,box) {
  const msg = el('span','Persönliche Vorschau wird geladen …');
  msg.setAttribute('role','status');
  box.append(msg);
  let url;
  try {
    const ref = new URLSearchParams({config:item.id,revision:item.rev});
    const response = await request('/beta-vorschau?'+ref,{headers:cartHeaders});
    url = URL.createObjectURL(await response.blob());
    const image = el('img');
    image.alt = 'Persönliche Vorschau · '+[item.design,item.lettering].filter(Boolean).join(' · ');
    image.src = url;
    await image.decode();
    if (!box.isConnected) { URL.revokeObjectURL(url); return; }
    const a = el('a');
    a.href = url; a.target = '_blank'; a.rel = 'noopener'; a.setAttribute('aria-label',image.alt+' vergrößern');
    a.append(image); objectUrls.set(a,url); box.replaceChildren(a);
  } catch {
    if (url) URL.revokeObjectURL(url);
    msg.textContent = 'Die persönliche Vorschau konnte nicht geladen werden.';
  }
}
async function downloadFile(button,item,format) {
  button.disabled = true;
  try {
    const query = new URLSearchParams({config:item.id,revision:item.rev,format});
    const response = await request('/beta-datei?'+query,{headers:cartHeaders});
    const url = URL.createObjectURL(await response.blob());
    const a = el('a'); a.href = url;
    a.download = 'Pruefstand-'+item.rev+'-'+format+'.'+(['kontur','druck'].includes(format)?'pdf':format);
    a.click(); setTimeout(()=>URL.revokeObjectURL(url),30000);
  } catch (error) {status.textContent=error.message;}
  finally {button.disabled=false;}
}
async function renderItems(list,sum,files=false) {
  const {items,totalCents} = await json('/beta-warenkorb',{headers:cartHeaders});
  clearList(list);
  if (!items.length) list.append(el('p',files?'Für die Prüfdateien zuerst eine Gestaltung in den Warenkorb legen.':'Dein Warenkorb ist leer. Wähle oben ein Produkt.'));
  for (const item of items) {
    const article = el('article',null,'line'+(files?' proofs':''));
    article.dataset.id=item.id; article.dataset.rev=item.rev;
    const info = el('div');
    info.append(el('h2',item.productName),el('p',[item.design,item.lettering].filter(Boolean).join(' · ')));
    article.append(info); list.append(article);
    if (files) {
      for (const [format,label] of Object.entries({svg:'SVG',kontur:'Kontur-PDF',...(item.print?{druck:'Druck-PDF'}:{}),zip:'Entwurf und Originale'})) {
        const button = el('button',label); button.type='button';
        button.addEventListener('click',()=>downloadFile(button,item,format)); info.append(button);
      }
    } else {
      const box = el('div',null,'image-box'); article.prepend(box);
      void showImage(item,box);
      info.append(el('p',item.options.map(o=>o.value).join(' · '),'options'),el('p',item.quantity+' × '+euro.format(item.unitCents/100)));
      const remove = el('button','Entfernen','text-btn remove'); remove.type='button';
      remove.addEventListener('click',async ()=>{
        remove.disabled=true;
        try {
          const session = await json('/api/workshop/session');
          await json('/beta-warenkorb/entfernen',{method:'POST',headers:{...cartHeaders,'Content-Type':'application/json','X-Gravuru-CSRF':session.csrfToken},body:JSON.stringify({id:item.id,rev:item.rev})});
          await renderItems(list,sum);
          if (drawer.open && (isCart || isFiles)) await renderItems(document.querySelector('#items'),document.querySelector('#sum'),isFiles);
          (list.querySelector('.remove') || (drawer.open ? drawer.querySelector('.drawer-close') : document.querySelector('nav a'))).focus();
        } catch (error) {remove.disabled=false;info.append(el('p',error.message));}
      });
      info.append(remove);
    }
  }
  sum.textContent = files?'':'Summe '+euro.format(totalCents/100);
}
document.querySelector('#basket').addEventListener('click',async()=>{
  drawer.showModal();
  const list = drawer.querySelector('.drawer-items');
  try {await renderItems(list,drawer.querySelector('.sum'));}
  catch (error) {list.textContent=error.message;}
});
drawer.querySelector('.drawer-close').addEventListener('click',()=>drawer.close());
drawer.addEventListener('close',()=>clearList(drawer.querySelector('.drawer-items')));
try {
  if (isCart || isFiles) {
    history.replaceState(null,'',location.pathname);
    document.querySelector('#editor').hidden = true;
    section.hidden = false;
    document.querySelector('#cart-title').textContent = isFiles?'Prüfdateien':'Testwarenkorb';
    status.textContent = isFiles?'Dateien des jeweils gesicherten Entwurfs.':'Geschützte Beta · Testpreise';
    await renderItems(document.querySelector('#items'),document.querySelector('#sum'),isFiles);
  } else {
    const [record,session] = await Promise.all([json('/beta-produkt?produkt='+encodeURIComponent(product)),json('/api/workshop/session')]);
    const [model] = await json('/models.json?'+new URLSearchParams({configuration:record.id,revision:record.revision}));
    if (model.configuration.id !== record.id || model.configuration.revision !== record.revision) throw Error('Produktrevision stimmt nicht überein.');
    const binding = {productId:record.id,productRevision:record.revision};
    window.UniversalConfig = model.universal;
    window.GravuruModelProfile = model.legacy;
    window.GravuruWorkshopReview = binding;
    window.GravuruMerchantRequest = (url,options)=>fetch(url,options);
    window.GravuruShopEntry = Object.freeze({
      ...binding,...(params.get('ansicht')==='nativ'?{}:{presentation:'prio-r15'}),
      productName:model.name,cartMode:'theme',shopDomain:location.hostname,themeCartPath:'/beta/cart',request:window.GravuruMerchantRequest,csrfToken:session.csrfToken,backUrl:'/',
      async submitCart(body,{draftToken}) {
        const line = await json('/beta-warenkorb',{method:'POST',headers:{...cartHeaders,'Content-Type':'application/json','X-Gravuru-Draft':draftToken,'X-Gravuru-CSRF':session.csrfToken},body:JSON.stringify({...body,product})});
        if (location.protocol === 'http:') location.assign('/beta/cart');
        return {mode:'theme',handoffUrl:location.origin+'/beta/cart#handoff='+line.handoff,totalCents:line.totalCents,paymentConfirmed:false};
      }
    });
    const frame = el('iframe'); frame.title=model.name; frame.src='/editor.html';
    window.addEventListener('message',event=>{
      if (event.origin !== location.origin || event.source !== frame.contentWindow) return;
      if (event.data?.type === 'gravuru-ux-ready') status.textContent = 'Geschützter Prüfstand · bitte nur Beispieldaten verwenden.';
      if (event.data?.type === 'gravuru-ux-failed') status.textContent = 'Der Editor konnte nicht geladen werden.';
    });
    document.querySelector('#editor').append(frame);
  }
  for (const a of document.querySelectorAll('nav a')) {
    const u = new URL(a.href);
    if (u.pathname===location.pathname && (u.pathname!=='/' || u.searchParams.get('produkt')===product)) a.setAttribute('aria-current','page');
  }
} catch (error) {status.textContent=error.message;}
