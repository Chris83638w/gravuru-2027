// Massenlauf „fester Shop-Produktschnitt“ (Issue 139, Chris 02.11.2026: „Material × Größe × Unterkategorie,
// alle Designs der Unterkategorie wählbar“). Ersetzt die Handarbeit je Produkt: EIN Lauf plant alle Produkte
// einer Linie, erzeugt je Produkt die native Konfi-Konfiguration (planFamilyFormats mit --shop-product), den
// Shopify-ProductSetInput (DRAFT, Vorlage „konfi“, Metafeld custom.gravuru_product_cut, Preis aus der Familie)
// und prüft alle Texte gegeneinander auf Duplicate Content. Nichts wird hochgeladen; siehe SHOP-SCHNITT.md.
//
// Aufruf:
//   node scripts/shop-schnitt-plan.mjs --katalog=<pfad> --linie=<id> --unterkategorie=<id> --output=<neuer ordner>
//     [--je=zielgruppe|anzahl] [--anzahl=2] [--form] [--ohne-formen=GS-INFINITY] [--groessen=K1,K2] [--texte=<texte.json>] [--nur-plan]
// --form: ein Produkt je Form × Zielgruppe, alle Größen derselben Form im Produkt wählbar (Option „Größe“).
//
// --je=zielgruppe (Standard, wenn die Designnamen „… · <Zielgruppe> · …“ tragen): je Größe × Zielgruppe ein
//   Produkt, Startdesign = kleinste Designnummer dieser Zielgruppe in der Größe. Chris 02.11.2026 (Grabstecker):
//   „Jede Zielgruppe soll ihren eigenen Grabstecker haben … und da sind dann die Designs auswählbar“ → das Produkt
//   bietet nur die Designs seiner Zielgruppe an (Metafeld-Feld „zielgruppe“, der Server plant daraus nach).
// --je=anzahl: je Größe --anzahl Produkte mit unterschiedlichen Zielgruppen/Motiven als Startdesign.
// --texte: Datei {"<handle>":{title,descriptionHtml,seoTitle,seoDescription,imageAlt,imageFile,tags[]}}.
//   Ohne Datei werden Entwurfstexte aus scripts/shop-inhalte/<linie>.mjs gebaut (Pflicht: Prüfung durch Claude).
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {openKatalog} from '../app/workshop/katalog-source.mjs';
import {convertFont} from '../app/workshop/font-library.mjs';
import {planFamilyFormats} from '../app/workshop/katalog-family-formats.mjs';
import {shopProductCutMetafield} from '../app/workshop/shop-product-cut.mjs';
import {assignTargetSeries,approvedForFamily} from '../app/workshop/design-targets.mjs';

const fail=m=>{throw Error(m);};
export function parseArgs(argv){
 const a=Object.fromEntries(argv.map(s=>{const i=s.indexOf('=');return i<0?[s,true]:[s.slice(0,i),s.slice(i+1)];}));
 const allowed=['--katalog','--linie','--unterkategorie','--output','--je','--anzahl','--groessen','--texte','--nur-plan','--form','--ohne-formen','--limit','--offset'];
 const bad=Object.keys(a).filter(k=>!allowed.includes(k));if(bad.length)fail('Unbekannt: '+bad.join(', '));
 for(const k of ['--katalog','--linie','--unterkategorie','--output'])if(typeof a[k]!=='string')fail('Pflicht: '+k);
 const limit=Number(a['--limit']??100),offset=Number(a['--offset']??0),anzahl=Number(a['--anzahl']??2),je=a['--je']||'zielgruppe';
 if(!['zielgruppe','anzahl'].includes(je)||!Number.isInteger(anzahl)||anzahl<1||anzahl>100||!Number.isInteger(limit)||limit<1||limit>100||!Number.isInteger(offset)||offset<0)fail('Ungültige Seriengrenzen: je zielgruppe/anzahl, anzahl/limit 1–100, offset ab 0.');
 return {katalog:a['--katalog'],line:a['--linie'],sub:a['--unterkategorie'],output:path.resolve(a['--output']),je,anzahl,limit,offset,groessen:a['--groessen']?String(a['--groessen']).split(','):null,texte:a['--texte']||null,nurPlan:a['--nur-plan']===true,form:a['--form']===true,ohneFormen:a['--ohne-formen']?String(a['--ohne-formen']).split(','):[]};
}

const designNo=id=>Number(/-D(\d+)$/.exec(id)?.[1]??1e9);
export const zielgruppe=d=>{const p=String(d.name||'').split(' · ');return p.length>2?p[1].trim():null;};
export const slug=s=>String(s).toLowerCase().replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

// Alle freigegebenen, textführenden Designs der Familie je Größe (Master-Regel: kein Schild ohne Text).
export function approvedBySize(root,familyId,themeId,{katalog=null}={}){
 const out=new Map(),base=path.join(root,'designs');
 if(katalog){
  const family=katalog.families.get(familyId),masters=katalog.designs.masters.filter(d=>!d.hidden&&d.json?.texts?.length&&d.themes?.includes(themeId)&&approvedForFamily(d,familyId,katalog));
  for(const a of assignTargetSeries(family,masters,katalog).filter(a=>!a.oldSize))for(const key of a.sizes){if(!out.has(key))out.set(key,[]);out.get(key).push({...a.design.json,id:a.design.id,name:a.design.name});}
  for(const list of out.values())list.sort((x,y)=>designNo(x.id)-designNo(y.id)||x.id.localeCompare(y.id));
  return out;
 }
 for(const dir of fs.readdirSync(base)){
  if(dir.startsWith('_')||dir==='bestand')continue;
  const full=path.join(base,dir);if(!fs.statSync(full).isDirectory())continue;
  for(const id of fs.readdirSync(full)){
   const f=path.join(full,id,'design.json');if(!fs.existsSync(f))continue;
   const d=JSON.parse(fs.readFileSync(f,'utf8'));
   if(d.hidden||!d.texts?.length||!(d.themes||[]).includes(themeId))continue;
   if(!(d.ziele||[]).some(z=>z.familie===familyId&&z.freigabe?.status==='freigegeben'))continue;
   for(const s of d.sizes||[]){if(!out.has(s))out.set(s,[]);out.get(s).push(d);}
  }
 }
 for(const l of out.values())l.sort((x,y)=>designNo(x.id)-designNo(y.id)||x.id.localeCompare(y.id));
 return out;
}

// Startdesigns je Größe: je Zielgruppe eines, oder --anzahl mit möglichst verschiedenen Zielgruppen.
export function pickStarts(designs,{je='zielgruppe',anzahl=2}={}){
 const groups=new Map();
 for(const d of designs){const g=zielgruppe(d)||'allgemein';if(!groups.has(g))groups.set(g,d);}
 if(je==='zielgruppe')return [...groups.entries()].map(([g,d])=>({group:g,design:d}));
 if(je!=='anzahl')fail('--je ist zielgruppe oder anzahl.');
 const distinct=[...groups.values(),...designs].filter((d,i,list)=>list.findIndex(x=>x.id===d.id)===i);
 return distinct.slice(0,anzahl).map(design=>({group:zielgruppe(design)||'allgemein',design}));
}

// Duplicate-Content-Prüfung: gemeinsame Fünfwortfolgen zwischen je zwei Beschreibungen (Chris: kein Duplicate Content).
export const plain=h=>String(h).replace(/<[^>]+>/g,' ').replace(/&[a-z]+;/g,' ').toLowerCase().replace(/[^a-zäöüß0-9]+/g,' ').trim();
export function shingles(text,n=5){const w=plain(text).split(' ').filter(Boolean),s=new Set();for(let i=0;i+n<=w.length;i++)s.add(w.slice(i,i+n).join(' '));return s;}
export function duplicateReport(items,{maxShared=0}={}){
 const sh=items.map(i=>({handle:i.handle,s:shingles(i.descriptionHtml)})),pairs=[];
 for(let a=0;a<sh.length;a++)for(let b=a+1;b<sh.length;b++){let n=0;for(const x of sh[a].s)if(sh[b].s.has(x))n++;if(n>maxShared)pairs.push({a:sh[a].handle,b:sh[b].handle,shared:n});}
 const titles=new Map();for(const i of items){for(const k of ['title','seoTitle','seoDescription']){const key=k+':'+i[k];titles.set(key,(titles.get(key)||[]).concat(i.handle));}}
 return {pairs:pairs.sort((x,y)=>y.shared-x.shared),sameFields:[...titles.entries()].filter(([,v])=>v.length>1).map(([k,v])=>({field:k,handles:v}))};
}

export function productSetInput(entry,texts,planReport){
 if(planReport.shopify.variants.length!==planReport.shopify.plannedVariants)fail(entry.handle+': Variantenzahl passt nicht.');
 const v=planReport.shopify.variants.filter(v=>v.designAvailable!==false);
 if(!v.length)fail(entry.handle+': keine bestellbare Variante mit freigegebenem Design.');
 // Optionen mit nur einem Wert (z. B. Grabstecker „Befestigung: Ohne Bohrung“) erscheinen nicht im Shop.
 const keep=planReport.shopify.options.map((n,i)=>new Set(v.map(x=>x.optionValues[i])).size>1||planReport.shopify.options.length===1);
 if(!keep.some(Boolean))keep[0]=true;
 const optName=planReport.shopify.options.filter((n,i)=>keep[i]);
 const vals=x=>x.optionValues.filter((n,i)=>keep[i]);
 return {
  title:texts.title,handle:entry.handle,status:'DRAFT',templateSuffix:'konfi',vendor:'gravuru',productType:entry.productType,
  descriptionHtml:texts.descriptionHtml,seo:{title:texts.seoTitle,description:texts.seoDescription},tags:texts.tags,
  productOptions:optName.map((name,i)=>({name,position:i+1,values:[...new Set(v.map(x=>vals(x)[i]))].map(n=>({name:n}))})),
  variants:v.map((x,i)=>({position:i+1,price:(x.priceCents/100).toFixed(2),sku:x.source.sizeKey+(entry.groupCode?'-'+entry.groupCode:'')+(x.source.mounting==='K00'?'':'-'+x.source.mounting),inventoryItem:{tracked:false},optionValues:vals(x).map((n,k)=>({optionName:optName[k],name:n}))})),
  metafields:[shopProductCutMetafield(entry.cut)]
 };
}

export async function run(argv,{stdout=process.stdout,katalog:providedKatalog=null}={}){
 const args=parseArgs(argv);
 if(fs.existsSync(args.output))fail('Ausgabeordner existiert bereits; kein Überschreiben.');
 const katalog=providedKatalog||openKatalog(args.katalog),line=katalog.lines.get(args.line),sub=line?.subcategories.find(s=>s.id===args.sub);
 if(!sub)fail('Linie oder Unterkategorie fehlt.');
 const inhalte=await import(new URL('./shop-inhalte/'+args.line+'.mjs',import.meta.url)).catch(()=>null);
 const extTexts=args.texte?JSON.parse(fs.readFileSync(args.texte,'utf8')):null;
 const entries=[],physicalUnits=new Set();
 for(const familyId of line.families){
  const family=katalog.families.get(familyId),bySize=approvedBySize(args.katalog,familyId,sub.themeId,{katalog});
  // --form: ein Produkt je Form (groupKey) × Zielgruppe, Größen derselben Form wählbar (Chris 02.11.2026, 21:39).
  const units=args.form?[...new Map(family.sizes.map(s=>[s.groupKey,family.sizes.filter(x=>x.groupKey===s.groupKey)])).values()]:family.sizes.map(s=>[s]);
  for(const sizes of units){
   if(args.groessen&&!sizes.some(s=>args.groessen.includes(s.key)))continue;
   if(args.ohneFormen.includes(sizes[0].groupKey)){entries.push({sizeKey:sizes[0].key,form:sizes[0].groupKey,state:'zurueckgestellt',reason:'--ohne-formen'});continue;}
   const unitKey=[family.material.kind,sizes[0].groupKey,...sizes.map(s=>s.widthMm+'x'+s.heightMm)].join(':');
   if(physicalUnits.has(unitKey))continue;physicalUnits.add(unitKey); // Schwarz/Anthrazit are variants of the same product.
   const pool=sizes.flatMap(s=>(bySize.get(s.key)||[]).map(d=>({d,s})));
   if(!pool.length){entries.push({sizeKey:sizes[0].key,state:'offen',reason:'kein freigegebenes Design mit Text'});continue;}
   const picks=pickStarts(pool.map(x=>x.d),{je:args.je,anzahl:args.anzahl});
   for(const picked of picks){
    const group=picked.group;
    // Startgröße: mittlere Größe der Form, in der die Zielgruppe Designs hat; Startdesign = kleinste Nummer dort.
    const withGroup=sizes.filter(s=>(bySize.get(s.key)||[]).some(d=>(zielgruppe(d)||'allgemein')===group));
    const size=withGroup[Math.floor((withGroup.length-1)/2)];
    const designs=bySize.get(size.key),design=args.form?designs.find(d=>(zielgruppe(d)||'allgemein')===group):picked.design;
    const designsInGroup=pool.filter(x=>(zielgruppe(x.d)||'allgemein')===group).length;
    const ctx={line,sub,family,size,sizes:withGroup,group,design,designsInSize:designs.length,designsInGroup,form:args.form};
    const draft=inhalte?.texts?.(ctx);
    const handle=draft?.handle||slug([line.name,args.form?size.groupKey.replace(/^GS-/,''):size.label.split('·')[0],group].join(' '));
    entries.push({state:'geplant',familyId,form:size.groupKey,sizeKey:size.key,sizes:withGroup.map(s=>s.key),label:size.label,group,handle,startDesign:design.id,startDesignName:design.name,
     designsInGroup:pool.filter(x=>(zielgruppe(x.d)||'allgemein')===group).length,priceCents:size.baseCents,priceRange:withGroup.map(s=>s.baseCents),
     cut:{sizeKey:size.key,themeId:sub.themeId,defaultDesignId:design.id,...(args.je==='zielgruppe'&&zielgruppe(design)?{zielgruppe:zielgruppe(design)}:{}),...(args.form?{groessenWahl:'form'}:{})},
     skuBase:design.id,groupCode:args.je==='zielgruppe'?slug(group).toUpperCase():null,productType:draft?.productType||line.name,texts:extTexts?.[handle]||draft||null,textSource:extTexts?.[handle]?'datei':draft?'entwurf':'fehlt'});
   }
  }
 }
 const planned=entries.filter(e=>e.state==='geplant');
 const handles=new Map();for(const e of planned)handles.set(e.handle,(handles.get(e.handle)||0)+1);
 const dupHandles=[...handles].filter(([,n])=>n>1).map(([h])=>h);
 if(dupHandles.length)fail('Doppelte Handles; keine Produktdateien geschrieben: '+dupHandles.join(', '));
 if(planned.some(e=>!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(e.handle)))fail('Ungültiger Produkthandle.');
 const withTexts=planned.filter(e=>e.texts).map(e=>({handle:e.handle,...e.texts}));
 const dup=duplicateReport(withTexts);
 fs.mkdirSync(args.output,{recursive:true});
 const selected=planned.slice(args.offset,args.offset+args.limit);
 for(const e of planned)if(!selected.includes(e))e.state='vorgemerkt';
 if(!args.nurPlan){
  for(const e of selected){
   try{
   const dir=path.join(args.output,e.handle);
   const res=await planFamilyFormats(katalog,args.line,args.sub,{converter:convertFont,shopProduct:e.cut});
   if(!res.config){e.state='blockiert';e.reason=res.report.blocked.map(b=>b.reason).join(' · ');continue;}
   fs.mkdirSync(dir);
   fs.writeFileSync(path.join(dir,'review-config.json'),JSON.stringify(res.config)+'\n');
   fs.writeFileSync(path.join(dir,'plan.json'),JSON.stringify(res.report,null,2)+'\n');
   e.configBytes=fs.statSync(path.join(dir,'review-config.json')).size;
   e.configRevision=res.config.profile.revision;
   if(e.texts){const input=productSetInput(e,e.texts,res.report),variants=res.report.shopify.variants.filter(v=>v.designAvailable!==false);fs.writeFileSync(path.join(dir,'product-set.json'),JSON.stringify({schema:'gravuru-shop-schnitt-product/v1',input,image:{file:e.texts.imageFile,alt:e.texts.imageAlt},collections:e.texts.collections||[],variantSources:input.variants.map((v,i)=>({sku:v.sku,priceCents:variants[i].priceCents,...variants[i].source})),configRevision:res.config.profile.revision,profileId:res.config.profile.id},null,2)+'\n');}
   }catch(error){e.state='blockiert';e.reason=error.message;}
  }
 }
 const summary={schema:'gravuru-shop-schnitt-plan/v1',createdAt:new Date().toISOString(),line:args.line,subcategory:args.sub,je:args.je,
  batch:{offset:args.offset,limit:args.limit,total:planned.length,nextOffset:args.offset+args.limit<planned.length?args.offset+args.limit:null},
  counts:{geplant:planned.filter(e=>e.state==='geplant').length,vorgemerkt:entries.filter(e=>e.state==='vorgemerkt').length,blockiert:entries.filter(e=>e.state==='blockiert').length,offen:entries.filter(e=>e.state==='offen').length,ohneTexte:selected.filter(e=>!e.texts).length},
  duplicateHandles:dupHandles,duplicateContent:dup,entries:entries.map(({texts,...e})=>({...e,title:texts?.title??null})),
  sourceSha256:createHash('sha256').update(JSON.stringify(entries.map(e=>[e.handle,e.startDesign,e.priceCents]))).digest('hex')};
 fs.writeFileSync(path.join(args.output,'summary.json'),JSON.stringify(summary,null,2)+'\n');
 stdout.write(JSON.stringify({output:args.output,...summary.counts,doppelteHandles:dupHandles.length,textPaareMitUeberschneidung:dup.pairs.length,gleicheFelder:dup.sameFields.length})+'\n');
 return summary;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)run(process.argv.slice(2)).catch(e=>{process.stderr.write(e.message+'\n');process.exitCode=1;});
