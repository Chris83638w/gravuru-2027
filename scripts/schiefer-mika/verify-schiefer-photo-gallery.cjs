const fs=require('fs'),path=require('path'),{pathToFileURL}=require('url');
const {chromium}=require('C:/Users/Mikail Erdem/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'../outputs/schiefer-foto-alle-groessen');
const contacts=JSON.parse(fs.readFileSync(path.join(root,'kontaktboegen-index.json'))),files=['GALERIE.html','groessen-ueberblick.html',...contacts.map(c=>c.html),'konfi-pruefung/kontaktbogen.html'];
const missing=[];let checked=0;
for(const f of files){const s=fs.readFileSync(path.join(root,f),'utf8');for(const m of s.matchAll(/(?:src|href)="([^"#][^"]*)"/g)){if(/^(https?:|data:)/.test(m[1]))continue;checked++;if(!fs.existsSync(path.resolve(root,path.dirname(f),m[1])))missing.push({file:f,target:m[1]});}}
if(missing.length)throw Error(JSON.stringify(missing));
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});try{
 const p=await browser.newPage({viewport:{width:1400,height:1050}});await p.goto(pathToFileURL(path.join(root,'GALERIE.html')).href);
 await p.locator('nav a').first().click();const open=await p.locator('details[open]').count();if(!open)throw Error('Galerie-Reihe öffnet nicht');
 const html='<!doctype html><meta charset="utf-8"><style>body{font:20px Segoe UI;background:#eee;padding:25px}main{display:grid;grid-template-columns:1fr 1fr;gap:25px}img{width:100%;height:420px;object-fit:contain;background:white}article{background:white;padding:15px}h1{font-size:27px}</style><h1>Diagnose · eigenständiges SVG und unveränderter Konfi-Import</h1><p>Molly 22×14 cm · dieselbe Designquelle. Rechts: freie Maske und eingebettetes Originalfoto werden nicht übernommen.</p><main><article><h2>Geliefertes SVG</h2><img src="../master/rechteck-3-2/H-rechteck-D236/vorschau.svg"></article><article><h2>Aktueller nativer Import</h2><img src="MF-RECHTECK-3-2-H-rechteck-D236.svg"></article></main><p>Konfi-Fotoanbindung offen. Die gelieferten Kontaktbögen zeigen die linke SVG-Darstellung.</p>';
 fs.writeFileSync(path.join(root,'konfi-pruefung/vergleich.html'),html);await p.goto(pathToFileURL(path.join(root,'konfi-pruefung/vergleich.html')).href);await p.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));await p.screenshot({path:path.join(root,'konfi-pruefung/vergleich.png'),fullPage:true});
 const report={htmlFiles:files.length,localReferences:checked,missing:[],galleryNavigation:'passed',nativeMaskComparison:'konfi-pruefung/vergleich.png'};fs.writeFileSync(path.join(root,'galerie-pruefung.json'),JSON.stringify(report,null,2));console.log(report);
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
