const CART_KEY=/^\d+:[a-f0-9]{32}$/;
const UUID=/^[a-f0-9-]{36}$/;
const MAX_IMAGE=15*1024*1024;
export function shopifyUpload(value,root){
 if(typeof value!=='string'||!/^https:\/\/cdn\.shopify\.com\/s\/files\/1\/\d{4}\/\d{4}\/\d{4}\/uploads\/[a-f0-9]{32}\.(?:png|jpe?g|webp|json|svg|pdf)$/.test(value))throw Error('Ungültige gespeicherte Datei.');
 if(root&&!value.startsWith(root))throw Error('Dateien gehören zu verschiedenen Shops.');
 return value;
}
export function legacyLine(cart,key,productId){
 if(!CART_KEY.test(key||''))throw Error('Ungültige Warenkorbposition.');
 const item=cart.items?.find(row=>row.key===key),p=item?.properties;
 if(!item||String(item.product_id)!==String(productId)||!p||!UUID.test(p['_Gravuru Vorgang']||''))throw Error('Diese Gestaltung ist nicht mehr in deinem Warenkorb.');
 if(!Number.isSafeInteger(item.quantity)||item.quantity<1||item.quantity>99)throw Error('Ungültige gespeicherte Menge.');
 const preview=shopifyUpload(p.Entwurf),root=preview.slice(0,preview.lastIndexOf('/')+1);
 shopifyUpload(p['Bearbeitbarer Entwurf'],root);
 return {item,root};
}
export function snapshotPhotos(snapshot,item,root){
 if(snapshot?.schema!=='gravuru-shopify-design/v1'||snapshot.productId!=='gid://shopify/Product/'+item.product_id||String(snapshot.price?.variantId)!==String(item.variant_id)||!Array.isArray(snapshot.uploads)||snapshot.uploads.length>4)throw Error('Der Entwurf gehört nicht zu dieser Warenkorbposition.');
 const seen=new Set();
 return snapshot.uploads.map(mapping=>{
  const match=/^bild-([1-4])-original\.(?:jpg|png|webp)$/.exec(mapping.original||'');
  if(!match||seen.has(match[1])||typeof mapping.uploadId!=='string'||!UUID.test(mapping.uploadId))throw Error('Ungültige gespeicherte Fotozuordnung.');
  seen.add(match[1]);
  const n=match[1],original=shopifyUpload(item.properties['Originalbild '+n],root);
  if(mapping.edited&&mapping.edited!=='bild-'+n+'-bearbeitet.png')throw Error('Ungültige gespeicherte Fotobearbeitung.');
  return {...mapping,originalUrl:original,editedUrl:mapping.edited?shopifyUpload(item.properties['Bearbeitetes Bild '+n],root):null};
 });
}
export function sameLine(a,b){
 return !!a&&!!b&&a.key===b.key&&a.quantity===b.quantity&&a.variant_id===b.variant_id&&JSON.stringify(a.properties)===JSON.stringify(b.properties);
}
export function verifiedReplacement(cart,message){
 const rows=cart.items?.filter(row=>row.properties?.['_Gravuru Vorgang']===message.properties['_Gravuru Vorgang'])||[];
 if(rows.length!==1)throw Error('Die neue Warenkorbposition wurde nicht eindeutig bestätigt.');
 const line=rows[0];
 if(String(line.product_id)!==String(message.productId).split('/').pop()||String(line.variant_id)!==message.variantId||line.quantity!==message.quantity||line.final_line_price!==message.priceCents*message.quantity)throw Error('Preis oder Menge der neuen Warenkorbposition wurde nicht bestätigt.');
 for(const [key,value] of Object.entries(message.properties))if(line.properties?.[key]!==value)throw Error('Die Gestaltung wurde nicht vollständig übernommen.');
 for(const asset of message.assets)shopifyUpload(line.properties?.[asset.property]);
 return line;
}
export async function replaceLegacyLine({request,original,message,body}){
 const get=()=>request('cart.js').then(r=>{if(!r.ok)throw Error('Warenkorb nicht erreichbar.');return r.json();});
 const before=await get();
 if(!sameLine(before.items.find(row=>row.key===original.key),original))throw Error('Die Warenkorbposition wurde inzwischen geändert. Bitte erneut öffnen.');
 let response;
 try{response=await request('cart/add.js',{method:'POST',body});}catch{
  // A lost response can still mean a successful add; reconcile by the unique operation id before retrying.
 }
 if(response&&!response.ok){const error=await response.json().catch(()=>({}));throw Error(error.description||'Die neue Gestaltung konnte nicht übernommen werden.');}
 const added=await get(),replacement=verifiedReplacement(added,message);
 if(!sameLine(added.items.find(row=>row.key===original.key),original))throw Error('Der bisherige Stand wurde inzwischen geändert. Beide Stände bleiben zur Prüfung im Warenkorb.');
 const removal=await request('cart/change.js',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:original.key,quantity:0})});
 if(!removal.ok)throw Error('Der neue Stand ist gespeichert. Der bisherige Stand bleibt zur Prüfung ebenfalls im Warenkorb.');
 const final=await get();verifiedReplacement(final,message);
 if(final.items.some(row=>row.key===original.key))throw Error('Der bisherige Stand ist noch im Warenkorb. Bitte beide Stände prüfen.');
 for(const row of before.items.filter(row=>row.key!==original.key))if(!sameLine(final.items.find(item=>item.key===row.key),row))throw Error('Eine andere Warenkorbposition wurde inzwischen geändert. Bitte den Warenkorb prüfen.');
 if(final.items.length!==before.items.length)throw Error('Der Warenkorbinhalt wurde zwischenzeitlich geändert. Bitte prüfen.');
 return replacement;
}
function fileForm(message,binding){
 if(message.productId!=='gid://shopify/Product/'+binding.productId||!binding.variants.includes(message.variantId)||!Number.isSafeInteger(message.quantity)||message.quantity<1||message.quantity>99||!Number.isSafeInteger(message.priceCents)||message.priceCents<0||!UUID.test(message.properties?.['_Gravuru Vorgang']||''))throw Error('Ungültige Warenkorbübergabe.');
 if(!Array.isArray(message.assets)||message.assets.length<6||message.assets.length>14)throw Error('Gestaltungsdateien unvollständig.');
 const form=new FormData();form.append('id',message.variantId);form.append('quantity',String(message.quantity));
 for(const [key,value] of Object.entries(message.properties)){if(!/^[\w ÄÖÜäöüß×-]{1,80}$/.test(key)||typeof value!=='string'||value.length>1000)throw Error('Ungültige Gestaltungsangabe.');form.append('properties['+key+']',value);}
 let bytes=0;const seen=new Set();
 for(const a of message.assets){
  if(!(a.blob instanceof Blob)||a.blob.size<1||a.blob.size>30*1024*1024||!['image/png','image/jpeg','image/webp','image/svg+xml','application/pdf','application/json'].includes(a.blob.type)||!/^[\w ÄÖÜäöüß-]{1,80}$/.test(a.property)||!/^[a-z0-9.-]{1,80}$/.test(a.name)||seen.has(a.property))throw Error('Ungültige Gestaltungsdatei.');
  seen.add(a.property);bytes+=a.blob.size;form.append('properties['+a.property+']',a.blob,a.name);
 }
 if(bytes>100*1024*1024)throw Error('Die Bilder sind zusammen zu groß.');
 return form;
}
async function readAsset(url,root,max,types){
 const response=await fetch(shopifyUpload(url,root),{credentials:'omit',redirect:'error',signal:AbortSignal.timeout(30000)});
 if(!response.ok||!types.includes((response.headers.get('Content-Type')||'').split(';')[0]))throw Error('Eine gespeicherte Datei konnte nicht geladen werden.');
 if(Number(response.headers.get('Content-Length'))>max)throw Error('Gespeicherte Datei ist zu groß.');
 const blob=await response.blob();if(blob.size<1||blob.size>max)throw Error('Gespeicherte Datei ist zu groß.');
 return blob;
}
function previewDialog(link){
 const d=document.createElement('dialog'),close=document.createElement('button'),img=document.createElement('img');
 d.className='gravuru-cart-image-dialog';d.setAttribute('aria-label',link.dataset.previewLabel||'Vorschau');
 close.type='button';close.textContent=link.dataset.closeLabel||'Schließen';close.onclick=()=>d.close();
 img.alt=link.querySelector('img')?.alt||'';img.src=shopifyUpload(link.href);d.append(close,img);document.body.append(d);
 d.addEventListener('close',()=>{d.remove();link.focus();},{once:true});d.showModal();
}
async function editLegacy(key){
 const host=[...document.querySelectorAll('[data-gravuru-m]')].find(node=>node.querySelector('[data-gravuru-binding]')||node.dataset.gravuruM);
 if(!host)return;
 const binding=JSON.parse(host.dataset.gravuruM?atob(host.dataset.gravuruM):host.querySelector('[data-gravuru-binding]').textContent);
 if(!binding.ready||!Array.isArray(binding.variants))throw Error('Die Produktvorschau ist nicht bereit.');
 const target=new URL(binding.url);
 if(target.protocol!=='https:'||target.hostname!=='gravuru-designwerkstatt.de'||!/^\/produktvorschau\/[a-f0-9]{48}\/$/.test(target.pathname)||target.search||target.hash)throw Error('Ungültige Produktvorschau.');
 const root=window.Shopify?.routes?.root||'/',request=(path,options={})=>fetch(root+path,{credentials:'same-origin',cache:'no-store',...options});
 const dialog=document.createElement('dialog'),back=document.createElement('button'),status=document.createElement('p'),frame=document.createElement('iframe');
 dialog.className='gravuru-cart-editor-dialog';dialog.setAttribute('aria-label','Gestaltung aus dem Warenkorb bearbeiten');
 back.type='button';back.textContent='← Zum Warenkorb';back.onclick=()=>location.assign(root+'cart');
 status.setAttribute('role','status');status.textContent='Deine Gestaltung und Fotos werden geladen …';frame.title='Gespeicherte Gestaltung bearbeiten';frame.inert=true;frame.style.opacity='0';
 dialog.append(back,status,frame);document.body.append(dialog);dialog.showModal();
 dialog.addEventListener('cancel',event=>{event.preventDefault();if(!back.disabled)location.assign(root+'cart');});
 const cart=await request('cart.js').then(r=>{if(!r.ok)throw Error('Warenkorb nicht erreichbar.');return r.json();}),loaded=legacyLine(cart,key,binding.productId),original=loaded.item;
 if(!binding.variants.includes(String(original.variant_id)))throw Error('Ausführung gehört nicht zu diesem Produkt.');
 const snapshot=JSON.parse(await (await readAsset(original.properties['Bearbeitbarer Entwurf'],loaded.root,2_000_000,['application/json'])).text());
 const photos=[];
 for(const m of snapshotPhotos(snapshot,original,loaded.root)){
  const originalPhoto=await readAsset(m.originalUrl,loaded.root,MAX_IMAGE,['image/png','image/jpeg','image/webp']);
  const edited=m.editedUrl?await readAsset(m.editedUrl,loaded.root,MAX_IMAGE,['image/png','image/jpeg','image/webp']):undefined;
  photos.push({uploadId:m.uploadId,originalName:m.original,editedName:m.edited,original:originalPhoto,edited});
 }
 const session=crypto.randomUUID();let restored=false,busy=false,sent=false;
 const timeout=setTimeout(()=>{if(!restored)status.textContent='Die Gestaltung lädt länger als erwartet. Du kannst zum unveränderten Warenkorb zurückkehren.';},45000);
 window.addEventListener('message',async event=>{
  const message=event.data;
  if(event.origin!==target.origin||event.source!==frame.contentWindow||message?.session!==session)return;
  if(message.type==='gravuru-cart-editor-ready'&&!sent){sent=true;frame.contentWindow.postMessage({type:'gravuru-cart-restore',session,snapshot,photos,quantity:original.quantity},target.origin);}
  if(message.type==='gravuru-cart-restored'){restored=true;clearTimeout(timeout);status.textContent='Deine gespeicherte Gestaltung ist geladen. Einlegen in den Warenkorb ersetzt genau diese Position.';frame.inert=false;frame.style.opacity='1';}
  if(message.type==='gravuru-cart-restore-error'){clearTimeout(timeout);status.textContent=message.message+' Die Warenkorbposition bleibt erhalten.';}
  if(message.type==='gravuru-preview-close'&&!busy)location.assign(root+'cart');
  if(message.type!=='gravuru-cart-submit'||!restored||busy)return;
  busy=true;back.disabled=true;
  try{
   const body=fileForm(message,binding);
   const response=await request('variants/'+message.variantId+'.js');
   if(!response.ok)throw Error('Ausführung nicht erreichbar.');
   const variant=await response.json();if(!variant.available||variant.price!==message.baseVariantCents)throw Error('Ausführung oder Preis wurde geändert. Bitte das Produkt erneut öffnen.');
   status.textContent='Deine neue Gestaltung wird geprüft und im Warenkorb ersetzt …';
   await replaceLegacyLine({request,original,message,body});location.assign(root+'cart');
  }catch(error){
   frame.hidden=true;status.textContent=error.message+' Bitte zum Warenkorb zurückkehren, bevor du erneut bearbeitest.';frame.contentWindow.postMessage({type:'gravuru-cart-error',session,message:error.message},target.origin);
  }finally{busy=false;back.disabled=false;}
 });
 frame.src=target.href+'#'+new URLSearchParams({origin:location.origin,session});
}
if(typeof document!=='undefined'){
 document.addEventListener('click',event=>{
  const link=event.target.closest('.gravuru-cart-preview-link[data-gravuru-preview]');
  if(!link)return;
  try{shopifyUpload(link.href);}catch{return;}
  event.preventDefault();previewDialog(link);
 });
 const key=new URLSearchParams(location.search).get('gravuru_cart');
 if(key)editLegacy(key).catch(error=>{
  const dialog=document.querySelector('.gravuru-cart-editor-dialog');
  if(dialog)dialog.querySelector('[role=status]').textContent=error.message+' Dein Warenkorb bleibt erhalten.';
 });
}
