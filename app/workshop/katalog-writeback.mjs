// Rückweg Werkstatt → Katalog (Chris 23.10.2026): gespeicherte Händlerkorrekturen (design-corrections,
// Werkstatt-DB) als Lieferform-2-Änderung in `design.json` des passenden Katalogdesigns – Textinhalt,
// Schrift, Größe und Lage in mm des Masters. Zuordnung nur über Katalogherkunft des Konfi-Produkts
// (`katalog.designId` der Vorlage bzw. Vorlagen-ID `katalog-<Design>`); alles andere bleibt „offen“.
// Dry-run ist Standard; `apply` schreibt design.json (und mit svg:true die Textebenen in design.svg).
import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {katalogFor,forgetKatalog} from './design-dashboard.mjs';

const MM_PER_PT=25.4/72,BASELINE=0.35,LINE_HEIGHT=1.2;// Werkstattkonvention: Grundlinie = Mitte + 0,35 · Größe, Zeilenabstand 1,2 · Größe
const round=v=>Math.round(v*100)/100;
const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const writeAtomic=(file,text)=>{const tmp=file+'.'+process.pid+'.'+Date.now()+'.tmp';fs.writeFileSync(tmp,text);fs.renameSync(tmp,file);};

// Letzte Korrektur je Produkt/Revision/Design samt Produktdokument (nur lesen).
export function readCorrections(dbFile,{tenantId='gravuru'}={}){
 if(!fs.existsSync(dbFile))throw Error('Werkstatt-Datenbank nicht gefunden: '+dbFile);
 const db=new DatabaseSync(dbFile,{readOnly:true});
 try{
  const tables=new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r=>r.name));
  if(!tables.has('design_corrections'))return [];
  const rows=db.prepare('SELECT c.product_id,c.product_revision,c.design_id,c.revision,c.state,c.actor,c.updated_at FROM design_corrections c WHERE c.tenant_id=? AND c.revision=(SELECT MAX(revision) FROM design_corrections x WHERE x.tenant_id=c.tenant_id AND x.product_id=c.product_id AND x.product_revision=c.product_revision AND x.design_id=c.design_id) ORDER BY c.product_id,c.product_revision,c.design_id').all(tenantId);
  const hasTenant=tables.has('product_revisions')&&db.prepare('PRAGMA table_info(product_revisions)').all().some(c=>c.name==='tenant_id');
  const doc=tables.has('product_revisions')?db.prepare('SELECT document FROM product_revisions WHERE product_id=? AND revision=?'+(hasTenant?' AND tenant_id=?':'')):null;
  return rows.map(r=>{let document=null;if(doc){const d=doc.get(...(hasTenant?[r.product_id,r.product_revision,tenantId]:[r.product_id,r.product_revision]));if(d)try{document=JSON.parse(d.document);}catch{}}
   let state=null;try{state=JSON.parse(r.state);}catch{}
   return {productId:r.product_id,productRevision:r.product_revision,designId:r.design_id,revision:r.revision,state,actor:r.actor,updatedAt:r.updated_at,document};});
 }finally{db.close();}
}

// Katalogherkunft eines Produktdesigns: {designId, plateMm (Produktmaß), fields} oder null.
function katalogOrigin(document,designId){
 if(!record(document))return null;
 if(document.schema==='gravuru-form-product/v1'){
  const design=(document.designs||[]).find(d=>d.id===designId);if(!design)return null;
  const origin=design.katalog?.designId??(designId.startsWith('katalog-')?designId.slice('katalog-'.length):null);
  if(!origin)return null;
  const g=document.form?.geometry;return {designId:origin,plateMm:g&&Number.isFinite(g.widthMm)&&Number.isFinite(g.heightMm)?[g.widthMm,g.heightMm]:null,fields:Array.isArray(design.fields)?design.fields:[]};
 }
 const design=(document.config?.profile?.designs||[]).find(d=>d.id===designId);
 if(!design?.katalog?.designId)return null;
 const g=document.config.profile.geometry;return {designId:design.katalog.designId,plateMm:g&&Number.isFinite(g.width)&&Number.isFinite(g.height)?[g.width,g.height]:null,fields:[]};
}

export function planCorrectionWriteback(root,corrections){
 const katalog=katalogFor(root),items=[];
 for(const c of corrections){
  const item={productId:c.productId,productRevision:c.productRevision,designId:c.designId,correctionRevision:c.revision,actor:c.actor,updatedAt:c.updatedAt,status:'offen',reason:null,katalog:null,changes:[],open:[]};
  items.push(item);
  if(!c.document){item.reason='Produktstand nicht in der Datenbank.';continue;}
  const origin=katalogOrigin(c.document,c.designId);
  if(!origin){item.reason='Kein Katalogprodukt (keine Herkunft katalog.designId / Vorlage „katalog-…“).';continue;}
  const master=katalog.designs.masters.find(d=>d.id===origin.designId);
  if(!master){item.reason='Katalogdesign „'+origin.designId+'“ hat keine Lieferform 2 im Katalog.';continue;}
  item.katalog={designId:master.id,reihe:master.seriesFolder,dir:path.relative(katalog.root,master.dir).split(path.sep).join('/'),plateMm:master.plateMm};
  if(!origin.plateMm){item.reason='Produktmaß unbekannt – Umrechnung in Master-mm nicht möglich.';continue;}
  const scale=master.plateMm[0]/origin.plateMm[0],ratio=Math.abs((origin.plateMm[1]*scale)/master.plateMm[1]-1);
  if(ratio>0.01){item.reason='Produktmaß '+origin.plateMm.join(' × ')+' mm liegt nicht in der Formatreihe des Masters ('+master.plateMm.join(' × ')+' mm).';continue;}
  item.scale=round(scale);
  const texts=Array.isArray(master.json?.texts)?master.json.texts:[];
  if(!record(c.state)||!Array.isArray(c.state.fields)){item.reason='Korrekturstand unlesbar.';continue;}
  for(const value of c.state.fields){
   const source=origin.fields.find(f=>f.id===value.id);
   if(!source){item.open.push(value.id+': Feld im Produktdesign unbekannt.');continue;}
   if(source.type!=='text'){item.open.push(value.id+': '+source.type+'-Feld – Lage/Austausch nur manuell im Katalog.');continue;}
   if(value.deleted){item.open.push(value.id+': gelöscht – Ebene im Katalog manuell entfernen.');continue;}
   // Textebene des Masters: `text-<n>` → texts[n-1], sonst gleicher Ausgangstext, sonst offen.
   const m=value.id.match(/^text-(\d+)$/);let index=m?Number(m[1])-1:-1;
   if(!(index>=0&&index<texts.length)){const same=texts.map((t,i)=>t.text===source.text?i:-1).filter(i=>i>=0);index=same.length===1?same[0]:-1;}
   if(index<0){item.open.push(value.id+': keine eindeutige Textebene im Master.');continue;}
   const t=texts[index],sizeMm=Number(value.sizeMm)*scale,cx=(Number(value.xMm)+Number(value.widthMm)/2)*scale,cy=(Number(value.yMm)+Number(value.heightMm)/2)*scale;
   if(![sizeMm,cx,cy].every(Number.isFinite)){item.open.push(value.id+': Maße unvollständig.');continue;}
   const next={text:String(value.text??t.text),font:String(value.font??t.font),sizePt:round(sizeMm/MM_PER_PT),anchorMm:[round(cx),round(cy+BASELINE*sizeMm)]};
   const diff=[];
   if(next.text!==t.text)diff.push({field:'text',from:t.text,to:next.text});
   if(next.font!==t.font)diff.push({field:'font',from:t.font,to:next.font});
   if(Math.abs(next.sizePt-Number(t.sizePt))>0.05)diff.push({field:'sizePt',from:t.sizePt,to:next.sizePt});
   if(!Array.isArray(t.anchorMm)||Math.abs(next.anchorMm[0]-t.anchorMm[0])>0.05||Math.abs(next.anchorMm[1]-t.anchorMm[1])>0.05)diff.push({field:'anchorMm',from:t.anchorMm??null,to:next.anchorMm});
   if(diff.length)item.changes.push({layer:'text-'+(index+1),index,diff,next});
  }
  item.status=item.changes.length?'bereit':(item.open.length?'offen':'unverändert');
  if(item.status==='offen')item.reason='Nur Änderungen, die nicht automatisch übertragbar sind.';
 }
 return {root:katalog.root,items,counts:{bereit:items.filter(i=>i.status==='bereit').length,offen:items.filter(i=>i.status==='offen').length,unveraendert:items.filter(i=>i.status==='unverändert').length}};
}

// Textebenen in design.svg anpassen (<text id="text-n">): Lage, Schrift, Größe (mm), Zeilen als tspan.
export function updateSvgText(svg,layer,next){
 const re=new RegExp('<text\\b([^>]*\\bid="'+layer+'"[^>]*)>([\\s\\S]*?)</text>');
 const m=svg.match(re);if(!m)return null;
 const sizeMm=round(next.sizePt*MM_PER_PT),[x,y]=next.anchorMm;
 let attrs=m[1];
 const set=(name,value)=>{attrs=new RegExp('\\s'+name+'="').test(attrs)?attrs.replace(new RegExp('(\\s'+name+'=")[^"]*(")'),'$1'+value+'$2'):attrs+' '+name+'="'+value+'"';};
 set('x',x.toFixed(2));set('y',y.toFixed(2));set('font-family',esc(next.font));set('font-size',sizeMm.toFixed(2));
 const lines=String(next.text).split('\n'),spans=lines.map((line,i)=>'<tspan x="'+x.toFixed(2)+'" dy="'+(i?(LINE_HEIGHT*sizeMm).toFixed(2):'0.00')+'">'+esc(line)+'</tspan>').join('');
 return svg.replace(re,'<text'+attrs+'>'+spans+'</text>');
}

export function applyCorrectionWriteback(plan,{svg=false,actor='katalog-writeback',now=new Date()}={}){
 const written=[];
 for(const item of plan.items){
  if(item.status!=='bereit')continue;
  const dir=path.join(plan.root,item.katalog.dir),jsonFile=path.join(dir,'design.json'),svgFile=path.join(dir,'design.svg');
  const json=JSON.parse(fs.readFileSync(jsonFile,'utf8'));
  for(const ch of item.changes){const t=json.texts[ch.index];for(const d of ch.diff)t[d.field]=d.to;t.korrektur={productId:item.productId,productRevision:item.productRevision,designId:item.designId,correctionRevision:item.correctionRevision,at:now.toISOString()};}
  json.korrekturen=[...(Array.isArray(json.korrekturen)?json.korrekturen:[]),{productId:item.productId,productRevision:item.productRevision,designId:item.designId,correctionRevision:item.correctionRevision,actor:item.actor,at:now.toISOString(),layers:item.changes.map(c=>c.layer)}];
  writeAtomic(jsonFile,JSON.stringify(json,null,1)+'\n');
  const files=[path.relative(plan.root,jsonFile)];
  if(svg){let text=fs.readFileSync(svgFile,'utf8'),changed=false;for(const ch of item.changes){const n=updateSvgText(text,ch.layer,ch.next);if(n===null)item.open.push(ch.layer+': Textebene im SVG nicht gefunden.');else if(n!==text){text=n;changed=true;}}if(changed){writeAtomic(svgFile,text);files.push(path.relative(plan.root,svgFile));}}
  const protocol=path.join(plan.root,'designs',item.katalog.reihe,'_aenderungen.jsonl');
  fs.appendFileSync(protocol,JSON.stringify({at:now.toISOString(),actor,reihe:item.katalog.reihe,designId:item.katalog.designId,source:'design-corrections',productId:item.productId,productRevision:item.productRevision,correctionRevision:item.correctionRevision,changes:item.changes.map(c=>({layer:c.layer,diff:c.diff})),files})+'\n');
  files.push(path.relative(plan.root,protocol));
  written.push({designId:item.katalog.designId,files:files.map(f=>f.split(path.sep).join('/'))});
 }
 forgetKatalog();
 return written;
}

export function formatPlan(plan){
 const lines=['Händlerkorrekturen → Katalog ('+plan.root+'): '+plan.items.length+' Korrekturen, bereit '+plan.counts.bereit+', offen '+plan.counts.offen+', unverändert '+plan.counts.unveraendert];
 for(const i of plan.items){
  lines.push('- '+i.productId+' r'+i.productRevision+' · '+i.designId+' · Korrektur '+i.correctionRevision+' ('+i.actor+', '+i.updatedAt+'): '+i.status+(i.reason?' – '+i.reason:'')+(i.katalog?' → '+i.katalog.dir:''));
  for(const c of i.changes)lines.push('    '+c.layer+': '+c.diff.map(d=>d.field+' '+JSON.stringify(d.from)+' → '+JSON.stringify(d.to)).join('; '));
  for(const o of i.open)lines.push('    offen: '+o);
 }
 return lines.join('\n');
}
