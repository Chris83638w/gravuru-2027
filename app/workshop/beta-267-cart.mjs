// Local customer cart for beta #267. Read-only personal previews, no editor reopen.
// Prices and revisions are supplied by the caller from the existing quote/review
// path. This module does not invent a second price table.
import {createHash} from 'node:crypto';
import {deflateSync,crc32} from 'node:zlib';

const fail=(code,message)=>{throw Object.assign(Error(message),{status:422,code});};
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function euro(cents){
 if(!Number.isSafeInteger(cents))fail('cart_price','Preis ist keine ganze Centzahl.');
 const sign=cents<0?'−':'',abs=Math.abs(cents),whole=Math.floor(abs/100).toLocaleString('de-DE'),rest=String(abs%100).padStart(2,'0');
 return sign+whole+','+rest+' €';
}
export function png(width,height,paint){
 const raw=Buffer.alloc((width*3+1)*height);
 for(let y=0;y<height;y++){
  const row=y*(width*3+1);raw[row]=0;
  for(let x=0;x<width;x++){const [r,g,b]=paint(x,y),i=row+1+x*3;raw[i]=r;raw[i+1]=g;raw[i+2]=b;}
 }
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(width,0);ihdr.writeUInt32BE(height,4);ihdr[8]=8;ihdr[9]=2;
 const chunk=(type,data)=>{const name=Buffer.from(type),len=Buffer.alloc(4);len.writeUInt32BE(data.length);const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(Buffer.concat([name,data]))>>>0);return Buffer.concat([len,name,data,crc]);};
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}

function previewOf(spec){
 if(spec.previewStatus==='loading')return {status:'loading',message:'Persönliche Vorschau wird geladen.'};
 if(spec.previewStatus==='error'||!Buffer.isBuffer(spec.previewPng))return {status:'error',message:spec.previewMessage||'Persönliche Vorschau konnte nicht geladen werden.'};
 if(spec.previewPng.length<24||!spec.previewPng.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))fail('cart_preview','Die persönliche Vorschau ist kein PNG.');
 return {status:'ready',bytes:spec.previewPng,sha256:sha256(spec.previewPng),message:'Persönliche Vorschau geladen.'};
}

export function createCartLedger(){
 const rows=new Map();
 let n=0;
 return {
  commit(spec){
   if(!spec||typeof spec.variantId!=='string'||!spec.variantId||typeof spec.productTitle!=='string'||!spec.productTitle)fail('cart_line','Produkt oder Variante fehlt.');
   if(!Number.isSafeInteger(spec.unitCents)||spec.unitCents<0||spec.unitCents>100000000)fail('cart_price','Preis ist keine ganze Centzahl.');
   if(!Number.isSafeInteger(spec.quantity)||spec.quantity<1||spec.quantity>99)fail('cart_quantity','Menge: 1 bis 99.');
   if(spec.currency!=='EUR')fail('cart_currency','Nur Euro aus der vorhandenen Preislogik.');
   if(typeof spec.designSha256!=='string'||!/^[a-f0-9]{64}$/.test(spec.designSha256))fail('cart_design','Die Gestaltungsprüfung fehlt.');
   if(typeof spec.gravurtext!=='string')fail('cart_text','Der Gravurtext fehlt.');
   const preview=previewOf(spec);
   if(preview.status!=='ready')fail('cart_preview','Ohne gesicherte persönliche Vorschau wird keine Position angelegt.');
   const id='cfg_'+String(++n).padStart(4,'0');
   const row=Object.freeze({id,rev:1,variantId:spec.variantId,productTitle:spec.productTitle,designName:String(spec.designName||''),options:Object.freeze([...(spec.options||[])].map(o=>({label:String(o.label),value:String(o.value)}))),gravurtext:spec.gravurtext,unitCents:spec.unitCents,quantity:spec.quantity,currency:'EUR',designSha256:spec.designSha256,snapshotId:spec.snapshotId||null,preview});
   rows.set(id,row);return customerLine(row);
  },
  // Chris, 19.11.2026: keine Änderung einer bestehenden Position. Entfernen und neu konfigurieren.
  remove(id){if(!rows.delete(id))fail('cart_missing','Diese Position ist nicht im Warenkorb.');},
  lines(){return [...rows.values()].map(customerLine);},
  acceptOrder({financialStatus,cancelledAt,lines}){
   if(financialStatus!=='paid')fail('order_unpaid','Unbezahlte Bestellungen werden nicht zur Fertigung freigegeben.');
   if(cancelledAt)fail('order_cancelled','Stornierte Bestellungen werden nicht zur Fertigung freigegeben.');
   if(!Array.isArray(lines)||!lines.length)fail('order_empty','Die Bestellung enthält keine Position.');
   const seen=new Set();
   for(const line of lines){
    const row=rows.get(line?.configuration?.id);
    if(!row)fail('order_foreign','Die Gestaltungs-ID gehört nicht zu diesem Warenkorb.');
    if(line.configuration.rev!==row.rev)fail('order_stale','Die Revision ist nicht der gesicherte Stand.');
    if(line.variantId!==row.variantId)fail('order_variant','Die Variante gehört nicht zu dieser Gestaltung.');
    if(line.unitCents!==row.unitCents||line.quantity!==row.quantity)fail('order_price','Der Preis stimmt nicht mit der serverseitigen Prüfung überein.');
    if(line.gravurtext!==row.gravurtext||line.designSha256!==row.designSha256)fail('order_manipulated','Text oder Gestaltung wurden nach der Sicherung verändert.');
    if(line.previewSha256!==row.preview.sha256)fail('order_manipulated','Die Vorschau gehört nicht zu dieser Revision.');
    if(seen.has(row.id))fail('order_duplicate','Dieselbe Revision wurde doppelt übergeben.');
    seen.add(row.id);
   }
   const byVariant=new Map();
   for(const line of lines){
    const list=byVariant.get(line.variantId)||[];list.push(line);byVariant.set(line.variantId,list);
   }
   for(const list of byVariant.values()){
    const hashes=new Set(list.map(line=>line.previewSha256+':'+line.designSha256));
    if(hashes.size!==list.length)fail('order_swapped','Zwei Gestaltungen derselben Variante sind nicht unterscheidbar.');
   }
   return {accepted:true,productionReady:false,reason:'Bezahlte Testbestellung ist der Revision zugeordnet. Eine Maschinenfreigabe ist damit nicht erteilt.'};
  }
 };
}

function customerLine(row){
 return {lineId:row.id,variantId:row.variantId,productTitle:row.productTitle,designName:row.designName,options:row.options,gravurtext:row.gravurtext,unitCents:row.unitCents,quantity:row.quantity,currency:row.currency,configuration:{id:row.id,rev:row.rev},designSha256:row.designSha256,snapshotId:row.snapshotId,preview:row.preview,previewSha256:row.preview.sha256};
}

export function removeCartLine(lines,lineId){
 const next=lines.filter(line=>line.lineId!==lineId);
 if(next.length===lines.length)fail('cart_missing','Diese Position ist nicht im Warenkorb.');
 return next;
}

export function renderCustomerCart(lines,{title='Warenkorb'}={}){
 if(!Array.isArray(lines))fail('cart_line','Der Warenkorb ist ungültig.');
 const total=lines.reduce((sum,line)=>sum+(line.preview?.status==='ready'||line.unitCents!==undefined?line.unitCents*line.quantity:0),0);
 const articles=lines.map(line=>{
  const preview=line.preview||{status:'error',message:'Persönliche Vorschau konnte nicht geladen werden.'};
  const src=preview.status==='ready'?'data:image/png;base64,'+preview.bytes.toString('base64'):'';
  const media=preview.status==='ready'
   ? `<button type="button" class="zoom" data-enlarge data-src="${esc(src)}" data-label="${esc(line.productTitle)}"><img src="${esc(src)}" alt="Persönliche Gestaltung: ${esc(line.gravurtext||line.productTitle)}" width="320" height="240"></button>`
   : `<p class="preview-state" role="${preview.status==='error'?'alert':'status'}" data-preview-status="${esc(preview.status)}">${esc(preview.message)}</p>`;
  const options=(line.options||[]).map(o=>`<li><span>${esc(o.label)}</span> ${esc(o.value)}</li>`).join('');
  return `<article class="line" data-line="${esc(line.lineId)}" data-variant="${esc(line.variantId)}" data-rev="${esc(line.configuration?.rev??'')}" data-config="${esc(line.configuration?.id??'')}" data-cents="${Number(line.unitCents)||0}" data-qty="${Number(line.quantity)||0}">
    ${media}
    <div class="info">
      <h2>${esc(line.productTitle)}</h2>
      <p class="design">${esc(line.designName)}</p>
      <ul>${options}</ul>
      <p class="text">${esc(line.gravurtext)}</p>
      <p class="meta"><span>Einzelpreis ${esc(euro(line.unitCents||0))}</span><span>Menge ${esc(line.quantity)}</span></p>
      <button type="button" class="remove" data-remove="${esc(line.lineId)}">Entfernen</button>
    </div>
  </article>`;
 }).join('');
 const html=`<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>
  body{margin:0;background:#f4f1ea;color:#1d2422;font:16px/1.45 system-ui,sans-serif}
  main{max-width:980px;margin:0 auto;padding:24px 16px 48px}
  h1{font-size:28px;margin:0 0 4px} .note{color:#5c675f;margin:0 0 20px}
  article{display:grid;grid-template-columns:180px 1fr;gap:16px;background:#fff;border-radius:12px;padding:16px;margin:0 0 12px;box-shadow:0 1px 0 #e4ddd0}
  img{width:100%;height:auto;background:#111;border-radius:8px;display:block}
  button.zoom{padding:0;border:0;background:transparent;cursor:zoom-in;border-radius:8px}
  h2{font-size:18px;margin:0} .design,.text{margin:4px 0} ul{margin:8px 0;padding:0;list-style:none} li{margin:2px 0} li span{color:#5c675f}
  .meta{display:flex;gap:16px;font-weight:600} .remove{min-height:44px;padding:8px 14px;border:1px solid #b9b2a4;background:#fff;border-radius:8px;cursor:pointer}
  .sum{display:flex;justify-content:space-between;font-size:18px;font-weight:700;margin-top:8px}
  .preview-state{min-height:120px;display:grid;place-items:center;text-align:center;background:#f7f4ee;border:1px dashed #b9b2a4;border-radius:8px;padding:12px}
  dialog{border:0;border-radius:12px;padding:12px;max-width:min(960px,96vw)} dialog img{max-height:80vh;background:#111} dialog::backdrop{background:#0008}
  dialog button{min-height:44px;margin-top:8px}
  @media(max-width:700px){article{grid-template-columns:1fr} main{padding:16px 12px 32px}}
 </style></head><body><main>
  <p class="note">Lokaler Prüfstand · persönliche Vorschau je Position · keine Bearbeitung aus dem Warenkorb</p>
  <h1>${esc(title)}</h1>
  <div id="lines">${articles||'<p data-empty>Der Warenkorb ist leer.</p>'}</div>
  <p class="sum"><span>Summe</span><span id="sum">${esc(euro(total))}</span></p>
  <dialog id="zoom"><img alt=""><button type="button" id="close-zoom">Schließen</button></dialog>
 </main><script>
  const sum=document.querySelector('#sum'),dialog=document.querySelector('#zoom'),img=dialog.querySelector('img');
  const money=cents=>{const sign=cents<0?'−':'',abs=Math.abs(cents);return sign+Math.floor(abs/100).toLocaleString('de-DE')+','+String(abs%100).padStart(2,'0')+' €';};
  function recount(){let total=0;for(const line of document.querySelectorAll('article.line'))total+=Number(line.dataset.cents)*Number(line.dataset.qty);sum.textContent=money(total);}
  document.querySelector('#lines').addEventListener('click',event=>{
   const zoom=event.target.closest('[data-enlarge]');
   if(zoom){img.src=zoom.dataset.src;img.alt=zoom.dataset.label;dialog.showModal();return;}
   const remove=event.target.closest('[data-remove]');
   if(remove){remove.closest('article').remove();recount();}
  });
  document.querySelector('#close-zoom').addEventListener('click',()=>dialog.close());
 </script></body></html>`;
 if(/gravuru-cart-edit|data-cart-edit|_gravuru_bearbeiten/.test(html))fail('cart_edit','Die Warenkorbanzeige enthält einen Bearbeiten-Verweis.');
 if(/<a\b/i.test(html))fail('cart_edit','Die Warenkorbanzeige enthält einen Link.');
 return html;
}
