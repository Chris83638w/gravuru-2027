// K11 Mobile-first: Sichtprüfung des Kundeneditors mit headless Chromium (Playwright).
// Lokaler Prüfstand, keine Live-Systeme. Aufruf:
//   node app/configurator/variant-m/server.mjs --port=8971   (separates Terminal)
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scripts/check-mobile-steps.mjs http://127.0.0.1:8971 deliverables/konfi-neu-K11
// Prüft: Schrittwechsel, Texteingabe mit sichtbarer Platte, Warenkorb nur im Schritt „Prüfen“,
// Desktop unverändert (Reiter sichtbar). Screenshots je Schritt und Desktop.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const base=(process.argv[2]||'http://127.0.0.1:8971').replace(/\/$/,'');
const out=path.resolve(process.argv[3]||'deliverables/konfi-neu-K11');
fs.mkdirSync(out,{recursive:true});
const playwright=(()=>{for(const candidate of ['playwright','/opt/npm-tools/node_modules/playwright/index.js']){try{return require(candidate);}catch{}}throw Error('Playwright nicht gefunden.');})();
const executablePath=['/opt/pw-browsers/chromium'].find(p=>fs.existsSync(p));
const report={base,viewports:{},checks:[]};
const check=(name,ok,detail='')=>{report.checks.push({name,ok:!!ok,detail});if(!ok)console.error('FEHLER',name,detail);assert.ok(ok,name+(detail?' – '+detail:''));};

async function openEditor(browser,viewport,mobile){
  const page=await browser.newPage({viewport,isMobile:mobile,hasTouch:mobile,deviceScaleFactor:mobile?2:1,locale:'de-DE'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/?model=acryl');
  const frame=await (await page.waitForSelector('#editor iframe')).contentFrame();
  await frame.waitForFunction(()=>{const r=document.querySelector('gravuru-configurator')?.shadowRoot;return !!r?.querySelector('.ux-mobile-bar')&&!!r.querySelector('.scene [data-object]');},null,{timeout:45000});
  await page.waitForTimeout(1200);
  const q=(fn,arg)=>frame.evaluate(({src,arg,rectSrc})=>{const r=document.querySelector('gravuru-configurator').shadowRoot;const el=r.host;return (new Function('r','el','arg','const rect='+rectSrc+';return ('+src+')(r,el,arg)'))(r,el,arg);},{src:fn.toString(),arg,rectSrc:rect.toString()});
  return {page,frame,q,errors};
}
const rect=(r,sel)=>{const n=r.querySelector(sel);if(!n)return null;const b=n.getBoundingClientRect();return {x:b.x,y:b.y,w:b.width,h:b.height,visible:!!(b.width&&b.height)&&!n.hidden};};
const shot=(page,name)=>page.screenshot({path:path.join(out,name),fullPage:false});

const browser=await playwright.chromium.launch({executablePath});
try{
  // ---- Mobile 390×844 ----
  const m=await openEditor(browser,{width:390,height:844},true);
  check('Mobile: Zustand aktiv (data-ux-mobile)',await m.q((r,el)=>el.dataset.uxMobile==='true'));
  const steps=await m.q(r=>[...r.querySelectorAll('[data-ux=mobile-step]')].map(b=>({id:b.dataset.step,label:b.textContent.trim(),current:b.getAttribute('aria-current')==='step'})));
  report.viewports.mobile={steps};
  check('Mobile: Schrittleiste beginnt mit Optionen und endet mit Prüfen',steps[0]?.id==='options'&&steps.at(-1)?.id==='review',JSON.stringify(steps));
  check('Mobile: erster Schritt aktiv',steps[0]?.current);
  check('Mobile: Desktop-Reiter ausgeblendet',!(await m.q(r=>rect(r,'.ux-tabs')))?.visible);
  check('Mobile: Warenkorbleiste des Desktops ausgeblendet',!(await m.q(r=>rect(r,'.fk-buy-dock')))?.visible);
  const sizes=await m.q(r=>[...r.querySelectorAll('.ux-mobile-bar button')].filter(b=>!b.hidden&&b.offsetParent!==null&&!b.closest('[hidden]')).map(b=>{const c=b.getBoundingClientRect();return {t:b.textContent.trim().slice(0,20),h:Math.round(c.height),w:Math.round(c.width)};}));
  check('Mobile: Touch-Ziele der Leiste ≥ 44 px hoch',sizes.every(s=>s.h>=44),JSON.stringify(sizes));
  let cart=await m.q(r=>{const b=r.querySelector('.fk-buy-button');return b?{hidden:b.hidden,visible:!!b.offsetParent}:null;});
  check('Mobile: Warenkorb-Knopf im ersten Schritt nicht sichtbar',cart&&!cart.visible,JSON.stringify(cart));
  const previewBox=await m.q(r=>rect(r,'.ux-preview'));
  check('Mobile: Platte oben, ca. 40 % Höhe',previewBox.y<80&&previewBox.h>=0.33*844&&previewBox.h<=0.45*844,JSON.stringify(previewBox));
  await shot(m.page,'mobile-01-optionen.png');
  // Weiter → Text (Design fehlt im Pilot mit nur einem Design)
  await m.frame.evaluate(()=>document.querySelector('gravuru-configurator').shadowRoot.querySelector('[data-ux=mobile-next]').click());
  await m.page.waitForTimeout(300);
  const afterNext=await m.q((r,el)=>el.uxMobileSteps.current);
  check('Mobile: „Weiter“ wechselt zum nächsten Schritt',afterNext===(steps[1]?.id),afterNext);
  if(afterNext!=='text')await m.frame.evaluate(()=>document.querySelector('gravuru-configurator').shadowRoot.querySelector('[data-ux=mobile-step][data-step=text]').click());
  await m.page.waitForTimeout(300);
  check('Mobile: Schritt Text zeigt nur das Textpanel',await m.q(r=>!r.querySelector('#ux-panel-text').hidden&&r.querySelector('#ux-panel-options').hidden&&r.querySelector('#ux-panel-upload').hidden));
  // Texteingabe mit sichtbarer Vorschau
  const fieldInfo=await m.q(r=>{const f=r.querySelector('[data-ux-text]');f.focus();const b=f.getBoundingClientRect();return {id:f.dataset.uxText,y:b.y,bottom:b.bottom};});
  await m.page.waitForTimeout(400);
  await m.frame.evaluate(()=>{const r=document.querySelector('gravuru-configurator').shadowRoot;const f=r.querySelector('[data-ux-text]');f.value='Mia & Jonas';f.dispatchEvent(new Event('input',{bubbles:true}));});
  await m.page.waitForTimeout(400);
  const typed=await m.q((r,el,id)=>{const o=el.state.objects.find(o=>o.id===id);const scene=r.querySelector('.scene');const plate=rect(r,'.ux-preview'),field=r.querySelector('[data-ux-text]').getBoundingClientRect();return {text:o?.text,preview:plate,field:{y:field.y,bottom:field.bottom},keyboard:el.dataset.uxKeyboard,scrollable:r.querySelector('.ux-editor').scrollHeight,inScene:!!scene.querySelector('[data-object="'+CSS.escape(id)+'"]')};},fieldInfo.id);
  check('Mobile: Eingabe erreicht die Platte',typed.text==='Mia & Jonas'&&typed.inScene,JSON.stringify(typed));
  check('Mobile: Platte bleibt bei Texteingabe sichtbar (≥ 25 %)',typed.preview.y>=0&&typed.preview.h>=0.25*844-1&&typed.preview.y+typed.preview.h<=844,JSON.stringify(typed.preview));
  check('Mobile: Textfeld unterhalb der Platte sichtbar',typed.field.y>=typed.preview.y+typed.preview.h&&typed.field.bottom<=844,JSON.stringify(typed.field));
  await shot(m.page,'mobile-02-text.png');
  // Tastatur-Simulation über visualViewport-Ersatz: 844 → 500 px sichtbar
  const kb=await m.q((r,el)=>{el.uxMobileSteps.applyViewport({height:500,top:0,keyboardOpen:true});const shell=rect(r,'.ux-shell'),preview=rect(r,'.ux-preview');el.uxMobileSteps.applyViewport(null);return {shell,preview};});
  check('Mobile: Bei Tastatur (500 px) bleibt die Platte ≥ 25 % sichtbar',kb.shell.h===500&&kb.preview.h>=125&&kb.preview.y+kb.preview.h<=500,JSON.stringify(kb));
  await m.frame.evaluate(()=>document.querySelector('gravuru-configurator').shadowRoot.activeElement?.blur());
  // Foto/Motiv
  await m.frame.evaluate(()=>document.querySelector('gravuru-configurator').shadowRoot.querySelector('[data-ux=mobile-step][data-step=media]').click());
  await m.page.waitForTimeout(400);
  check('Mobile: Schritt Foto/Motiv zeigt Foto- und Motivpanel',await m.q(r=>!r.querySelector('#ux-panel-upload').hidden&&!r.querySelector('#ux-panel-motif').hidden&&r.querySelector('#ux-panel-text').hidden));
  cart=await m.q(r=>{const b=r.querySelector('.fk-buy-button');return {visible:!!b.offsetParent};});
  check('Mobile: Warenkorb-Knopf in Foto/Motiv nicht sichtbar',!cart.visible);
  await shot(m.page,'mobile-03-foto-motiv.png');
  // Prüfen
  await m.frame.evaluate(()=>document.querySelector('gravuru-configurator').shadowRoot.querySelector('[data-ux=mobile-step][data-step=review]').click());
  await m.page.waitForTimeout(400);
  const review=await m.q(r=>{const b=r.querySelector('.fk-buy-button');const rows=[...r.querySelectorAll('[data-ux-mobile-summary] div')].map(d=>[d.querySelector('dt').textContent,d.querySelector('dd').textContent]);return {cartVisible:!!b.offsetParent,cartInBar:!!b.closest('.ux-mobile-bar'),cartText:b.textContent.trim(),rows,nextHidden:r.querySelector('[data-ux=mobile-next]').hidden,panel:!r.querySelector('#ux-panel-review').hidden};});
  report.viewports.mobile.review=review;
  check('Mobile: Warenkorb-Knopf nur im Schritt Prüfen sichtbar (Daumenzone)',review.cartVisible&&review.cartInBar&&review.nextHidden,JSON.stringify(review));
  const labels=review.rows.map(([k])=>k);
  check('Mobile: Zusammenfassung mit Größe, Material, Optionen, Preis',['Größe','Material','Optionen','Preis'].every(k=>labels.includes(k)),labels.join(', '));
  check('Mobile: Zusammenfassung enthält den eingegebenen Text',review.rows.some(([k,v])=>k==='Texte'&&v.includes('Mia & Jonas')));
  await shot(m.page,'mobile-04-pruefen.png');
  // Zurück
  await m.frame.evaluate(()=>document.querySelector('gravuru-configurator').shadowRoot.querySelector('[data-ux=mobile-prev]').click());
  await m.page.waitForTimeout(200);
  check('Mobile: „Zurück“ wechselt zum vorherigen Schritt',(await m.q((r,el)=>el.uxMobileSteps.current))==='media');
  check('Mobile: keine Skriptfehler',m.errors.length===0,m.errors.join(' | '));
  await m.page.close();

  // ---- Desktop 1280×800 ----
  const d=await openEditor(browser,{width:1280,height:800},false);
  check('Desktop: kein Mobile-Zustand',await d.q((r,el)=>el.dataset.uxMobile===undefined));
  check('Desktop: Reiter sichtbar',(await d.q(r=>rect(r,'.ux-tabs')))?.visible);
  check('Desktop: Schrittleiste nicht sichtbar',!(await d.q(r=>rect(r,'.ux-mobile-bar')))?.visible);
  check('Desktop: Warenkorbleiste des Desktops sichtbar',(await d.q(r=>rect(r,'.fk-buy-dock')))?.visible);
  check('Desktop: Prüfen-Panel ausgeblendet',await d.q(r=>r.querySelector('#ux-panel-review').hidden));
  check('Desktop: Warenkorb-Knopf an alter Stelle (nicht in der Schrittleiste)',await d.q(r=>!r.querySelector('.fk-buy-button').closest('.ux-mobile-bar')));
  check('Desktop: Reiterwechsel funktioniert weiter',await d.q(r=>{r.querySelector('[data-ux-tab=text]').click();return !r.querySelector('#ux-panel-text').hidden&&r.querySelector('#ux-panel-options').hidden;}));
  check('Desktop: keine Skriptfehler',d.errors.length===0,d.errors.join(' | '));
  await shot(d.page,'desktop-1280.png');
  await d.page.close();
  // Umschalten im laufenden Fenster: Desktop → Mobile → Desktop stellt den Reiterzustand wieder her
  const s=await openEditor(browser,{width:1280,height:800},false);
  await s.page.setViewportSize({width:390,height:844});await s.page.waitForTimeout(500);
  check('Umschalten: 390 px aktiviert den Mobile-Zustand',await s.q((r,el)=>el.dataset.uxMobile==='true'&&!!r.querySelector('.fk-buy-button').closest('.ux-mobile-bar')));
  await s.page.setViewportSize({width:1280,height:800});await s.page.waitForTimeout(500);
  check('Umschalten: zurück auf 1280 px stellt Desktop her',await s.q((r,el)=>el.dataset.uxMobile===undefined&&!r.querySelector('.fk-buy-button').closest('.ux-mobile-bar')&&r.querySelector('#ux-panel-review').hidden&&!r.querySelector('.ux-tabs').closest('[hidden]')));
  await s.page.close();
}finally{await browser.close();}
report.result=report.checks.every(c=>c.ok)?'PASS':'FAIL';
// Screenshots ≤ 300 KB: Palettenkodierung über sharp, wenn vorhanden (sonst Hinweis).
const sharp=(()=>{for(const candidate of ['sharp','/opt/npm-tools/node_modules/sharp']){try{return require(candidate);}catch{}}return null;})();
for(const file of fs.readdirSync(out).filter(f=>f.endsWith('.png'))){
  const target=path.join(out,file);
  if(sharp&&fs.statSync(target).size>300*1024){const bytes=await sharp(target).png({palette:true,quality:85,compressionLevel:9}).toBuffer();fs.writeFileSync(target,bytes);}
  const kb=Math.round(fs.statSync(target).size/1024);report[file]=kb+' KB';if(kb>300)console.warn('Screenshot über 300 KB:',file,kb);
}
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,1));
console.log(JSON.stringify({result:report.result,checks:report.checks.length,out},null,0));
