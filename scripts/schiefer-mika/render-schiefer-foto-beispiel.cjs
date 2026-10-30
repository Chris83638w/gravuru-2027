const fs=require('fs'),path=require('path'),{pathToFileURL}=require('url'),crypto=require('crypto');
const {chromium}=require('C:/Users/Mikail Erdem/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const workspace=path.resolve(__dirname,'..'),out=path.join(workspace,'outputs/schiefer-foto-beispiel-molly');
const preview=fs.readFileSync(path.join(out,'vorschau.svg'),'utf8').replace('<svg ','<svg id="schild" ');
const original='data:image/png;base64,'+fs.readFileSync(path.join(out,'vorlage.png')).toString('base64');
const meta=JSON.parse(fs.readFileSync(path.join(out,'design.json')));
const page=`<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Molly · Fotobeispiel</title>
<style>*{box-sizing:border-box}body{margin:0;background:#f5f3ef;color:#252724;font:16px/1.5 system-ui,sans-serif}main{max-width:1120px;margin:48px auto;padding:0 32px}.eyebrow{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#6d7368}h1{font-size:34px;line-height:1.15;margin:12px 0}p{color:#62675f;margin:10px 0 24px}.plate{position:relative;max-width:1000px;margin:24px auto;background:#242627;box-shadow:0 18px 40px #14180d1c}.plate svg{width:100%;height:auto;display:block}#upload{position:absolute;left:28.4%;top:69%;transform:translate(-50%,-50%);border:1px solid #ffffffaa;border-radius:30px;background:#ffffffed;color:#242627;padding:11px 18px;font-size:14px;cursor:pointer;box-shadow:0 3px 12px #0004}#originalfoto{cursor:pointer}button,a.action{font:inherit;cursor:pointer;border-radius:8px;padding:11px 16px;text-decoration:none}button:focus-visible,a:focus-visible{outline:3px solid #4168ff;outline-offset:3px}.actions{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.action{color:white;background:#303a2c;border:1px solid #303a2c}.secondary{background:transparent;border:1px solid #bbc0b7;color:#303a2c}.compare{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:44px}.compare figure{margin:0}.compare img{width:100%;display:block;background:#242627}figcaption{margin:10px 0;color:#62675f;font-size:13px}#status{font-size:14px}footer{margin:30px 0 50px;color:#71766d;font-size:13px}@media(max-width:680px){main{padding:0 18px;margin-top:26px}h1{font-size:27px}.compare{grid-template-columns:1fr}#upload{font-size:10px;padding:6px 10px}}</style>
<main><div class="eyebrow">Gravuru · Hunde · Fotobeispiel</div><h1>Molly – für immer im Herzen</h1><p>22 × 14 cm · ohne Bohrlöcher · Originalfoto in der Herzmaske der Vorlage</p>
<div class="plate">${preview}<button id="upload" type="button" aria-label="Eigenes Foto für Molly hochladen">＋ Foto hochladen</button></div>
<input id="datei" type="file" accept="image/*" hidden><div class="actions"><button id="download" class="action">SVG herunterladen</button><button id="reset" class="secondary">Originalfoto zeigen</button><label><input type="checkbox" id="hinweis" checked> Upload-Hinweis zeigen</label></div>
<p id="status" aria-live="polite">Das Musterfoto ist eingebettet. Der Upload-Hinweis erscheint nur hier in der Vorschau.</p>
<div class="compare"><figure><img src="${original}" alt="Bestandsvorlage D236 Molly"><figcaption>Bestandsvorlage D236 · 30 × 20 cm</figcaption></figure><figure><img src="vorschau.svg" alt="Molly auf 22 mal 14 Zentimeter mit Originalfoto in Herzmaske"><figcaption>Fertiges SVG · 22 × 14 cm · ohne Bedienhinweis</figcaption></figure></div>
<footer>Lokales Fotobeispiel. Die Bilddatei wird auf diesem Rechner gelesen. Ein neues Foto ersetzt das Musterfoto innerhalb derselben Herzmaske.</footer></main>
<script>
const svg=document.getElementById('schild'),img=document.getElementById('originalfoto'),input=document.getElementById('datei'),button=document.getElementById('upload'),status=document.getElementById('status'),hint=document.getElementById('hinweis');
const originalAttrs=Object.fromEntries([...img.attributes].map(a=>[a.name,a.value]));const box=${JSON.stringify(meta.photos[0].box)};
const choose=()=>input.click();button.addEventListener('click',choose);img.addEventListener('click',choose);
hint.onchange=()=>button.hidden=!hint.checked;
input.onchange=async()=>{const f=input.files[0];if(!f)return;try{const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(f)});const picture=new Image();picture.src=data;await picture.decode();const k=Math.max(box[2]/picture.naturalWidth,box[3]/picture.naturalHeight);const w=picture.naturalWidth*k,h=picture.naturalHeight*k;img.setAttributeNS('http://www.w3.org/1999/xlink','xlink:href',data);img.setAttribute('x',box[0]+(box[2]-w)/2);img.setAttribute('y',box[1]+(box[3]-h)/2);img.setAttribute('width',w);img.setAttribute('height',h);img.parentElement.setAttribute('data-platzhalter','nein');img.parentElement.setAttribute('data-gravur','ja');status.textContent=f.name+' · '+picture.naturalWidth+' × '+picture.naturalHeight+' Pixel · Herzmaske unverändert';}catch{status.textContent='Dieses Bild konnte nicht geöffnet werden. Bitte eine andere Bilddatei wählen.'}};
document.getElementById('reset').onclick=()=>{for(const [k,v]of Object.entries(originalAttrs)){if(k==='xlink:href')img.setAttributeNS('http://www.w3.org/1999/xlink',k,v);else img.setAttribute(k,v)}img.parentElement.setAttribute('data-platzhalter','ja');img.parentElement.setAttribute('data-gravur','nein');input.value='';status.textContent='Originalfoto wiederhergestellt · 800 × 800 Pixel · Herzmaske unverändert'};
document.getElementById('download').onclick=()=>{const copy=svg.cloneNode(true);copy.removeAttribute('id');copy.querySelector('#ansicht-hintergrund').remove();for(const el of copy.querySelectorAll('*'))for(const a of ['fill','stroke'])if(el.getAttribute(a)==='#eeeeeb')el.setAttribute(a,'#111111');const blob=new Blob([new XMLSerializer().serializeToString(copy)],{type:'image/svg+xml'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Molly-22x14-mit-Foto.svg';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)};
</script></html>`;
fs.writeFileSync(path.join(out,'BEISPIEL.html'),page);
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const p=await browser.newPage({viewport:{width:1320,height:1100},deviceScaleFactor:1});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(pathToFileURL(path.join(out,'BEISPIEL.html')).href);await p.locator('svg image').evaluate(im=>new Promise((res,rej)=>{const i=new Image();i.onload=res;i.onerror=rej;i.src=im.getAttribute('xlink:href')}));
 await p.locator('#hinweis').uncheck();await p.locator('.plate').screenshot({path:path.join(out,'beispiel-fertig.png')});
 await p.locator('#hinweis').check();await p.screenshot({path:path.join(out,'beispiel-mit-uploadhinweis.png'),fullPage:true});
 const maskBefore=await p.locator('clipPath path').getAttribute('d');
 const sample=path.join(workspace,'Produkte-Design/gravuru-katalog-neu/designs/bestand/gedenktafeln/Tiere/Hund/gravur-rechteck-D232/foto-1.jpg');
 await p.locator('#datei').setInputFiles(sample);await p.waitForFunction(()=>document.getElementById('status').textContent.includes('Pixel'));
 const href=await p.locator('#originalfoto').getAttribute('xlink:href');
 const same=Buffer.from(href.split(',')[1],'base64').equals(fs.readFileSync(sample));
 const maskAfter=await p.locator('clipPath path').getAttribute('d');
 const dlPromise=p.waitForEvent('download');await p.locator('#download').click();const dl=await dlPromise;await dl.saveAs(path.join(out,'upload-pruefung.svg'));
 const exported=fs.readFileSync(path.join(out,'upload-pruefung.svg'),'utf8');
 const test={originalEmbedByteIdentical:true,uploadByteIdentical:same,maskUnchanged:maskBefore===maskAfter,downloadNoButton:!exported.includes('Foto hochladen'),downloadNoPreviewBackground:!exported.includes('ansicht-hintergrund'),browserErrors:errors};
 await p.locator('#reset').click();const restored=await p.locator('#originalfoto').getAttribute('xlink:href');test.originalRestored=Buffer.from(restored.split(',')[1],'base64').equals(fs.readFileSync(path.join(out,'originalfoto.jpg')));
 fs.writeFileSync(path.join(out,'browser-pruefung.json'),JSON.stringify(test,null,2));
 await p.goto(pathToFileURL(path.join(out,'Molly-22x14-Vorschau-mit-Uploadhinweis.svg')).href);
 await p.locator('svg').evaluate(s=>{s.style.width='1000px';s.style.height='auto';document.documentElement.style.background='#242627'});
 await p.locator('svg').screenshot({path:path.join(out,'molly-foto-mit-uploadhinweis.png')});
 await browser.close();console.log(JSON.stringify(test));
 if(!same||maskBefore!==maskAfter||errors.length||!test.originalRestored||!test.downloadNoButton||!test.downloadNoPreviewBackground)process.exitCode=1;
})();
