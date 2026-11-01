// Catalogue variants share the converter/inverse and never write products or import state.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {openKatalog,readDesignFolder} from './katalog-source.mjs';
import {convertFont} from './font-library.mjs';
import {katalogDesignToTemplate,parseDesignSvg,scaleTemplate,scaleEmbeddedMotifs,transformEmbeddedPath,pathBounds} from './katalog-convert.mjs';
import {editorTextToMaster,masterTextLayout} from './katalog-template-writeback.mjs';
import {familyTemplate,familyProductConfig,FAMILY_MATERIALS,familyProcess} from './product-families.mjs';
import {productPreview} from './product-preview.mjs';
import {prepareKatalogPhotoAssets} from './katalog-photo-assets.mjs';
import {designTargets,designTargetCompatibility} from './design-targets.mjs';
import {assessDesignTarget} from './design-target-rules.mjs';
import {safeKatalogPath,withKatalogWriteLock,writeKatalogTransaction,recoverKatalogIfNeeded} from './katalog-transaction.mjs';

const fail=(status,message,code='design_variant_invalid')=>{throw Object.assign(Error(message),{status,code});};
const hash=v=>createHash('sha256').update(v).digest('hex'),round=v=>Math.round(v*1e8)/1e8;
const esc=v=>String(v).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const segment=v=>typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9_. ,-]{0,119}$/.test(v)&&!v.includes('..')&&!/[. ]$/.test(v)&&!/^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(v);
const parseId=id=>/^(.+)-(\d+(?:[.,]\d+)?x\d+(?:[.,]\d+)?)-D(\d+)$/i.exec(id);
const rootId=master=>master.json.varianteVon??master.id;
const readJson=file=>{try{return JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));}catch{fail(422,'Katalog-JSON ist nicht lesbar: '+file);}};
function input(data){
 if(data?.resolution!==undefined&&data.resolution!=='add-target-to-existing')fail(422,'Unbekannte Kollisionsentscheidung.');
 if(!record(data)||Object.keys(data).some(k=>!['source','target','checksum','resolution'].includes(k))||!record(data.source)||!record(data.target))fail(422,'Quelle und Familienziel angeben.');
 if(Object.keys(data.source).some(k=>!['reihe','id','checksum'].includes(k))||Object.keys(data.target).some(k=>!['familyId','sizeKey','lineId'].includes(k)))fail(422,'Unbekanntes Variantenfeld.');
 for(const k of ['reihe','id'])if(!segment(data.source[k])||data.source.reihe==='bestand')fail(422,'Ungültiger Designpfad.');
 for(const k of ['familyId','sizeKey'])if(!segment(data.target[k]))fail(422,'Familie und Größe angeben.');
 if(data.target.lineId!==undefined&&!segment(data.target.lineId))fail(422,'Ungültige Linie.');
}
function source(root,query){
 const base='designs/'+query.reihe+'/'+query.id,jsonFile=safeKatalogPath(root,base+'/design.json'),svgFile=safeKatalogPath(root,base+'/design.svg');
 const jsonText=fs.readFileSync(jsonFile,'utf8'),svgText=fs.readFileSync(svgFile,'utf8'),master=readDesignFolder(path.dirname(jsonFile));
 if(master.id!==query.id)fail(422,'Designkennung widerspricht dem Quellordner.');
 const checksum=hash(Buffer.concat([Buffer.from(jsonText),Buffer.from('\0'),Buffer.from(svgText)]));
 if(query.checksum!==undefined&&checksum!==query.checksum)fail(409,'Das Quelldesign wurde inzwischen geändert. Bitte neu vorbereiten.','design_variant_conflict');
 return {...master,seriesFolder:query.reihe,svgText,jsonText,checksum,base};
}
// Includes indices and legacy files excluded from the master reader; no symlink traversal.
function inventory(root){
 const rows=[],stamps=[];
 function walk(relative){
  const dir=safeKatalogPath(root,relative,{directory:true});
  for(const e of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
   if(e.name.startsWith('.werkstatt-'))continue;const rel=relative+'/'+e.name;
   if(e.isSymbolicLink())fail(422,'Verknüpfung in der Designinventur: '+rel);
   if(e.isDirectory()){walk(rel);continue;}
   if(!e.isFile()||!['design.json','index.json','designs.json'].includes(e.name))continue;
   const file=safeKatalogPath(root,rel),bytes=fs.readFileSync(file),json=readJson(file);stamps.push([rel,hash(bytes)]);
   const kind=rel.startsWith('designs/bestand/')?'bestand':e.name==='design.json'?'master':'index';
   const add=value=>{if(!record(value))return;const ids=[value.id,value.key,value.katalog?.key].filter(v=>typeof v==='string');if(ids.length)rows.push({file:rel,kind,json:{id:value.id,key:value.key,katalog:value.katalog?{key:value.katalog.key}:undefined,varianteVon:value.varianteVon,plateMm:value.plateMm,plate:value.plate?{widthMm:value.plate.widthMm,heightMm:value.plate.heightMm}:undefined},ids});};
   if(Array.isArray(json))json.forEach(add);else{add(json);for(const k of ['designs','entries','items'])if(Array.isArray(json[k]))json[k].forEach(add);}
  }
 }
 walk('designs');return {rows,stamp:hash(JSON.stringify(stamps))};
}
function prefixes(katalog,family,size,lineId){
 const lines=lineId?[katalog.lines.get(lineId)]:[...katalog.lines.values()].filter(l=>l.families.includes(family.id));
 if(lineId&&(!lines[0]||!lines[0].families.includes(family.id)))fail(422,'Die Familie gehört nicht zur gewählten Linie.');
 const ids=new Set(lines.filter(Boolean).flatMap(l=>l.subcategories.flatMap(s=>[s.startDesign,...(s.mainProducts??[]).map(p=>p.startDesign)])));
 const sized=m=>m.json.sizes?.includes(size.key)||m.json.masterSheet?.familySize===size.key;
 let candidates=katalog.designs.masters;
 if(lineId){
  const direct=candidates.filter(m=>ids.has(m.id)),themes=new Set(lines[0].subcategories.map(s=>s.themeId).filter(Boolean));
  candidates=direct.length?direct:candidates.filter(m=>m.themes?.some(theme=>themes.has(theme)));
  const exact=candidates.filter(sized);if(exact.length)candidates=exact;
 }else candidates=candidates.filter(m=>sized(m)||ids.has(m.id));
 const matches=candidates.filter(m=>{const c=designTargetCompatibility(m,family,size,{katalog});return c.sourceForm===c.targetForm;});
 return [...new Set(matches.map(m=>parseId(m.id)?.[1]).filter(Boolean))];
}
function identity(katalog,master,family,size,lineId,inv){
 const p=parseId(master.id),open=reason=>({message:'Kennung offen',reason});
 if(!p)return open('Die Quellkennung folgt keinem vorhandenen Bogenformat.');
 const c=designTargetCompatibility(master,family,size,{katalog});if(!c.sourceForm)return open('Die Quellform ist nicht eindeutig.');
 const candidates=prefixes(katalog,family,size,lineId),lineCode=p=>p.split('-').slice(0,-1).join('-');
 const sameTarget=designTargets(master,katalog).some(t=>t.familie===family.id);
 // Existing explicit family assignments preserve the source sheet prefix when
 // only its size changes. Other sheets already generated at that size are not
 // evidence of a line change (Issue 85 acrylic animal stock).
 const codes=[...new Set(candidates.map(lineCode))],formChange=c.sourceForm!==c.targetForm,lineChange=(Boolean(lineId)||!sameTarget)&&codes.length===1&&codes[0]!==lineCode(p[1]);
 if((lineId||formChange||lineChange)&&codes.length!==1)return open('Kein eindeutiges vorhandenes Bogenkürzel für die Zielform/-linie.');
 const prefix=formChange||lineChange?lineCode(candidates[0])+'-'+p[1].split('-').at(-1):p[1],dims=[size.widthMm,size.heightMm];
 if(!formChange&&!lineChange&&dims.every((v,i)=>Math.abs(v-master.plateMm[i])<.001))return {id:master.id,reihe:master.seriesFolder,key:master.json.katalog?.key??master.id};
 const spellings=new Set();
 for(const row of inv.rows)for(const id of row.ids){const m=parseId(id),plate=row.json.plateMm??[row.json.plate?.widthMm,row.json.plate?.heightMm],exact=plate.length===2&&plate.every((v,i)=>Number.isFinite(v)&&Math.abs(v-dims[i])<.001);if(m&&m[1]===prefix&&(exact||m[2].split('x').every((v,i)=>Math.abs(Number(v.replace(',','.'))*10-dims[i])<.51)))spellings.add(m[2]);}
 if(spellings.size>1)return open('Mehrere Schreibweisen des Zielbogens vorhanden.');
 const format=[...spellings][0]??dims.map(v=>round(v/10)).join('x'),id=prefix+'-'+format+'-D'+p[3];
 const folders=new Set(katalog.designs.masters.filter(m=>parseId(m.id)?.slice(1,3).join('-')===prefix+'-'+format).map(m=>m.seriesFolder));
 if(folders.size>1)return open('Das Bogenpräfix kommt in mehreren Reihenordnern vor.');
 let reihe=[...folders][0];
 if(!reihe){
  const match=/(\d+(?:[.,]\d+)?x\d+(?:[.,]\d+)?)(?!.*\d+x\d+)/.exec(master.seriesFolder);if(!match)return open('Die Einheit im Ursprungsordner ist nicht bestimmt.');
  const ratios=match[1].split('x').map((v,i)=>master.plateMm[i]/Number(v.replace(',','.'))),unit=ratios.every(v=>Math.abs(v-10)<.06)?10:ratios.every(v=>Math.abs(v-1)<.06)?1:null;
  if(!unit)return open('Die Einheit im Ursprungsordner ist nicht bestimmt.');
  reihe=master.seriesFolder.replace(match[1],dims.map(v=>round(v/unit)).join('x'));
  if(reihe===master.seriesFolder&&prefix!==p[1])return open('Ein Reihenordner für die neue Form fehlt.');
 }
 if(!segment(id)||!segment(reihe))fail(422,'Abgeleitete Kennung ist kein sicherer Katalogpfad.');
 return {id,reihe,key:reihe+'-D'+p[3]};
}
function collision(inv,ident,master,katalog,family){
 const aliases=new Set([ident.id,ident.key]),a=parseId(master.id),b=parseId(ident.id);
 if(master.json.katalog?.key&&a&&b&&a[1]===b[1]){const changed=master.json.katalog.key.replace(a[2],b[2]);if(changed!==master.json.katalog.key)aliases.add(changed);}
 const folded=new Set([...aliases].map(id=>id.toLowerCase())),matches=inv.rows.filter(r=>r.ids.some(id=>folded.has(id.toLowerCase()))),actual=matches.filter(r=>r.kind==='master'),blocked=message=>({action:'blocked',message,collisions:matches});
 if(actual.length>1)return blocked('Kennung belegt');
 if(actual.length){
  const row=actual[0],parts=row.file.split('/'),existing=katalog.designs.masters.find(d=>d.id===row.json.id&&d.seriesFolder===parts[1]);
  if(!existing)return blocked('Kennung belegt');
  if(existing.id!==master.id&&rootId(existing)!==rootId(master))return {...blocked('Kennung belegt'),existing:{reihe:parts[1],id:existing.id},allowAddTarget:true};
  const exists=designTargets(existing,katalog).some(t=>t.familie===family.id);
  return {action:exists?'already-exists':'add-target',message:exists?'schon vorhanden':'Ziel hinzufügen',existing:{reihe:parts[1],id:existing.id},collisions:matches};
 }
 if(matches.length)return blocked(matches.every(r=>r.kind==='bestand')?'Bestandsfassung vorhanden':'Kennung belegt');
 return {action:'create-variant',message:'Kennung frei',collisions:[]};
}

function collisionPreview(root,row){
 if(!row.file.endsWith('/design.json'))return null;
 const dir=row.file.slice(0,-'design.json'.length);
 for(const name of ['preview.png','original.png']){
  const file=safeKatalogPath(root,dir+name,{missing:true});
  if(!fs.existsSync(file))continue;
  if(fs.statSync(file).size>10*1024*1024)continue;
  const bytes=fs.readFileSync(file);
  if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'data:image/png;base64,'+bytes.toString('base64');
 }
 return null;
}
function resourceStamp(root,master,katalog){
 const names=[...new Set(parseDesignSvg(master.svgText).layers.filter(l=>l.text).map(l=>l.font))],rows=[];
 for(const name of names){const f=katalog.fonts.list.get(name);if(f?.file){const file=safeKatalogPath(root,f.fileListed??path.relative(root,f.file).split(path.sep).join('/'));rows.push([name,hash(fs.readFileSync(file))]);}else rows.push([name,f??null]);}
 for(const l of parseDesignSvg(master.svgText).layers)if(l.placeholder)rows.push([l.placeholder,hash(fs.readFileSync(safeKatalogPath(root,master.base+'/'+l.placeholder)))]);
 return rows;
}

function state(root,data){
 input(data);const master=source(root,data.source),katalog=openKatalog(root),family=katalog.families.get(data.target.familyId);
 if(!family)fail(422,'Familie fehlt.','design_variant_family_missing');
 const size=family.sizes.find(s=>s.key===data.target.sizeKey);if(!size)fail(422,'Größe gehört nicht zu dieser Familie.');
 const inv=inventory(root),ident=identity(katalog,master,family,size,data.target.lineId,inv);
 let outcome=ident.id?collision(inv,ident,master,katalog,family):{action:'blocked',message:ident.message,reason:ident.reason,collisions:[]};
 if(data.resolution){if(!outcome.allowAddTarget)fail(409,'Keine eindeutig belegte Lieferform-2-Kennung zur Zielergänzung vorhanden.','design_variant_conflict');const existing=katalog.designs.masters.find(m=>m.id===outcome.existing.id&&m.seriesFolder===outcome.existing.reihe),exists=designTargets(existing,katalog).some(t=>t.familie===family.id);outcome={...outcome,action:exists?'already-exists':'add-target',message:exists?'schon vorhanden':'Ziel hinzufügen'};}
 const destination=outcome.existing?source(root,outcome.existing):null;
 const checksum=hash(JSON.stringify({destination:destination?{checksum:destination.checksum,resources:resourceStamp(root,destination,katalog)}:null,source:master.checksum,inventory:inv.stamp,family:hash(fs.readFileSync(katalog.files.get('familie:'+family.id))),lines:[...katalog.lines.values()],ident,action:outcome.action,resources:resourceStamp(root,master,katalog)}));
 return {root,master,katalog,family,size,ident,outcome,checksum,lineId:data.target.lineId??null};
}

function scaleBox(box,s,dx,dy){return Array.isArray(box)&&box.length===4?box.map((v,i)=>round(v*s+(i===0?dx:i===1?dy:0))):box;}
export function scaledPhotoMarkup(layer,s,dx,dy){
 const box=scaleBox(layer.bounds,s,dx,dy),[tx,ty]=layer.maskTranslation||[0,0],mask=transformEmbeddedPath(layer.maskPath,s,dx+tx*s,dy+ty*s),clip='variant-mask-'+layer.id;
 const rule=layer.maskEvenodd?'evenodd':'nonzero';let image='';
 if(layer.exampleImage){const im=layer.exampleImage,[x,y,w,h]=scaleBox(im.bounds,s,dx+tx*s,dy+ty*s);image=`<image x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="${esc(im.preserveAspectRatio)}" clip-path="url(#${esc(clip)})" href="${esc(im.href)}"/>`;}
 return `<g id="${esc(layer.id)}" class="foto" data-upload-window="${box.join(' ')}"${layer.exampleImage?.uploadHint?' data-upload-hint="separate"':''}><path d="${esc(mask)}" fill="none" fill-rule="${rule}"/><defs><clipPath id="${esc(clip)}"><path d="${esc(mask)}" clip-rule="${rule}"/></clipPath></defs>${image}</g>`;
}
function combineBounds(paths){const b=paths.map(p=>pathBounds(p.d)),l=Math.min(...b.map(b=>b[0])),t=Math.min(...b.map(b=>b[1]));return [l,t,Math.max(...b.map(b=>b[0]+b[2]))-l,Math.max(...b.map(b=>b[1]+b[3]))-t].map(round);}
function transformed(ctx,converted,scaled){
 const {master,family,size,ident}=ctx,parsed=parseDesignSvg(master.svgText),s=scaled.katalog.scale,[dx,dy]=scaled.katalog.offsetMm,json=structuredClone(master.json),markup=[],assets=new Map();
 const objects=new Map(scaled.objects.map(o=>[o.id,o])),before=new Map(converted.template.objects.map(o=>[o.id,o]));let ti=0,mi=0,pi=0;
 json.texts=[];json.motifs=[];if(master.json.photos)json.photos=[];
 for(const image of master.svgText.matchAll(/<image\b[^>]*>/g)){const href=/(?:\s|:)href=["']([^"']+)["']/.exec(image[0])?.[1];if(!href||!parsed.layers.some(l=>l.placeholder===href||l.exampleImage?.href===href))fail(422,'Ein Bildverweis ist nicht als Originalfoto übertragbar.');}
 if(parsed.notes.some(n=>!n.includes('id="nutzflaeche"')))fail(422,'Quell-SVG enthält nicht übertragbare Ebenen: '+parsed.notes.join(' '));
 for(const l of parsed.layers){
  if(l.kind==='text'||l.text){
   const o=objects.get(l.id);if(!o)fail(422,'Textebene fehlt im gemeinsamen Konverter: '+l.id);
   const prior=(master.json.texts??[]).find(t=>t.layerId===l.id)??master.json.texts?.[ti]??{};if(l.kind==='text')ti++;
   const entry={...prior,...editorTextToMaster({source:l,before:before.get(l.id),after:o}),layerId:l.id,color:l.fill??prior.color??'#000000'};
   if(prior.box)entry.box=scaleBox(prior.box,s,dx,dy);if(prior.lineWidthsMm)entry.lineWidthsMm=prior.lineWidthsMm.map(v=>round(v*s));
   const layout=masterTextLayout(entry),[x,y]=entry.anchorMm,rotation=l.rotation?' transform="rotate('+l.rotation+' '+x+' '+y+')"':'';
   markup.push('<text xml:space="preserve" id="'+esc(l.id)+'"'+(l.fieldKey?' data-feld="'+esc(l.fieldKey)+'"':'')+' x="'+x+'" y="'+y+'" font-family="'+esc(entry.font)+'" font-size="'+entry.sizeMm+'" text-anchor="'+l.anchor+'" letter-spacing="'+entry.letterSpacingMm+'" fill="'+esc(entry.color)+'"'+rotation+'>'+layout.spans+'</text>');
   if(l.kind==='text')json.texts.push(entry);
  }else if(l.kind==='foto'){
   const box=scaleBox(l.bounds,s,dx,dy),[x,y,w,h]=box,prior=(master.json.photos??[]).find(p=>p.layerId===l.id)??master.json.photos?.[pi++]??{};
   if(l.rotation)fail(422,'Gedrehte Fotofelder benötigen eine Quellkorrektur.');
   if(l.placeholder){const file=safeKatalogPath(ctx.root,master.base+'/'+l.placeholder);assets.set(l.placeholder,fs.readFileSync(file));}
   markup.push(scaledPhotoMarkup(l,s,dx,dy));json.photos??=[];json.photos.push({...prior,layerId:l.id,box});
  }else{
   if(l.rotation)fail(422,'Gedrehte Motivquellen benötigen eine Quellkorrektur.');
   const prior=(master.json.motifs??[]).find(m=>m.layerId===l.id)??master.json.motifs?.[mi]??{};if(l.kind!=='guide')mi++;
   const paths=l.paths.map((d,i)=>{const attrs=l.pathAttributes[i],old=record(prior.paths?.[i])?prior.paths[i]:{};return {...old,...attrs,d:transformEmbeddedPath(d,s,dx+(l.translation?.[0]??0)*s,dy+(l.translation?.[1]??0)*s),strokeMm:round(attrs.strokeMm*s)};});
   for(const p of paths)if(p.box)p.box=pathBounds(p.d).map(round);
   markup.push('<g id="'+esc(l.id)+'">'+paths.map(p=>'<path d="'+esc(p.d)+'" fill="'+esc(p.fill??'#000000')+'" fill-rule="'+(p.evenodd?'evenodd':'nonzero')+'"'+(p.stroke?' stroke="'+esc(p.stroke)+'" stroke-width="'+p.strokeMm+'"':'')+(p.opacity!==undefined?' opacity="'+p.opacity+'"':'')+'/>').join('')+'</g>');
   if(l.kind!=='guide')json.motifs.push({...prior,layerId:l.id,box:combineBounds(paths),paths});
  }
 }
 const physical=familyTemplate({...family,backing:undefined,designArea:{...family.designArea,marginMm:0}},size),body=physical.slice(physical.indexOf('>')+1,physical.lastIndexOf('</svg>')).replace(/<title>[\s\S]*?<\/title>/,'');
 const svgText='<svg xmlns="http://www.w3.org/2000/svg" width="'+size.widthMm+'mm" height="'+size.heightMm+'mm" viewBox="0 0 '+size.widthMm+' '+size.heightMm+'">\n'+body+'\n'+markup.join('\n')+'\n</svg>\n';
 Object.assign(json,{id:ident.id,plateMm:[size.widthMm,size.heightMm],plate:{...json.plate,widthMm:size.widthMm,heightMm:size.heightMm,source:'Familie '+family.id+' · '+size.key},material:FAMILY_MATERIALS[family.material.kind].name,process:familyProcess(family).method==='print'?'Druck':'Gravur',form:family.groups.find(g=>g.key===size.groupKey).name,sizes:[size.key],sizesOpen:[],masterSheet:{...json.masterSheet,base:ident.id.replace(/-D\d+$/,''),familySize:size.key,plateMm:[size.widthMm,size.heightMm]},katalog:{...json.katalog,series:ident.reihe,key:ident.key},varianteVon:rootId(master),ziele:[{familie:family.id,freigabe:null}],freigabe:null});
 // Source production assets belong to its dimensions, never to this new master.
 for(const key of ['production','productionFile','productionSvg','productionSizes','productionAlternatives'])delete json[key];
 json.transfer={from:master.id,fromKey:master.json.katalog?.key??master.id,source:master.base+'/design.json',scale:s,offsetMm:[dx,dy],deviationPercent:round(Math.abs((master.plateMm[1]*(size.widthMm/master.plateMm[0]))/size.heightMm-1)*100)};
 return {json,svgText,assets};
}
function preview(family,size,template,motifs,fonts,photoAssets){
 // Preview has no quotation; private neutral cents are not persisted.
 const view=structuredClone(family),s=structuredClone(size);view.groups=view.groups.filter(g=>g.key===s.groupKey);view.options=[];delete view.quantityTiers;delete view.backing;view.mountingRules=view.mountingRules.filter(r=>s.mounting.includes(r.id));for(const r of view.mountingRules)r.priceCents=0;s.baseCents=0;delete s.quantityTiers;if(view.photo)view.photo.extraPriceCents=0;view.sizes=[s];
 const config=familyProductConfig(view,s,1,{previewOnly:true});config.localResources={...config.localResources,fonts,motifs};config.profile.designs=[template];config.profile.defaultDesignId=template.id;config.photo.enabled=template.objects.some(o=>o.type==='photoSlot');
 const mounting=config.profile.optionGroups.find(g=>g.id==='mounting'),drilled=mounting?.values.find(v=>v.holes?.length);if(drilled)mounting.defaultValueId=drilled.id;
 config.photo.hints=(photoAssets.examples||[]).map(e=>({designId:template.id,slotId:e.slotId,text:'Foto hochladen',enabled:e.uploadHint}));
 let svg=productPreview({universal:config},{keepout:false,designArea:true,examples:(photoAssets.examples||[]).map(e=>({...e,designId:template.id}))});
 for(const mask of photoAssets.previewMaskUrls||[])svg=svg.replaceAll('/api/workshop/design-assets/'+mask.id+'/preview.svg',mask.url);
 return svg;
}
function publicPlan(ctx,details={}){
 const {master,family,size,ident,outcome,checksum}=ctx,identity=ident.id?{reihe:ident.reihe,id:ident.id,key:ident.key}:null;
 return {schema:'gravuru-design-variant/v1',action:outcome.action,allowAddTarget:outcome.allowAddTarget===true,existing:outcome.existing??null,status:outcome.message,message:outcome.message+(outcome.reason?' – '+outcome.reason:''),source:{reihe:master.seriesFolder,id:master.id,checksum:master.checksum},target:{familyId:family.id,sizeKey:size.key,lineId:ctx.lineId,plateMm:[size.widthMm,size.heightMm]},identity,checksum,collisions:outcome.collisions.map(r=>({kind:r.kind,file:r.file,id:r.json.id??r.json.key,previewUrl:collisionPreview(ctx.root,r)})),previewUrl:outcome.collisions.map(r=>collisionPreview(ctx.root,r)).find(Boolean)??null,editor:outcome.action==='blocked'?null:outcome.existing??(identity&&{reihe:identity.reihe,id:identity.id}),...details};
}
export function createDesignVariants({available={},converter=convertFont}={}){
 async function evaluate(ctx,master,{variant=false}={}){
  const {katalog,family,size}=ctx,svgText=master.svgText,names=[...new Set(parseDesignSvg(svgText).layers.filter(l=>l.text).map(l=>l.font))];
  for(const name of names)if(!katalog.fonts.list.has(name))fail(422,'Schrift fehlt im Katalog: '+name);
  const resources=await katalog.fontResources(names,{available,converter});if(resources.missing.length)fail(422,'Schriftdatei fehlt: '+resources.missing.join(', '));
  const fonts=resources.fonts,converted=await prepareKatalogPhotoAssets(katalogDesignToTemplate(master,family,katalog.theme(master.themes?.[0]),{fonts,svgText}),master,{previewOnly:true}),scaled=scaleTemplate(converted.template,master.plateMm,[size.widthMm,size.heightMm],fonts,{contain:true});
  const transfer={scale:scaled.katalog.scale,offsetMm:scaled.katalog.offsetMm,deviationPercent:round(Math.abs((master.plateMm[1]*(size.widthMm/master.plateMm[0]))/size.heightMm-1)*100)};
  let fit=assessDesignTarget({master,template:scaled,family,size,fonts,motifs:scaleEmbeddedMotifs(converted.motifs,scaled.katalog.scale)}),template=scaled,motifs=scaleEmbeddedMotifs(converted.motifs,scaled.katalog.scale);
  const plan=variant?transformed(ctx,converted,scaled):null;
  let photos=converted;
  if(plan){const revised={...master,id:plan.json.id,json:plan.json,plateMm:plan.json.plateMm,svg:()=>plan.svgText},next=await prepareKatalogPhotoAssets(katalogDesignToTemplate(revised,family,katalog.theme(master.themes?.[0]),{fonts,svgText:plan.svgText}),revised,{previewOnly:true});template=next.template;motifs=next.motifs;photos=next;fit=assessDesignTarget({master:revised,template,family,size,fonts,motifs});}
  return {plan,details:{transform:transfer,fit,svg:preview(family,size,template,motifs,fonts,photos)}};
 }
 async function prepareInternal(root,data){
  recoverKatalogIfNeeded(root);const ctx=state(root,data);
  if(ctx.outcome.action==='blocked'){
   const details={};
   if(ctx.outcome.allowAddTarget){
    // Both sides use the same target plate; a missing resource remains visible.
    for(const [name,master]of [['source',ctx.master],['existing',source(root,ctx.outcome.existing)]]){
     try{const view=await evaluate(ctx,master);details[name+'Svg']=view.details.svg;details[name+'Fit']=view.details.fit;}
     catch(error){details[name+'PreviewError']=error.message;}
    }
   }
   return {ctx,result:publicPlan(ctx,details)};
  }
  const master=ctx.outcome.existing?source(root,ctx.outcome.existing):ctx.master;
  const {plan,details}=await evaluate(ctx,master,{variant:ctx.outcome.action==='create-variant'});
  return {ctx,plan,result:publicPlan(ctx,details)};
 }
 return {
  async prepare(root,data){return (await prepareInternal(root,data)).result;},
  async create(root,data,{actor,now=new Date(),beforeReplace}={}){
   if(typeof actor!=='string'||!actor.trim())fail(422,'Die Sitzungskennung für das Änderungsprotokoll fehlt.');
   if(typeof data?.checksum!=='string')fail(409,'Variante zuerst vorbereiten.','design_variant_conflict');
   const prepared=await prepareInternal(root,data);if(prepared.result.checksum!==data.checksum)fail(409,'Der Katalog wurde inzwischen geändert. Bitte neu vorbereiten.','design_variant_conflict');
   if(prepared.result.action==='blocked')fail(409,prepared.result.message,'design_variant_collision');
   return withKatalogWriteLock(root,root=>{
    const fresh=state(root,data);if(fresh.checksum!==data.checksum)fail(409,'Der Katalog wurde inzwischen geändert. Bitte neu vorbereiten.','design_variant_conflict');
    if(fresh.outcome.action==='already-exists')return {...prepared.result,changed:false,files:[]};
    const {family,ident,master}=fresh,at=now.toISOString(),by=actor.slice(0,160),target=fresh.outcome.existing??ident,base='designs/'+target.reihe+'/'+target.id,protocol='designs/'+target.reihe+'/_aenderungen.jsonl',created=[],entries=[];
    try{
     if(fresh.outcome.action==='create-variant'){
      for(const rel of ['designs/'+target.reihe,base]){const file=safeKatalogPath(root,rel,{missing:true,directory:true});if(!fs.existsSync(file)){fs.mkdirSync(file);created.push(file);}else if(rel===base)fail(409,'Kennung belegt','design_variant_collision');}
      const plan=prepared.plan;Object.assign(plan.json.transfer,{decided:at,by});
      entries.push({relative:base+'/design.json',text:JSON.stringify(plan.json,null,1)+'\n'},{relative:base+'/design.svg',text:plan.svgText});
      for(const [name,bytes]of plan.assets)entries.push({relative:base+'/'+name,text:bytes});
      const indexRel='designs/'+target.reihe+'/index.json',indexFile=safeKatalogPath(root,indexRel,{missing:true}),index=fs.existsSync(indexFile)?readJson(indexFile):[];if(!Array.isArray(index))fail(422,'Reihenindex ist keine Liste.');
      index.push({key:ident.id,name:plan.json.name??ident.id,pfad:ident.id,quelle:master.id,plateMm:plan.json.plateMm,themen:plan.json.themes??[],groessen:[fresh.size.key]});entries.push({relative:indexRel,text:JSON.stringify(index,null,1)+'\n'});
     }else{
      const existing=source(root,target),json=structuredClone(existing.json),targets=designTargets(existing,fresh.katalog);json.ziele=[...targets,{familie:family.id,freigabe:null}];entries.push({relative:base+'/design.json',text:JSON.stringify(json,null,1)+'\n'});
     }
     const logFile=safeKatalogPath(root,protocol,{missing:true}),log=fs.existsSync(logFile)?fs.readFileSync(logFile,'utf8'):'';
     if(log&&!log.endsWith('\n'))fail(422,'Änderungsprotokoll endet nicht mit LF.');
     const audit={at,actor:by,source:'design-variant',action:fresh.outcome.action,from:{reihe:master.seriesFolder,id:master.id,checksum:master.checksum},designId:target.id,reihe:target.reihe,target:prepared.result.target,transform:prepared.result.transform,freigabe:null,files:entries.map(e=>e.relative)};
     entries.push({relative:protocol,text:log+JSON.stringify(audit)+'\n'});const files=writeKatalogTransaction(root,entries,{beforeReplace});
     return {...prepared.result,status:fresh.outcome.action==='create-variant'?'Variante angelegt':'Ziel hinzugefügt',message:fresh.outcome.action==='create-variant'?'Variante angelegt. Ziel bleibt offen.':'Ziel hinzugefügt. Freigabe bleibt offen.',changed:true,files,editor:{reihe:target.reihe,id:target.id}};
    }catch(error){for(const file of created.reverse())if(fs.existsSync(file)&&fs.readdirSync(file).length===0)fs.rmdirSync(file);throw error;}
   });
  }
 };
}
