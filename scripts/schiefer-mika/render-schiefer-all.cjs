const fs=require('fs'),path=require('path'),{pathToFileURL}=require('url');
const {chromium}=require('C:/Users/Mikail Erdem/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const workspace=process.env.GRAVURU_PROJECT_ROOT||path.resolve(__dirname,'..');
const root=path.join(workspace,'outputs/schiefer-alle-groessen');
const base=path.join(workspace,'outputs/schiefer-30-hunde-30-katzen');
const manifest=JSON.parse(fs.readFileSync(base+'/manifest.json'));
const masters=JSON.parse(fs.readFileSync(root+'/master-index.json'));
const products=JSON.parse(fs.readFileSync(root+'/produkte-aus-excel.json'));
const results=JSON.parse(fs.readFileSync(root+'/ergebnis.json'));
const groups=[...new Set(masters.map(x=>x.group))];
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const style=`<style>*{box-sizing:border-box}body{font:18px Segoe UI,sans-serif;margin:0;padding:24px;background:#f3f5f6;color:#17282f;width:2500px}h1{font-size:34px;margin:0 0 10px}p{margin:0 0 18px}main{display:grid;grid-template-columns:repeat(5,1fr);gap:14px}figure{margin:0;padding:9px;background:white;border:1px solid #c9d3db}img{width:100%;height:350px;object-fit:contain;display:block}figcaption{font-size:16px;margin-top:6px}.new{color:#a64b00}footer{margin-top:18px;font-size:16px}</style>`;
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});try{
 const page=await browser.newPage({viewport:{width:2500,height:1500},deviceScaleFactor:1});
 const contacts=[];
 fs.mkdirSync(root+'/kontaktboegen',{recursive:true});
 fs.mkdirSync(root+'/quellen',{recursive:true});
 for(const e of [...new Map(manifest.map(x=>[x.id,x])).values()])if(e.source)fs.copyFileSync(path.join(e.folder,'original.png'),root+'/quellen/'+e.id+'.png');
 for(const m of masters){
  const file=root+'/preview-render.html';fs.writeFileSync(file,`<style>body{margin:0;background:white}img{width:740px;display:block}</style><img src="${pathToFileURL(path.join(m.path,'kontrollansicht.svg')).href}">`);
  await page.goto(pathToFileURL(file).href);await page.locator('img').evaluate(i=>i.decode());await page.locator('img').screenshot({path:path.join(m.path,'preview.png')});
 }
 console.log('485 Master-Vorschauen gerendert.');
 for(const group of groups){
  for(const theme of ['hunde','katzen']){
   const selected=manifest.filter(x=>x.theme===theme).map(x=>({entry:x,master:masters.find(m=>m.group===group&&m.id===x.id&&m.themes.includes(theme))})).filter(x=>x.master);
   if(!selected.length)continue;
   const first=selected[0].master;const p=products.find(x=>x.excelRow===first.representativeRow);
   const sizes=[...new Set(results.results.filter(x=>x.group===group).map(x=>x.product))];
   const cards=selected.map(({entry:e,master:m})=>`<figure><img src="${pathToFileURL(path.join(m.path,'kontrollansicht.svg')).href}"><figcaption><b>${String(e.number).padStart(2,'0')} · ${esc(e.name)}</b>${e.mode.startsWith('neu')?' <span class="new">NEU</span>':''}</figcaption></figure>`).join('');
   const label=theme==='hunde'?'Hunde':'Katzen';
   const priority=p.variants.some(v=>v.id==='ohne')?'Vorrang ohne Bohrlöcher':'Feste Kordel-Ausführung · Lieferanten-Lochmaße offen';
   const html=`<!doctype html><meta charset="utf-8">${style}<h1>${label} · ${selected.length} Designs · ${esc(group)}</h1><p>${priority} · Referenzgröße ${p.widthMm} × ${p.heightMm} mm · Außenkontur blau · keine Fotos</p><main>${cards}</main><footer>Lieferform 2: Original-Pfadattribute und Schriften. Kontrollansichten direkt aus den Vektordaten; kein behaupteter Konfi-Anschluss neuer Formen.<br>Größen/Produkte: ${esc(sizes.join('; '))}. Genaue 0-/2-/4-Lochbilder je Excel-Produkt in den Ableitungen, Kordel nur als feste Ausführung.<br>Bei abweichenden Formaten: Motive unverzerrt erhalten, Texte neu umbrochen; Mindest-Schriftgröße 3 mm. Freigabe offen.</footer>`;
   const file=`${theme}-${group}`;fs.writeFileSync(root+`/kontaktboegen/${file}.html`,html);
   await page.goto(pathToFileURL(root+`/kontaktboegen/${file}.html`).href);await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));});
   await page.screenshot({path:root+`/kontaktboegen/${file}.png`,fullPage:true});
   contacts.push({group,theme,count:selected.length,row:p.excelRow,png:`kontaktboegen/${file}.png`,html:`kontaktboegen/${file}.html`});
  }
  console.log('Kontaktbögen',group);
 }
 // Größenüberblick: ein repräsentatives Design je Produkt, ausschließlich echte gelieferte Geometrie.
 const prodCards=products.filter(p=>p.status==='passt').map(p=>{const r=results.results.find(r=>r.excelRow===p.excelRow&&r.id==='GT-S-22x14-D287')||results.results.find(r=>r.excelRow===p.excelRow);return `<figure><img src="${pathToFileURL(path.join(r.folder,r.variants[0]?.file||'kontrollansicht.svg')).href}"><figcaption><b>Excel R${p.excelRow} · ${esc(p.form)} ${esc(p.label)}</b><br>${esc(p.group)}<br>${esc(p.variants.map(v=>v.id+(v.holeStatus?.includes('offen')?' (Lochmaße offen)':'')).join(', '))}</figcaption></figure>`;}).join('');
 fs.writeFileSync(root+'/groessen-und-produkte.html',`<!doctype html><meta charset="utf-8">${style}<h1>Schiefer · 39 maßlich bestätigte Produkte</h1><p>Ein Beispiel je Produkt; Herzen mit Maßwiderspruch fehlen bewusst. Kordel bleibt feste Lieferform.</p><main>${prodCards}</main>`);
 await page.goto(pathToFileURL(root+'/groessen-und-produkte.html').href);await page.evaluate(async()=>{await Promise.all([...document.images].map(i=>i.decode()));});await page.screenshot({path:root+'/groessen-und-produkte.png',fullPage:true});
 // Lokale Galerie mit Originalvergleich und allen Ausführungen.
 const galleryStyle='<style>body{font:16px Segoe UI;margin:24px;color:#17282f}h1{font-size:30px}nav{display:flex;flex-wrap:wrap;gap:10px}a{color:#194a91}details{border:1px solid #bbb;padding:14px;margin:12px 0}summary{font-weight:600;cursor:pointer}.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(390px,1fr));gap:14px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:8px}img{width:100%;height:250px;object-fit:contain}article{border:1px solid #ddd;padding:12px}small{display:block}table{border-collapse:collapse}td,th{padding:8px;border:1px solid #ccc}</style>';
 let sections='';
 for(const contact of contacts){
  const selected=manifest.filter(x=>x.theme===contact.theme).map(e=>({e,m:masters.find(m=>m.group===contact.group&&m.id===e.id&&m.themes.includes(contact.theme))})).filter(x=>x.m);
  sections+=`<details id="${contact.theme}-${contact.group}"><summary>${contact.theme} · ${contact.group} · ${contact.count} Designs · <a href="${contact.png}">Kontaktbogen-PNG</a></summary><div class="cards">${selected.map(({e,m})=>`<article><b>${e.number} · ${esc(e.name)}${e.mode.startsWith('neu')?' · NEU':''}</b><div class="pair">${e.source?`<figure><img src="${pathToFileURL(path.join(e.folder,'original.png')).href}"><figcaption>Eure Vorlage</figcaption></figure>`:'<p>Neue Gestaltung aus eigenen Bestandsmotiven</p>'}<figure><img src="${pathToFileURL(path.join(m.path,'kontrollansicht.svg')).href}"><figcaption>Neue Form / Referenzgröße</figcaption></figure></div><small>${esc(e.fonts.join(', '))}</small>${results.results.filter(r=>r.group===contact.group&&r.id===e.id).map(r=>`<p>Excel R${r.excelRow} · ${esc(r.product)}: ${r.variants.map(v=>`<a href="${pathToFileURL(path.join(r.folder,v.file)).href}">${v.id}</a>`).join(' · ')}</p>`).join('')}</article>`).join('')}</div></details>`;
 }
 const excluded=products.filter(p=>p.status==='offen-Massabweichung').map(p=>`<tr><td>R${p.excelRow}</td><td>${esc(p.group)} · ${esc(p.form)} ${esc(p.label)}</td><td>${p.widthMm}×${p.heightMm}</td><td>Originalkontur widerspricht Excel – gemäß Nutzer ausgelassen</td></tr>`).join('');
 fs.writeFileSync(root+'/GALERIE.html',`<!doctype html><meta charset="utf-8">${galleryStyle}<h1>Hunde und Katzen · 30 Designs je bestätigter Form-/Größenreihe</h1><p>Vorrang ohne Bohrlöcher. 14 Reihen, davon Knochen nur Hunde; gemeinsame Designs werden einmal als Master geführt. 485 unterschiedliche geometrische Master, 1360 Größenableitungen. Feste Kordelprodukte erhalten keine zusätzlichen Varianten.</p><nav>${contacts.map(c=>`<a href="#${c.theme}-${c.group}" onclick="document.getElementById('${c.theme}-${c.group}').open=true">${c.theme} ${c.group}</a>`).join('')}</nav><p><a href="groessen-und-produkte.png">39 Produkte im Größenüberblick</a></p><h2>Zurückgestellt: Maßwidersprüche</h2><table><tr><th>Excel</th><th>Produkt</th><th>Excel mm</th><th>Stand</th></tr>${excluded}</table><p>Bei vier weiterhin festen Kordelprodukten sind Lieferanten-Lochmaße offen; keine erfundenen Bohrkonturen. Neue Formen sind Lieferform 2, keine Live-/Konfi-Freigabe.</p>${sections}`);
 fs.writeFileSync(root+'/kontaktboegen/index.json',JSON.stringify(contacts,null,2));
 console.log('Fertig:',contacts.length,'Kontaktbögen und Galerie.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
