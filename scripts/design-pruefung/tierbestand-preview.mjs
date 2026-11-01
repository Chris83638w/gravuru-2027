// Real workshop HTTP endpoint; private catalogue, in-memory workshop, no imports.
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import {pathToFileURL} from 'node:url';import {execFileSync} from 'node:child_process';import assert from 'node:assert/strict';
const arg=n=>process.argv.find(s=>s.startsWith('--'+n+'='))?.slice(n.length+3);
const catalog=path.resolve(arg('katalog')),designs=path.resolve(arg('designs')),out=path.resolve(arg('out')),code=path.resolve(arg('runtime-code'));
const root=path.join(out,'pruefkatalog');fs.mkdirSync(root,{recursive:true});
for(const p of ['familien','linien'])fs.cpSync(path.join(catalog,p),path.join(root,p),{recursive:true});
if(!fs.existsSync(path.join(root,'schriften')))fs.symlinkSync(path.join(catalog,'schriften'),path.join(root,'schriften'),'junction');
fs.copyFileSync(path.join(catalog,'themen.json'),path.join(root,'themen.json'));
fs.cpSync(designs,path.join(root,'designs'),{recursive:true});
// Read current committed/in-review catalogue families, never older PR snapshots.
const {familyProductConfig}=await import(pathToFileURL(path.join(code,'app/workshop/product-families.mjs')));
const {createWorkshop}=await import(pathToFileURL(path.join(code,'app/workshop/http.mjs')));
const family=JSON.parse(fs.readFileSync(path.join(root,'familien/edelstahl/steel-door-signs.json'),'utf8'));
const seed=familyProductConfig(family,family.sizes.find(s=>s.key==='GR-ES-RE-80X53P3-T15'),1,{previewOnly:true});
const workshop=createWorkshop({filename:':memory:',seedConfig:seed,katalogDir:root});
const server=http.createServer((req,res)=>workshop.handle(req,res,new URL(req.url,'http://127.0.0.1')));
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const mapping=JSON.parse(fs.readFileSync(path.join(designs,'zuordnung.json'),'utf8')).sources.filter(r=>r.series),rows=[],textures=[];
const pack=svg=>{const packed=svg.replace(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/g,data=>{let i=textures.indexOf(data);if(i<0){i=textures.length;textures.push(data);}return '__TEXTURE_'+i+'__';});assert.equal(packed.replace(/__TEXTURE_(\d+)__/g,(_,i)=>textures[i]),svg);return packed;};
try{
 for(const r of mapping){
  const row={...r,original:'data:image/png;base64,'+fs.readFileSync(path.join(designs,r.series,r.previewId||r.targetId,'original.png')).toString('base64'),targets:[]};
  const d=JSON.parse(fs.readFileSync(path.join(designs,r.series,r.previewId||r.targetId,'design.json'),'utf8'));
  for(const target of d.ziele){
   const query=new URLSearchParams({reihe:r.series,id:r.previewId||r.targetId,familie:target.familie,mounting:'K00'});
   const response=await fetch('http://127.0.0.1:'+server.address().port+'/api/workshop/designs/target-preview?'+query);
   const body=await response.json();let svg=body.svg,previewKind='material';
   if(!svg&&target.familie==='schiefer-knochen-23x10'&&body.reviewFit?.issues.every(s=>s==='Vorschau offen: Materialstärke')){
    // Source glyph endpoint proves the composition without inventing a physical
    // thickness or pretending this is the blocked material target preview.
    const q=new URLSearchParams({reihe:r.series,id:r.previewId||r.targetId});
    const source=await fetch('http://127.0.0.1:'+server.address().port+'/api/workshop/designs/svg?'+q);assert.equal(source.status,200);
    svg=(await source.text()).replace(/(<svg\b[^>]*>)/,'$1<path d="'+d.plate.outline+'" fill="#f6f5ef" stroke="#888" stroke-width="0.2"/>');previewKind='contour-only';
   }
   row.targets.push({family:target.familie,http:response.status,fit:body.reviewFit,error:body.error,previewKind,svg:svg?pack(svg):null});
   console.log(r.previewId||r.targetId,target.familie,response.status,body.reviewFit?.status||JSON.stringify(body.error));
  }
  rows.push(row);
 }
}finally{await new Promise(r=>server.close(r));workshop.close();}
const evidence={runtimeCommit:execFileSync('git',['-C',code,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),runtimeDiffSha256:(await import('node:crypto')).createHash('sha256').update(execFileSync('git',['-C',code,'diff','--','app/workshop'])).digest('hex'),catalogCommit:execFileSync('git',['-C',catalog,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),endpoint:'/api/workshop/designs/target-preview',mounting:'K00',rows};
fs.writeFileSync(path.join(out,'ergebnis.json'),JSON.stringify({...evidence,rows:rows.map(r=>({...r,original:undefined,targets:r.targets.map(t=>({...t,svg:undefined}))}))},null,2)+'\n');
fs.writeFileSync(path.join(out,'native-proofs.json'),JSON.stringify({textures,...evidence}));
const data=JSON.stringify({textures,rows}).replace(/</g,'\\u003c');
fs.writeFileSync(path.join(out,'kontaktbogen.html'),`<!doctype html><html lang="de"><meta charset="utf-8"><title>Tierbestand · Issue 85</title><style>body{font:15px system-ui;margin:24px;background:#f4f3ef;color:#252820}h1,h2{font-weight:500}h2{font-size:16px}article{background:white;border:1px solid #ccc;padding:12px;margin-bottom:14px;break-inside:avoid}.pair{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}img{width:100%;height:210px;object-fit:contain}small,details{font-size:11px}nav{display:flex;flex-wrap:wrap;gap:12px;margin:20px 0}.pair>div{min-width:0;overflow-wrap:anywhere}button{padding:8px 16px}@media(max-width:700px){.pair{grid-template-columns:repeat(2,1fr)!important}img{height:150px}}@media print{nav{display:none}}</style><h1>Tierbestand · bearbeitbare Entwürfe</h1><p>Bestand und aktuelle Ziele: Foto nur Acryl, TSK auf Schiefer. Echte Zielvorschau ohne Befestigung, Freigaben offen.</p><p>Katalogschriften gemäß deiner Entscheidung. Fotopreis bleibt offen.</p><nav></nav><main></main><script id="proof" type="application/json">${data}</script><script>
const {textures,rows}=JSON.parse(document.getElementById('proof').textContent);let urls=[];const el=(t,s)=>{const e=document.createElement(t);if(s)e.textContent=s;return e;};function show(page){urls.forEach(URL.revokeObjectURL);urls=[];document.querySelector('main').replaceChildren();for(const r of rows.slice(page*4,page*4+4)){const a=el('article'),p=el('div');p.className='pair';p.style.gridTemplateColumns='repeat('+Math.min(4,r.targets.length+1)+',1fr)';a.append(el('h2',r.study?r.stockId+' · Formstudie, Kennung offen':r.targetId));const values=[{family:r.mode==='neu'?'Motivquelle · neues Design':'Bestandsvorlage',src:r.original},...r.targets];for(const t of values){const cell=el('div');cell.append(el('small',({'schiefer-knochen-23x10':'Schiefer · Knochen 23 × 10,5 cm','steel-door-signs':'Edelstahl','acryl-3mm-tuerschilder-schwarz':'Acryl schwarz · 3 mm','acryl-3mm-tuerschilder-anthrazit':'Acryl anthrazit · 3 mm'})[t.family]||t.family));if(t.src||t.svg){const im=el('img');if(t.src)im.src=t.src;else{im.src=URL.createObjectURL(new Blob([t.svg.replace(/__TEXTURE_(\\d+)__/g,(_,i)=>textures[i])],{type:'image/svg+xml'}));urls.push(im.src);}cell.append(im);}cell.append(el('p',t.previewKind==='contour-only'?'Konturprüfung · Materialstärke offen':t.fit?.status||t.error?.message||''));p.append(cell);}a.append(p);const det=el('details');det.append(el('summary','Prüfhinweise'),el('p',r.targets.flatMap(t=>t.fit?.issues||[]).join(' | ')));a.append(det);document.querySelector('main').append(a);}location.hash='seite-'+(page+1);}for(let i=0;i<Math.ceil(rows.length/4);i++){const b=el('button','Seite '+(i+1));b.onclick=()=>show(i);document.querySelector('nav').append(b);}show(Math.max(0,Math.min(Math.ceil(rows.length/4)-1,Number(location.hash.replace('#seite-',''))-1||0)));
</script></html>`);
