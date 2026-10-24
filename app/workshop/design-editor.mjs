// Paket L: a catalogue master uses the existing editor model without a product import.
// Only editable objects cross this boundary; geometry, resources and authority stay server-owned.
import {katalogFor,forgetKatalog} from './design-dashboard.mjs';
import {familyProductConfig,FAMILY_MATERIALS} from './product-families.mjs';
import {katalogDesignToTemplate,parseDesignSvg,assignSeries,sourceContourSizes,scaleTemplate,scaleEmbeddedMotifs,templateFit} from './katalog-convert.mjs';
import {makeProductDocument} from './product-model.mjs';
import {productPreview,previewHoleHint} from './product-preview.mjs';
import {convertFont} from './font-library.mjs';
import {readDesignEditSource,planTemplateWriteback,saveTemplateWriteback} from './katalog-writeback.mjs';
import {measureText} from '../platform/sources/app/shared/models/doorbell-preview.mjs';
import {validateDesignContent} from '../platform/sources/app/shared/models/design-content.mjs';

const fail=(status,message,code='design_editor_invalid')=>{throw Object.assign(Error(message),{status,code});};
const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const material=v=>String(v??'').toLocaleLowerCase('de').replace(/glas$/,'').trim();
const sameMm=(a,b)=>a.every((n,i)=>Math.abs(n-b[i])<.001);
const rights=o=>({content:o.type==='text',color:false,replace:false,move:o.role!=='guide',scale:o.role!=='guide',delete:o.role!=='guide'});

function context(katalog,master){
 const candidates=[...katalog.families.values()].filter(f=>!master.json.material||material(FAMILY_MATERIALS[f.material.kind]?.name)===material(master.json.material)).map(f=>({family:f,assigned:assignSeries(f,[master])[0],contour:sourceContourSizes(f,master)}));
 const explicit=candidates.filter(c=>c.family.sizes.some(s=>s.key===master.json.masterSheet?.familySize||master.json.sizes?.includes(s.key))||c.contour.length);
 let selected=explicit.length?explicit:candidates.filter(c=>!c.assigned.oldSize),familySource={type:'design-size'};
 if(selected.length>1){
  // Match the same explicit line/theme relationship used by catalogue import.
  // Identical material and dimensions do not authorize choosing different drilling.
  const lines=[...katalog.lines.values()].filter(line=>line.subcategories.some(sub=>master.themes?.includes(sub.themeId)||sub.startDesign===master.id||sub.mainProducts?.some(product=>product.startDesign===master.id)));
  const familyIds=new Set(lines.flatMap(line=>line.families));
  selected=selected.filter(candidate=>familyIds.has(candidate.family.id));
  if(selected.length===1)familySource={type:'line',lineIds:lines.filter(line=>line.families.includes(selected[0].family.id)).map(line=>line.id)};
 }
 if(selected.length!==1)fail(422,selected.length?'Die Familie ist nicht eindeutig. Bitte die Größen-Zuordnung im Katalog prüfen.':'Keine passende Familie für dieses Design gefunden.');
 const result=selected[0],sizes=result.family.sizes.filter(s=>result.assigned.sizes.includes(s.key));
 const size=sizes.find(s=>s.key===master.json.masterSheet?.familySize)||sizes.find(s=>sameMm([s.widthMm,s.heightMm],master.plateMm))||sizes[0];
 if(!size)fail(422,'Das Design hat keine bekannte Größe.');
 const group=result.family.groups.find(g=>g.key===size.groupKey);
 if(!['rect','ellipse','contour'].includes(group.shape))fail(422,'Diese Form ist noch nicht im bestehenden Editor angeschlossen.');
 return {...result,size,group,sizes,familySource};
}
function renderFamily(family,size,plateMm){
 // Catalogue editing has no quotation. Neutral internal cents satisfy the existing
 // renderer contract only; this temporary view is neither sold nor persisted.
 const view=structuredClone(family),s=structuredClone(size);
 view.groups=view.groups.filter(g=>g.key===s.groupKey);view.options=[];delete view.quantityTiers;delete view.backing;
 view.mountingRules=view.mountingRules.filter(r=>s.mounting.includes(r.id));
 for(const r of view.mountingRules)r.priceCents=0;
 s.baseCents=0;delete s.quantityTiers;
 if(view.photo)view.photo.extraPriceCents=0;
 if(view.groups[0].shape!=='contour'){s.widthMm=plateMm[0];s.heightMm=plateMm[1];}
 view.sizes=[s];return {family:view,size:s};
}
async function resources(katalog,names,options){
 const unique=[...new Set(names)];
 for(const name of unique)if(!katalog.fonts.list.has(name))fail(422,'Schrift fehlt im Katalog: '+name+'.','design_editor_font_missing');
 const result=await katalog.fontResources(unique,options);
 if(result.missing.length)fail(422,'Schriftdatei fehlt: '+result.missing.join(', ')+'.','design_editor_font_missing');
 return result.fonts;
}
function sourceFonts(master){return [...new Set(parseDesignSvg(master.svgText).layers.filter(l=>l.kind==='text'||l.text).map(l=>l.font))];}
function compose(ctx,converted,fonts,template){
 const {family,size}=renderFamily(ctx.family,ctx.size,ctx.master.plateMm),config=familyProductConfig(family,size,1);
 // Build the native shell while its neutral starter is known to fit. The editor
 // deliberately retains overflowing content for an explicit fit warning and save.
 const document=makeProductDocument(config,{name:ctx.master.name||ctx.master.id,kind:'master'});
 const scale=template.katalog.scale??1;
 document.config.localResources.fonts=fonts;
 document.config.localResources.motifs=scaleEmbeddedMotifs(converted.motifs,scale);
 document.config.profile.designs=[template];document.config.profile.defaultDesignId=template.id;
 document.config.profile.name=document.name;
 document.config.photo.enabled=template.objects.some(o=>o.type==='photoSlot');
 document.elementRights={[template.id]:Object.fromEntries(template.objects.map(o=>[o.id,rights(o)]))};
 // Always show the first real drilling choice, when present, as a protected area.
 const mounting=document.config.profile.optionGroups.find(g=>g.id==='mounting');
 const drilled=mounting?.values.find(v=>v.holes?.length);if(drilled)mounting.defaultValueId=drilled.id;
 return document;
}
function editorTemplate(converted,ctx,fonts){
 const target=ctx.group.shape==='contour'?[ctx.size.widthMm,ctx.size.heightMm]:ctx.master.plateMm;
 return scaleTemplate(converted.template,ctx.master.plateMm,target,fonts,{contain:ctx.group.shape==='contour'});
}
function fitAll(ctx,template,fonts,motifs){
 const rows=ctx.sizes.map(size=>{
  try{const contain=ctx.family.groups.find(g=>g.key===size.groupKey).shape==='contour',scaled=scaleTemplate(template,ctx.master.plateMm,[size.widthMm,size.heightMm],fonts,{contain});return {size:size.key,key:size.key,label:size.label,...templateFit(scaled,ctx.family,size,fonts,{motifs:()=>scaleEmbeddedMotifs(motifs,scaled.katalog.scale)})};}
  catch(error){return {size:size.key,key:size.key,label:size.label,status:'passt nicht',issues:[error.message]};}
 });
 for(const key of ctx.master.json.sizes||[])if(!ctx.family.sizes.some(s=>s.key===key))rows.push({size:key,key,label:key,status:'passt nicht',issues:['Größe ist in der Familie nicht vorhanden.']});
 return {sizes:rows};
}
function candidateTemplate(document,original){
 if(!record(document)||!record(document.config)||!record(document.config.profile)||!Array.isArray(document.config.profile.designs)||document.config.profile.designs.length!==1)fail(422,'Genau ein Katalogdesign bearbeiten.');
 const input=document.config.profile.designs[0];if(input.id!==original.id||!Array.isArray(input.objects)||!input.objects.length||input.objects.length>20)fail(422,'Ungültiger Designstand.');
 const source=new Map(original.objects.map(o=>[o.id,o])),seen=new Set();
 const objects=input.objects.map(raw=>{
  if(!record(raw)||typeof raw.id!=='string'||seen.has(raw.id))fail(422,'Elementkennung fehlt oder ist doppelt.');seen.add(raw.id);
  const old=source.get(raw.id);
  if(old&&raw.type!==old.type)fail(422,'Der Elementtyp darf nicht gewechselt werden.');
  if(old?.role==='guide'||old?.type==='photoSlot'){if(!equal(raw,old))fail(422,'Hilfslinien und Fotofelder bleiben unverändert.');return structuredClone(old);}
  if(!old&&raw.type!=='text')fail(422,'Nur neue Texte können hinzugefügt werden.');
  const o=old?structuredClone(old):{id:raw.id,type:'text',fieldKey:raw.id,text:'',font:'',size:6,x:0,y:0,w:1,h:1,rotation:0,color:'#000000',bold:false,templateOrigin:true,customerEditable:true};
  const fields=o.type==='text'?['text','font','size','x','y','letterSpacing','textAnchor']:['x','y','w','h'];
  for(const key of fields)if(Object.hasOwn(raw,key))o[key]=raw[key];
  if(o.type==='text'&&Number.isFinite(old?.lineHeight)&&o.size!==old.size)o.lineHeight=old.lineHeight*o.size/old.size;
  if(o.type==='motif'){
   if(raw.motif!==old.motif)fail(422,'Vorhandene Motivpfade dürfen nicht ersetzt werden.');
   if(!Number.isFinite(o.w)||!Number.isFinite(o.h)||o.w<=0||o.h<=0||Math.abs(o.w/old.w-o.h/old.h)>Math.max(.001,Math.abs(o.w/old.w)*.001))fail(422,'Motive müssen seitenverhältnistreu skaliert werden.');
  }
  if(!Number.isFinite(o.x)||!Number.isFinite(o.y)||Math.abs(o.x)>10000||Math.abs(o.y)>10000||o.w>10000||o.h>10000)fail(422,'Elementmaße sind ungültig.');
  if(o.textAnchor!==undefined&&!['start','middle','end'].includes(o.textAnchor))fail(422,'Textausrichtung ist ungültig.');
  return o;
 });
 for(const old of original.objects)if((old.role==='guide'||old.type==='photoSlot')&&!seen.has(old.id))fail(422,'Hilfslinien und Fotofelder dürfen nicht entfernt werden.');
 return {...structuredClone(original),objects};
}

export function createDesignEditor({available={},converter=convertFont}={}){
 const fontOptions={available,converter};
 async function load(root,{reihe,id,checksum},extraFonts=[]){
  const loaded=await readDesignEditSource(root,{reihe,designId:id});
  if(checksum!==undefined&&checksum!==loaded.checksum)fail(409,'Das Design wurde inzwischen geändert. Bitte neu laden und die Änderungen vergleichen.','design_editor_conflict');
  const master=loaded.master,katalog=katalogFor(root,{maxAgeMs:0}),ctx={...context(katalog,master),master,katalog,checksum:loaded.checksum,reihe};
  const fonts=await resources(katalog,[...sourceFonts(master),...extraFonts],fontOptions),converted=katalogDesignToTemplate({...master,svg:()=>master.svgText},ctx.family,katalog.theme(master.themes?.[0]),{fonts,svgText:master.svgText});
  const original=editorTemplate(converted,ctx,fonts);return {...ctx,fonts,converted,original};
 }
 function presentation(ctx){
  const document=compose(ctx,ctx.converted,ctx.fonts,ctx.original),editorMm=[document.config.profile.geometry.width,document.config.profile.geometry.height];
  return {document,checksum:ctx.checksum,revision:1,fonts:[...ctx.katalog.fonts.list.values()].map(f=>({id:f.name,name:f.name,available:!!(f.file||available[f.name])})),fit:fitAll(ctx,ctx.converted.template,ctx.fonts,ctx.converted.motifs),source:{reihe:ctx.reihe,id:ctx.master.id,plateMm:ctx.master.plateMm,editorMm,familyId:ctx.family.id,familySource:ctx.familySource,sizeKey:ctx.size.key,shape:ctx.group.shape,priceOpen:ctx.size.baseCents===null,note:[!sameMm(editorMm,ctx.master.plateMm)?'Bearbeitung auf der gezeichneten Kontur '+editorMm.join(' × ')+' mm. Beim Speichern wird in den Master '+ctx.master.plateMm.join(' × ')+' mm zurückgerechnet.':null,ctx.familySource.type==='line'?'Familie und Bohrungen gemäß Kataloglinie '+ctx.familySource.lineIds.join(', ')+'.':null].filter(Boolean).join(' ')||null}};
 }
 async function prepare(root,data){
  if(!record(data)||Object.keys(data).some(k=>!['reihe','id','checksum','document'].includes(k)))fail(422,'Nur Design, Prüfsumme und Editorstand übergeben.');
  if(typeof data.checksum!=='string')fail(422,'Die Prüfsumme des geöffneten Designs fehlt.');
  const ctx=await load(root,data),template=candidateTemplate(data.document,ctx.original);
  ctx.fonts=await resources(ctx.katalog,[...sourceFonts(ctx.master),...template.objects.filter(o=>o.type==='text').map(o=>o.font)],fontOptions);
  for(const o of template.objects)if(o.type==='text'){try{measureText(o,ctx.fonts);}catch(e){fail(422,e.message);}}
  try{validateDesignContent(template,{universal:true,extraFontIds:Object.keys(ctx.fonts)});}catch(e){fail(422,e.message);}
  const plan=planTemplateWriteback({master:ctx.master,template,originalTemplate:ctx.original,fonts:ctx.fonts});
  const revised={...ctx.master,json:plan.json,svgText:plan.svgText,svg:()=>plan.svgText};
  const converted=katalogDesignToTemplate(revised,ctx.family,ctx.katalog.theme(revised.themes?.[0]),{fonts:ctx.fonts,svgText:plan.svgText});
  return {ctx,template,plan,fit:fitAll(ctx,converted.template,ctx.fonts,converted.motifs),document:compose(ctx,ctx.converted,ctx.fonts,template)};
 }
 return {
  async open(root,query){return presentation(await load(root,query));},
  async font(root,query){const ctx=await load(root,query,[query.font]);return {id:query.font,font:ctx.fonts[query.font]};},
  async fit(root,data){return (await prepare(root,data)).fit;},
  async preview(root,data){const {document}=await prepare(root,data),config=document.config;return {svg:productPreview({universal:config},{keepout:true}),holeHint:previewHoleHint(config),designId:config.profile.defaultDesignId};},
  async save(root,data,{actor}={}){const {ctx,template,fit}=await prepare(root,data);const result=await saveTemplateWriteback(root,{reihe:data.reihe,designId:data.id,checksum:data.checksum,template,originalTemplate:ctx.original,fonts:ctx.fonts,actor});forgetKatalog();return {...presentation(await load(root,{reihe:data.reihe,id:data.id})),changed:result.changed,freigabeReset:result.changed,fit};}
 };
}
