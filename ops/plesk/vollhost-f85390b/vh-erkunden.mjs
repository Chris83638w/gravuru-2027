// Nur lesen: Namen, Größen und Prüfsummen der Ordner, die der Zwei-Store-Host benutzt (für den isolierten Sitzungstest).
// Keine Inhalte, keine Konfigurationswerte, keine Geheimnisse.
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
const P=path.resolve(import.meta.dirname,'..');
const sha=f=>{try{return crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');}catch{return null;}};
const liste=d=>{try{return fs.readdirSync(d,{withFileTypes:true}).map(e=>{const s=fs.lstatSync(path.join(d,e.name));return [e.name,e.isDirectory()?'ordner':e.isSymbolicLink()?'link':'datei',e.isFile()?s.size:null,(s.mode&0o777).toString(8)];});}catch(e){return String(e.code||e.message);}};
function summe(d){let n=0,b=0,links=0;const walk=x=>{for(const e of fs.readdirSync(x,{withFileTypes:true})){const p=path.join(x,e.name);if(e.isSymbolicLink()){links++;continue;}if(e.isDirectory())walk(p);else if(e.isFile()){n++;b+=fs.statSync(p).size;}}};try{walk(d);}catch(e){return String(e.code||e.message);}return {dateien:n,bytes:b,links};}
const leg=path.join(P,'gravuru-combined-id-20261022-v1/legacy'),pv=path.join(P,'mika-public-original-previews-20261109-v1'),kat=path.join(P,'issue139-katalog-20261102');
const gitKopf=d=>{try{const h=fs.readFileSync(path.join(d,'.git/HEAD'),'utf8').trim();if(!h.startsWith('ref:'))return h;const r=h.slice(5).trim();try{return fs.readFileSync(path.join(d,'.git',r),'utf8').trim();}catch{return r;}}catch{return null;}};
const frei=(()=>{try{const s=fs.statfsSync(P);return Math.round(s.bavail*s.bsize/1048576);}catch{return null;}})();
console.log(JSON.stringify({event:'vh_erkunden',freiMiB:frei,
 acrylDaten:liste(path.join(P,'acryl-employee-20261021-v1/data')),acrylOberordner:liste(path.join(P,'acryl-employee-20261021-v1')),
 legacyRelease:{oben:liste(leg),elternOrdner:liste(path.dirname(leg)),summe:summe(leg),opsPlesk:Object.fromEntries(['merchant-config.mjs','merchant-runtime.mjs','lock.mjs','config.mjs','shopify-preflight.mjs','ai-design-config.mjs'].map(f=>[f,sha(path.join(leg,'ops/plesk',f))])),
  app:Object.fromEntries(['app/workshop/http.mjs','app/workshop/shopify-admin-test-server.mjs','app/workshop/shopify-runtime-config.mjs','app/workshop/merchant-test-cart.mjs','package.json'].map(f=>[f,sha(path.join(leg,f))])),lokalDaten:summe(path.join(leg,'.local-data')),vorschauBau:summe(path.join(leg,'app/configurator/variant-m/.preview'))},
 vorschauOrdner:{modus:(()=>{try{return (fs.statSync(pv).mode&0o777).toString(8);}catch{return null;}})(),oben:(()=>{const l=liste(pv);return Array.isArray(l)?{anzahl:l.length,erste:l.slice(0,6)}:l;})(),summe:summe(pv)},
 katalog:{kopf:gitKopf(kat),oben:(()=>{const l=liste(kat);return Array.isArray(l)?l.map(x=>x[0]).slice(0,20):l;})()},
 python:fs.existsSync(path.join(P,'gravuru-2027-test-python311/bin/python')),
 legacyDatenModus:(()=>{try{return (fs.statSync(path.join(P,'gravuru-2027-merchant-data')).mode&0o777).toString(8);}catch{return null;}})(),
 konfigOrdnerModus:(fs.statSync(P).mode&0o777).toString(8)}));
