// Local synthetic comparison only. No external API or production database.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=path.resolve(process.argv[2]),port=Number(process.argv[3]);
const load=f=>import(pathToFileURL(path.join(root,f)).href);
const {build}=await load('app/configurator/variant-m/build.mjs');
const {createPreviewServer}=await load('app/configurator/variant-m/server.mjs');
const {createWorkshop}=await load('app/workshop/http.mjs');
const {workshopResources}=await load('app/workshop/catalog.mjs');
const directory=path.resolve('work/font-ui-'+port);fs.mkdirSync(directory,{recursive:true});build({outputDirectory:directory});
const seed=JSON.parse(fs.readFileSync(path.join(directory,'models.json')))[0];
const group=['Montserrat',...Object.keys(workshopResources().fonts).filter(n=>n!=='Montserrat').sort()].slice(0,29);
if(group.length!==29)throw Error('fixture requires 29 real library fonts');
const workshop=createWorkshop({filename:path.join(directory,'workshop.sqlite'),seedConfig:seed.universal,legacy:seed.legacy});
if(!workshop.profiles.list({type:'fonts'}).length)workshop.profiles.create({name:'Lokaler Test – 29 Schriften',type:'fonts',items:group});
seed.universal.workshopProfiles={selections:{fonts:group,motifs:null,colors:null,bestsellers:null},sources:{},settingsRevision:0};
const server=createPreviewServer({outputDirectory:directory,workshop}),original=server.listeners('request')[0];server.removeListener('request',original);
let phase=0,requests=[];
server.on('request',(req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1:'+port),send=(type,value)=>{res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});res.end(value);};
 if(url.pathname==='/')return send('text/html; charset=utf-8',`<!doctype html><html lang="de"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Lokale Schriftprüfung ${port}</title><style>html,body{margin:0;height:100%;font:14px system-ui;overflow:hidden}header{height:48px;display:flex;align-items:center;gap:16px;padding:0 16px;background:#eee}iframe{display:block;width:100%;height:calc(100% - 48px);border:0}</style><header><button id="reset">Messung zurücksetzen</button><span id="stats">Lokaler Vergleich · synthetisches 29er-Profil · keine Shopverbindung</span></header><script src="/fixture.js"></script><iframe title="Prio Konfigurator" src="/editor.html?module=einzeln"></iframe></html>`);
 if(url.pathname==='/fixture.js')return send('text/javascript',`window.UniversalConfig=${JSON.stringify(seed.universal)};window.GravuruModelProfile=${JSON.stringify(seed.legacy)};document.querySelector('#reset').onclick=async()=>{await fetch('/fixture-reset');document.querySelector('#stats').textContent='Messung bereit – jetzt Text hinzufügen';};window.addEventListener('message',async e=>{if(e.origin!==location.origin||e.data?.type!=='font-fixture-result')return;const stats=await(await fetch('/fixture-stats')).json();document.querySelector('#stats').textContent=JSON.stringify({...e.data,...stats});});`);
 if(url.pathname==='/fixture-reset'){phase++;requests=[];return send('application/json','{}');}
 if(url.pathname==='/fixture-stats')return send('application/json',JSON.stringify({phase,fontRequests:requests.length,fontResponseBytes:requests.reduce((sum,r)=>sum+r.bytes,0),requests}));
 if(url.pathname.includes('/schriften/')){
  const entry={url:url.pathname,bytes:0,start:performance.now()};requests.push(entry);
  const write=res.write.bind(res),end=res.end.bind(res);
  res.write=(chunk,...rest)=>{if(chunk)entry.bytes+=Buffer.byteLength(chunk);return write(chunk,...rest);};
  res.end=(chunk,...rest)=>{if(chunk)entry.bytes+=Buffer.byteLength(chunk);entry.ms=+(performance.now()-entry.start).toFixed(2);return end(chunk,...rest);};
 }
 return original(req,res);
});
const editor=path.join(directory,'editor.html'),html=fs.readFileSync(editor,'utf8');
fs.writeFileSync(editor,html.replace('</body>',`<script>
const fixtureTimer=setInterval(()=>{const el=document.querySelector('gravuru-configurator'),r=el?.shadowRoot;if(!r)return;clearInterval(fixtureTimer);r.addEventListener('click',e=>{if(!e.target.closest('[data-ux="add-text"]'))return;const start=performance.now(),before=r.querySelectorAll('[data-ux-text]').length;const observer=new MutationObserver(()=>{if(r.querySelectorAll('[data-ux-text]').length<=before)return;observer.disconnect();requestAnimationFrame(()=>parent.postMessage({type:'font-fixture-result',clickToTextMs:+(performance.now()-start).toFixed(2)},location.origin));});observer.observe(r,{childList:true,subtree:true});},true);},30);
</script></body>`));
server.listen(port,'127.0.0.1',()=>console.log(JSON.stringify({url:'http://127.0.0.1:'+port,backend:'http://127.0.0.1:'+port+'/werkstatt/profile/',fonts:group.length})));
