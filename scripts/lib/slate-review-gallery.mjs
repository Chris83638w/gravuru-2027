import fs from 'node:fs';
import path from 'node:path';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function slateGalleryHtml(pack, imported) {
 const card=r=>{
  const original=r.files.find(f=>f.name==='preview.png')||r.files.find(f=>/\.(png|jpe?g)$/i.test(f.name));
  const originalUrl=original?'/originale/files/originals/'+encodeURIComponent(r.id)+'/'+encodeURIComponent(original.name):null;
  const photo=r.process==='UV'?'Fotofelder noch offen':r.photoSlots?'mit Foto':'ohne Foto',process=r.process==='UV'?'UV-Druck':'Gravur';
  const target=width=>{
   const t=r.targets.find(t=>t.mm[0]===width),p=t?.status==='prepared'&&imported.products.find(p=>p.key.startsWith(t.sizeKey+':')&&p.designIds.includes(r.id));
   if(!p)return '<div class="open">'+esc((t?.reason||r.reason||r.error||'Originalquelle noch unvollständig').replace('UV source is incomplete; editable original print layers cannot be reconstructed exactly.','Bearbeitbare Originaldateien für diesen Druck fehlen noch.'))+'</div>';
   const design='katalog-'+r.id,preview='/api/workshop/products/'+encodeURIComponent(p.productId)+'/preview.svg?'+new URLSearchParams({designId:design});
   const edit='/werkstatt/?'+new URLSearchParams({configuration:p.productId,design,reviewGallery:'1'});
   return `<a href="${esc(edit)}"><img loading="lazy" src="${esc(preview)}" alt="${esc(r.id)} in ${width===300?'30 × 20':'22 × 14'} cm"></a><a class="edit" href="${esc(edit)}">${width===300?'30 × 20':'22 × 14'} bearbeiten</a>`;
  };
  const changes=(r.technicalChanges||[]).filter(c=>/thematic|empty white/.test(c.action)).map(c=>c.theme?'Beispielfoto passend zu '+c.theme:'Leere Fotoabdeckung entfernt');
  return `<article data-search="${esc([r.id,r.group,r.subcategory,photo,process].join(' ').toLowerCase())}" data-group="${esc(r.group)}" data-process="${process}"><h2>${esc(r.id)} · ${esc(r.group)} / ${esc(r.subcategory)} · ${process} · ${photo}</h2><div class="images"><figure><figcaption>Katalogoriginal</figcaption>${originalUrl?`<a href="${originalUrl}" target="_blank" rel="noopener"><img loading="lazy" src="${originalUrl}" alt="Unverändertes Katalogoriginal"></a>`:'Keine Originalvorschau'}</figure><figure><figcaption>30 × 20 cm · aktueller Entwurf</figcaption>${target(300)}</figure><figure><figcaption>22 × 14 cm · aktueller Entwurf</figcaption>${target(220)}</figure></div>${changes.length?'<p class="note">'+esc([...new Set(changes)].join(' · '))+'</p>':''}</article>`;
 };
 const rows=[...pack.originals].sort((a,b)=>a.process.localeCompare(b.process)||a.group.localeCompare(b.group,'de')||a.subcategory.localeCompare(b.subcategory,'de')||a.id.localeCompare(b.id,'de',{numeric:true}));
 return `<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Schiefer · alle Vorlagen ansehen und bearbeiten</title><style>*{box-sizing:border-box}body{margin:0;background:#f5f3ef;color:#252b29;font:16px/1.5 Arial,sans-serif;padding:24px}h1{font-size:28px;margin:0 0 8px}header{margin-bottom:24px}.filters{display:flex;gap:10px;flex-wrap:wrap}input,select{padding:10px;font:inherit;border:1px solid #acb7b0;border-radius:6px}article{background:white;border:1px solid #d5ded7;border-radius:10px;margin-bottom:22px;padding:16px}article[hidden]{display:none}h2{font-size:18px;margin:0 0 14px}.images{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}figure{margin:0}figcaption{font-size:14px;margin-bottom:8px}img{width:100%;height:230px;object-fit:contain;background:#eee;display:block}.edit{display:block;text-align:center;background:#17614f;color:white;padding:10px;border-radius:6px;margin-top:10px;text-decoration:none}.open{min-height:230px;background:#f4eadf;padding:20px;display:grid;place-content:center;font-size:14px}.note{color:#53645c;font-size:14px}#count{font-weight:bold}@media(max-width:800px){body{padding:12px}.images{grid-template-columns:1fr}img{height:280px}}</style><header><h1>Alle ${rows.length} Schiefer-Vorlagen</h1><p>${rows.filter(r=>r.targets.length===2&&r.targets.every(t=>t.status==='prepared')).length} Vorlagen sind in beiden Größen bearbeitbar. Die übrigen bleiben mit ihrem offenen Punkt sichtbar.</p><p>Original und beide Größen vergleichen. Mit „Bearbeiten“ öffnest du die Vorlage: Texte, Motive und Fotos ändern und anschließend „Änderungen speichern“ wählen.</p><p>Änderungen gelten jeweils für die gewählte Größe. Die gespeicherten Änderungen erscheinen beim erneuten Öffnen dieser Galerie. Deine Bildfreigabe gibst du weiterhin hier im Chat mit der Designnummer. Alles bleibt ein lokaler Entwurf.</p><div class="filters"><input id="search" aria-label="Vorlagen suchen" placeholder="Designnummer oder Thema …"><select id="group" aria-label="Thema"><option value="">Alle Themen</option>${[...new Set(rows.map(r=>r.group))].map(g=>'<option>'+esc(g)+'</option>').join('')}</select><select id="process" aria-label="Verfahren"><option value="">Gravur und Druck</option><option>Gravur</option><option>UV-Druck</option></select><span id="count">${rows.length} Vorlagen</span></div></header><main>${rows.map(card).join('')}</main><script>const search=document.querySelector('#search'),group=document.querySelector('#group'),process=document.querySelector('#process');function filter(){let n=0;for(const a of document.querySelectorAll('article')){a.hidden=!(a.dataset.search.includes(search.value.toLowerCase())&&(!group.value||a.dataset.group===group.value)&&(!process.value||a.dataset.process===process.value));if(!a.hidden)n++;}document.querySelector('#count').textContent=n+' Vorlagen';}for(const el of [search,group,process])el.addEventListener('input',filter);</script></html>`;
}
export function createSlateGalleryHandler(root, importsFile) {
 const pack=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'))),imported=JSON.parse(fs.readFileSync(importsFile));
 return (req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1');
  if(!url.pathname.startsWith('/originale'))return false;
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405).end();return true;}
  let bytes,type;
  if(['/originale','/originale/'].includes(url.pathname)){bytes=Buffer.from(slateGalleryHtml(pack,imported));type='text/html; charset=utf-8';}
  else{
   let relative;try{relative=decodeURIComponent(url.pathname.slice('/originale/files/'.length));}catch{res.writeHead(400).end();return true;}
   const file=path.resolve(root,relative),ext=path.extname(file).toLowerCase();
   if(!url.pathname.startsWith('/originale/files/originals/')||!file.startsWith(path.resolve(root)+path.sep)||!['.png','.jpg','.jpeg','.webp'].includes(ext)||!fs.existsSync(file)){res.writeHead(404).end();return true;}
   bytes=fs.readFileSync(file);type=ext==='.png'?'image/png':ext==='.webp'?'image/webp':'image/jpeg';
  }
  res.writeHead(200,{'Content-Type':type,'Content-Length':bytes.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).end(req.method==='HEAD'?undefined:bytes);return true;
 };
}
