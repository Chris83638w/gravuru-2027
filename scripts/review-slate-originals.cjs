const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const args=process.argv.slice(2),arg=k=>args[args.indexOf(k)+1];
for(const k of args.includes('--gallery-only')?['--package']:['--package','--url','--import'])assert(args.includes(k),k+' required');
const root=path.resolve(arg('--package')),pack=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'))),imported=args.includes('--gallery-only')?null:JSON.parse(fs.readFileSync(arg('--import')));
const esc=s=>String(s??'').replace('Original or documented replacement font missing: ','Original- oder dokumentierte Ersatzschrift fehlt: ').replace('UV source is incomplete; editable original print layers cannot be reconstructed exactly.','UV-Original unvollständig: Bilddateien oder bearbeitbare Ebenen fehlen.').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const css=`*{box-sizing:border-box}body{margin:0;padding:24px;background:#f5f3ef;color:#252b29;font:16px/1.45 Arial,sans-serif}h1{font-size:27px;margin:0 0 8px}header{margin-bottom:20px}input,select{padding:10px;border:1px solid #a9b6af;border-radius:6px;font:inherit;margin:8px 8px 0 0}article{background:white;padding:14px;margin-bottom:18px;border:1px solid #d8ddd8;border-radius:10px;break-inside:avoid}h2{font-size:17px;margin:0 0 10px}.images{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:15px}figure{margin:0}figcaption{font-size:12px;color:#555;margin-bottom:4px}img{display:block;width:100%;height:200px;object-fit:contain;background:#eee}.open{height:200px;display:grid;place-items:center;background:#f5ede3;text-align:center;padding:14px;color:#6c4c26;font-size:13px}small{display:block;color:#59605b;font-size:12px;margin-top:8px}.notice{padding:10px;background:#e5ebe6;border-radius:5px}article[hidden]{display:none}@media(max-width:700px){body{padding:14px}.images{grid-template-columns:1fr}img{height:240px}}`;
const card=r=>{
 const original=r.files.find(f=>f.name==='preview.png')||r.files.find(f=>/\.(png|jpg)$/i.test(f.name));
 const photo=r.sourceIssue?'Fotobereich fehlt':r.photoSlots>0?'mit Foto':'ohne Foto';
 const image=(mm)=>{const t=r.targets.find(t=>t.mm[0]===mm);return t?.status==='prepared'?`<img loading="lazy" src="${t.preview}">`:`<div class="open">${esc(t?.reason||r.reason||r.error||'Originalquelle unvollständig')}</div>`;};
 const substitutions=[...new Set((r.technicalChanges||[]).filter(c=>c.from).map(c=>c.from+' → '+c.to))];
 return `<article data-group="${esc(r.group)}" data-search="${esc([r.id,r.group,r.subcategory,photo,r.process].join(' ').toLowerCase())}"><h2>${esc(r.id)} · ${esc(r.group)} / ${esc(r.subcategory)} · ${esc(r.process)}${r.process==='Gravur'?' · '+photo:''}</h2><div class="images"><figure><figcaption>Katalog-Original · Neue Struktur</figcaption>${original?`<img loading="lazy" src="originals/${r.id}/${encodeURIComponent(original.name)}">`:'<div class="open">Keine Originalvorschau</div>'}</figure><figure><figcaption>Konfigurator · 30 × 20 cm</figcaption>${image(300)}</figure><figure><figcaption>Konfigurator · 22 × 14 cm</figcaption>${image(220)}</figure></div><small>${substitutions.length?'Freigegebener Schriftersatz: '+esc(substitutions.join(', ')):'Originalschriften unverändert, soweit vorbereitet.'}${r.catalogueReview?.length?' · Sichtprüfungshinweis aus dem Katalog vorhanden; Designfreigabe bleibt offen.':''}</small></article>`;
};
const rows=[...pack.originals].sort((a,b)=>a.process.localeCompare(b.process)||a.group.localeCompare(b.group)||a.subcategory.localeCompare(b.subcategory)||a.id.localeCompare(b.id,'de',{numeric:true}));
const page=(list,title,filter=false)=>`<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>${css}</style><header><h1>${esc(title)}</h1><p>Originale aus der Neuen Struktur · gleiche Gestaltung in beiden Größen · Stand 05.11.2026</p><p class="notice">${pack.counts.preparedDesigns} Gravurdesigns für beide Größen vorbereitet. Offene Quellen sind gekennzeichnet. Dokumentierte Ersatzschriften wurden von Chris freigegeben. Keine Live-Veröffentlichung.</p>${filter?'<input id="search" placeholder="Designnummer, Hund, Katze, Foto …"><select id="group"><option value="">Alle Gruppen</option>'+[...new Set(rows.map(r=>r.group))].map(g=>`<option>${esc(g)}</option>`).join('')+'</select>':''}</header><main>${list.map(card).join('')}</main>${filter?`<script>function filter(){const q=document.querySelector('#search').value.toLowerCase(),g=document.querySelector('#group').value;for(const a of document.querySelectorAll('article'))a.hidden=!(a.dataset.search.includes(q)&&(!g||a.dataset.group===g));}document.querySelector('#search').oninput=filter;document.querySelector('#group').onchange=filter;</script>`:''}</html>`;
(async()=>{
 fs.writeFileSync(path.join(root,'galerie.html'),page(rows,'Schiefer-Gedenktafeln · Originalvergleich',true));
 const browser=await chromium.launch({headless:true,args:['--no-proxy-server']});const checks=[];
 try{
  if(!args.includes('--browser-only')){
  const tab=await browser.newPage({viewport:{width:1380,height:1000},deviceScaleFactor:1});
  for(let i=0;i<rows.length;i+=6){const name='vergleich-'+String(1+i/6).padStart(2,'0');fs.writeFileSync(path.join(root,name+'.html'),page(rows.slice(i,i+6),`Originalvergleich · Blatt ${1+i/6} / ${Math.ceil(rows.length/6)}`));await tab.goto(pathToFileURL(path.join(root,name+'.html')).href);await tab.evaluate(async()=>{for(const img of document.images)img.loading='eager';await Promise.all([...document.images].map(i=>i.decode()));});await tab.screenshot({path:path.join(root,name+'.png'),fullPage:true});}
  const dogRows=rows.filter(r=>r.group==='Tiere'&&r.subcategory==='Allgemein'&&r.photoSlots===0&&r.targets.every(t=>t.status==='prepared')).slice(0,6);
  fs.writeFileSync(path.join(root,'tiere-ohne-foto.html'),page(dogRows,'Tiergedenken ohne Foto · sechs Originale im Vergleich'));
  await tab.goto(pathToFileURL(path.join(root,'tiere-ohne-foto.html')).href);await tab.evaluate(async()=>{for(const img of document.images)img.loading='eager';await Promise.all([...document.images].map(i=>i.decode()));});await tab.screenshot({path:path.join(root,'tiere-ohne-foto.png'),fullPage:true});await tab.close();
  }
  if(args.includes('--gallery-only'))return;
  for(const size of args.includes('--photos-only')?[]:['GT-SN-RE-300X200','GT-SN-RE-220X140'])for(const device of ['desktop','mobile']){
   const product=imported.products.find(p=>p.key.startsWith(size+':Tiere:Allgemein:ohne-foto'));assert(product,'animal review group missing');
   const context=await browser.newContext(device==='mobile'?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1440,height:1000}});
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(arg('--url')+'/?configuration='+product.productId+'&revision='+product.revision,{waitUntil:'networkidle',timeout:120000});
   const frame=page.frames().find(f=>f.url().endsWith('/editor.html'));assert(frame,'native editor frame missing');
   const config=frame.locator('gravuru-configurator');await config.locator(device==='mobile'?'[data-ux="mobile-step"][data-step="design"]':'#ux-tab-design').waitFor({state:'visible',timeout:30000});
   const state=await config.evaluate(el=>({design:el.state.designId,ids:el.catalog.designs.map(d=>d.id),objects:el.state.objects.map(o=>({id:o.id,type:o.type,text:o.text,fieldKey:o.fieldKey}))}));
   assert.equal(state.ids.length,product.designIds.length);assert(state.objects.some(o=>o.type==='text'&&o.fieldKey==='name'));
   await config.locator(device==='mobile'?'[data-ux="mobile-step"][data-step="design"]':'#ux-tab-design').click();
   const buttons=config.locator('[data-c-design]');assert.equal(await buttons.count(),product.designIds.length);
   if(await buttons.count()>1){await buttons.nth(1).click();const selected=await config.evaluate(el=>el.state.designId);assert.notEqual(selected,state.design);}
   const name=await config.evaluate(el=>el.state.objects.find(o=>o.fieldKey==='name'));
   assert(name);await config.locator(device==='mobile'?'[data-ux="mobile-step"][data-step="text"]':'#ux-tab-text').click();
   await config.locator(`[data-ux-text="${name.id}"]`).fill('Milo');
   assert.equal(await config.evaluate((el,id)=>el.state.objects.find(o=>o.id===id).text,name.id),'Milo');
   const preserved=await config.evaluate((el,id)=>el.catalog.designs.find(d=>d.id===el.state.designId).objects.find(o=>o.id===id).text,name.id);assert.equal(preserved,name.text);
   await page.screenshot({path:path.join(root,`${size}-${device}-konfigurator.png`),fullPage:true});
   assert.deepEqual(errors,[]);checks.push({size,device,designCount:state.ids.length,designSwitch:true,textEdit:true,templatePreserved:true,textFields:state.objects.filter(o=>o.type==='text').length,errors});await context.close();
  }
  for(const size of ['GT-SN-RE-300X200','GT-SN-RE-220X140']){
   const product=imported.products.find(p=>p.key.startsWith(size+':')&&p.designIds.includes('GT-S-30x20-D220'));assert(product);
   const {document}=JSON.parse(fs.readFileSync(path.join(root,product.file))),design=document.config.profile.designs.find(d=>d.katalog.originalId==='GT-S-30x20-D220');
   const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],failed=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().includes('/design-assets/'))failed.push(r.url());});
   await page.goto(arg('--url')+'/?configuration='+product.productId+'&revision='+product.revision,{waitUntil:'networkidle',timeout:120000});
   const frame=page.frames().find(f=>f.url().endsWith('/editor.html')),config=frame.locator('gravuru-configurator');await config.locator('#ux-tab-design').click();await config.locator(`[data-c-design="${design.id}"]`).click();
   await page.waitForLoadState('networkidle');const slots=await config.evaluate(el=>el.state.objects.filter(o=>o.type==='photoSlot').map(o=>({id:o.id,mask:o.photoMaskAssetId})));
   assert.equal(slots.length,1);assert(slots[0].mask);assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
   await config.locator('#ux-tab-text').click();await frame.evaluate(()=>window.scrollTo(0,0));await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(root,size+'-D220-originalfoto.png'),fullPage:true});
   checks.push({size,design:'GT-S-30x20-D220',originalPhotoAndMask:true,photoSlots:slots.length,errors,failed});await page.close();
  }
 }finally{await browser.close();}
 if(args.includes('--photos-only'))checks.unshift(...JSON.parse(fs.readFileSync(path.join(root,'browser-checks.json'))).checks.filter(c=>c.device));
 fs.writeFileSync(path.join(root,'browser-checks.json'),JSON.stringify({localOnly:true,shopifyWrites:0,checks},null,2));console.log(JSON.stringify({sheets:Math.ceil(rows.length/6),checks}));
})().catch(e=>{console.error(e);process.exitCode=1;});
