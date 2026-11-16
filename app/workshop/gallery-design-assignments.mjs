import {createHash} from 'node:crypto';
import {nativeSource} from './gallery-shop-sync-native.mjs';
import {validateFamily} from './product-families.mjs';
import {validateLine} from './katalog-source.mjs';
import {offeredFamilyIds} from './subcategory-materials.mjs';
import {katalogFamilyToProduct,scaleTemplate,templateFit} from './katalog-convert.mjs';
import {validateProductDesign} from './product-model.mjs';
import {prepareShopProduct} from './shop-preparation.mjs';

export const GALLERY_ASSIGNMENT_SCHEMA='gravuru-gallery-design-assignment/v1';
export const GALLERY_ASSIGNMENT_PREFIX='gallery-assignment:';
export const GALLERY_ASSIGNMENT_LIMITS=Object.freeze({sources:60,targetSelections:100,targetEntries:120,nativeBytes:64*1024*1024,previewBytes:8*1024*1024});
const clone=v=>structuredClone(v),plain=v=>v&&typeof v==='object'&&!Array.isArray(v);
const canonical=v=>Array.isArray(v)?v.map(canonical):plain(v)?Object.fromEntries(Object.keys(v).filter(k=>v[k]!==undefined).sort().map(k=>[k,canonical(v[k])])):v;
const hash=v=>createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex');
const same=(a,b)=>hash(a)===hash(b);
const fail=(status,message,code='gallery_assignment_invalid')=>{throw Object.assign(Error(message),{status,code});};
const strict=(value,keys)=>{if(!plain(value)||Object.keys(value).some(k=>!keys.includes(k)))fail(422,'Unbekannte Zuordnungsangaben.');};
const identity=(material,originalId,sizeKey)=>JSON.stringify([material.key,originalId,sizeKey]);
const materialFor=family=>{
  const m=family.material;
  if(m.kind==='steel')return {key:'steel',label:'Edelstahl',kind:'steel'};
  if(m.kind==='slate')return {key:'slate',label:'Schiefer',kind:'slate'};
  const key=m.kind==='acrylic'&&({schwarz:{3:'acrylic-schwarz-3mm',5:'acrylic-as-5mm'},anthrazit:{3:'acrylic-anthrazit-3mm',5:'acrylic-aa-5mm'},satiniert:{3:'acrylic-ss-3mm'}})[m.variant]?.[m.thicknessMm];
  if(!key)fail(422,'Für dieses Material ist noch kein geprüfter Galerieadapter verbunden.');
  return {key,label:'Acrylglas '+({schwarz:'Schwarz',anthrazit:'Anthrazit',satiniert:'Satiniert'})[m.variant]+' · '+m.thicknessMm+' mm',kind:'acrylic'};
};
function mergeNamed(target,incoming,key,label){
  for(const item of incoming){const found=target.find(v=>v[key]===item[key]);if(found&&!same(found,item))fail(409,label+' „'+item[key]+'“ hat in den Quellen unterschiedliche Inhalte.');if(!found)target.push(clone(item));}
}

/** Server-owned catalogue/allowlist callbacks only. No catalogue, shop or
 * approval writes. All new registrations live in immutable native revision 1
 * and are committed with their import journal entry in the same transaction. */
export function createGalleryDesignAssignments({workshop,catalogue,listTargets,originalFor}={}){
  const repository=workshop?.repository;
  if(!repository?.transactionalImportGuards||typeof repository.importItems!=='function'||typeof catalogue!=='function'||typeof listTargets!=='function'||typeof originalFor!=='function'||typeof workshop.editorPreview!=='function')throw Error('Native Werkstatt, Katalog und Galerie-Zielliste erforderlich.');
  let pending=null;
  function registrations(){
    return repository.importItems({prefix:GALLERY_ASSIGNMENT_PREFIX}).flatMap(row=>row.registrations.map(m=>{
      if(m.schema!==GALLERY_ASSIGNMENT_SCHEMA||!m.originalId||!m.nativeDesignId||!m.reviewMaterial||!m.familyId||!m.sizeKey||!Array.isArray(m.mm)||!m.source)fail(409,'Eine native Zuordnungsregistrierung ist unvollständig.');
      return {...clone(m),productKey:row.key,productId:row.id,designId:m.nativeDesignId,status:'prepared',reviewOnly:true,released:false};
    }));
  }
  function targets(){
    const map=new Map();
    for(const t of [...listTargets(),...registrations()]){
      // Missing native targets are visible review items, not existing copies.
      // They cannot be selected as sources and may receive a new assignment.
      if(t.productId===null||t.productId===undefined)continue;
      const material=t.reviewMaterial??t.material;
      if(!plain(material)||!material.key)fail(409,'Galerie-Material ist nicht eindeutig.');
      const key=t.key??identity(material,t.originalId,t.sizeKey),value={...t,key,reviewMaterial:material,designId:t.designId??t.nativeDesignId};
      if(!material||typeof key!=='string'||!value.productId||!value.designId||!value.originalId)fail(409,'Galerie-Zuordnung ist nicht eindeutig.');
      const old=map.get(key);if(old&&(old.productId!==value.productId||old.designId!==value.designId))fail(409,'Ein Galerie-Ziel ist mehrfach zugeordnet.');map.set(key,value);
    }
    return map;
  }
  function catalog(){
    const data=catalogue(),families=new Map();
    if(!Array.isArray(data?.families)||!Array.isArray(data.lines))fail(503,'Die geprüften Familien- und Linienquellen sind nicht verbunden.');
    for(const raw of data.families){const f=validateFamily(clone(raw));if(families.has(f.id))fail(409,'Doppelte Familienquelle.');families.set(f.id,f);}
    const lines=new Map();for(const raw of data.lines){const line=validateLine(clone(raw),{families});if(lines.has(line.id))fail(409,'Doppelte Produktlinie.');lines.set(line.id,line);}
    return {families,lines};
  }
  function sourceSelection(keys,registry,{revisions=false}={}){
    if(!Array.isArray(keys)||!keys.length||keys.length>GALLERY_ASSIGNMENT_LIMITS.sources)fail(422,'Bitte 1 bis 60 gespeicherte Vorlagen auswählen.');
    const seen=new Set(),records=new Map(),result=[];
    const scoped={...workshop,repository:{...repository,get:id=>{if(!records.has(id))records.set(id,repository.get(id));return records.get(id);}}};
    for(const input of keys){
      const key=revisions?input?.key:input;
      if(revisions)strict(input,['key','expectedRevision']);
      const target=registry.get(key);if(!target)fail(404,'Eine ausgewählte Vorlage ist nicht mehr in der Galerie vorhanden.');
      if(seen.has(target.originalId))fail(422,'Je Original genau eine gespeicherte Quellfassung auswählen.');seen.add(target.originalId);
      const source=nativeSource(scoped,{productId:target.productId,designId:target.designId,originalId:target.originalId});
      if(revisions&&(!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision!==source.record.revision))fail(409,'Eine Quelle wurde geändert. Bitte die aktuelle Vorlage neu auswählen.');
      if(!same(target.mm,[source.payload.geometry.width,source.payload.geometry.height]))fail(409,'Quellmaße und Galerie-Zuordnung stimmen nicht überein.');
      const original=originalFor(target.originalId);if(!original)fail(404,'Die Originalherkunft fehlt.');
      result.push({key,target,source,original});
    }
    return result;
  }
  function sourceView(s,registry){return {key:s.key,originalId:s.target.originalId,productId:s.source.record.id,designId:s.target.designId,revision:s.source.record.revision,mm:[s.source.payload.geometry.width,s.source.payload.geometry.height],name:s.source.payload.design.name,existingTargets:[...registry.values()].filter(t=>t.originalId===s.target.originalId).map(t=>({familyId:t.familyId,sizeKey:t.sizeKey}))};}
  function context(input){
    strict(input,['sourceKeys']);const registry=targets(),selected=sourceSelection(input.sourceKeys,registry),c=catalog();
    return {limits:GALLERY_ASSIGNMENT_LIMITS,sources:selected.map(s=>sourceView(s,registry)),
      lines:[...c.lines.values()].map(l=>({id:l.id,label:l.name,subcategories:l.subcategories.map(s=>({id:s.id,label:s.name,familyIds:offeredFamilyIds(l,s,{families:c.families})}))})),
      families:[...c.families.values()].flatMap(f=>{try{return [{id:f.id,label:f.name,material:materialFor(f),sizes:f.sizes.map(s=>({key:s.key,label:s.label,mm:[s.widthMm,s.heightMm],form:f.groups.find(g=>g.key===s.groupKey)?.name}))}];}catch{return [];}})};
  }
  function compile(input,{previews=true}={}){
    strict(input,['sources','targets']);
    if(!Array.isArray(input.targets)||!input.targets.length||input.targets.length>GALLERY_ASSIGNMENT_LIMITS.targetSelections)fail(422,'Bitte 1 bis 100 konkrete Familiengrößen auswählen.');
    if(input.sources?.length*input.targets.length>GALLERY_ASSIGNMENT_LIMITS.targetEntries)fail(422,'Ein Plan umfasst höchstens 120 Design-Ziele. Bitte die Auswahl in kleinere Stapel aufteilen.');
    const registry=targets(),sources=sourceSelection(input.sources,registry,{revisions:true}),c=catalog(),selectedTargets=[],seenTargets=new Set();
    for(const spec of input.targets){
      strict(spec,['lineId','subcategoryId','familyId','sizeKey']);
      const line=c.lines.get(spec.lineId),subcategory=line?.subcategories.find(s=>s.id===spec.subcategoryId),family=c.families.get(spec.familyId),size=family?.sizes.find(s=>s.key===spec.sizeKey);
      if(!line||!subcategory||!family||!size||!offeredFamilyIds(line,subcategory,{families:c.families}).includes(family.id))fail(422,'Familie oder Größe gehört nicht zum Angebot dieser Unterkategorie.');
      const key=JSON.stringify([family.id,size.key]);if(seenTargets.has(key))fail(422,'Jede Zielfamilie und Größe nur einmal auswählen.');seenTargets.add(key);
      selectedTargets.push({spec,line,subcategory,family,size,material:materialFor(family)});
    }
    const entries=[],groups=[],options=[],evidence={sources:sources.map(s=>({key:s.key,revision:s.source.record.revision,document:hash(s.source.record.document),metadata:hash(s.source.record.metadata??{}),native:s.source.evidence.fingerprint,original:hash(s.original)})),targets:selectedTargets.map(t=>({spec:t.spec,family:hash(t.family),line:hash(t.line)})),existing:[]};
    let nativeBytes=0,previewBytes=0;
    for(const t of selectedTargets){
      const collected=[],fonts={},motifs=[],rasters=[],photos=[],placeholders=[],hints=[];
      const target={familyId:t.family.id,familyLabel:t.family.material.label,sizeKey:t.size.key,mm:[t.size.widthMm,t.size.heightMm],reviewMaterial:t.material,lineId:t.line.id,subcategoryId:t.subcategory.id};
      for(const s of sources){
        const key=identity(t.material,s.target.originalId,t.size.key),existing=registry.get(key),entry={originalId:s.target.originalId,sourceKey:s.key,target:clone(target),warnings:[],status:'create'};entries.push(entry);
        if(existing){entry.status='existing';entry.productId=existing.productId;entry.nativeDesignId=existing.designId;evidence.existing.push({key,productId:existing.productId,designId:existing.designId,revision:repository.head?.(existing.productId)?.revision??repository.get(existing.productId).revision});continue;}
        try{
          const src=s.source,payload=src.payload,from=[payload.geometry.width,payload.geometry.height],sameSize=same(from,target.mm);
          if(!sameSize&&payload.design.marks?.length)fail(422,'Die festen Gestaltungslinien benötigen für diese andere Größe noch einen geprüften Formatadapter.');
          const template=sameSize?clone(payload.design):scaleTemplate(payload.design,from,target.mm,payload.fonts,{contain:true});
          if(!sameSize){const factor=Math.min(target.mm[0]/from[0],target.mm[1]/from[1]);for(let i=0;i<template.objects.length;i++)if(template.objects[i].type==='graphic')template.objects[i].strokeWidth=(payload.design.objects[i].strokeWidth||.5)*factor;entry.warnings.push('Proportional auf '+target.mm.join(' × ')+' mm eingepasst; Zielansicht prüfen.');}
          const fit=templateFit(template,t.family,t.size,payload.fonts,{motifs:payload.motifs.map(m=>m.artwork?workshop.assets.resource(m.artwork.assetId):m)});
          if(fit.status==='passt nicht')fail(422,fit.issues.join(' · '));entry.warnings.push(...fit.issues);
          const registration={schema:GALLERY_ASSIGNMENT_SCHEMA,...target,originalId:s.target.originalId,nativeDesignId:template.id,name:template.name,
            visualReviewIssues:[...clone(s.original.visualReviewIssues??[]),...entry.warnings],
            reviewCategory:clone(s.original.reviewCategory),reviewThemes:clone(s.original.reviewThemes??[]),source:{key:s.key,productId:src.record.id,designId:s.target.designId,revision:src.record.revision,fingerprint:src.evidence.fingerprint}};
          template.katalog={...template.katalog,originalId:s.target.originalId,designId:s.target.originalId,target:{familyId:t.family.id,explicit:true,released:false},targetMm:clone(target.mm),galleryAssignment:registration};
          for(const [id,font]of Object.entries(payload.fonts)){if(fonts[id]&&!same(fonts[id],font))fail(409,'Schrift „'+id+'“ hat unterschiedliche Quelldaten.');fonts[id]=clone(font);}
          mergeNamed(motifs,payload.motifs,'key','Motiv');mergeNamed(rasters,payload.rasters,'assetId','Rastermotiv');
          photos.push(...clone(payload.photos));placeholders.push(...clone(payload.placeholders));hints.push(...clone(payload.hints));
          collected.push({template,motifs:[],rights:clone(payload.rights),source:s,entry});
        }catch(error){entry.status='blocked';entry.reason=error.message;}
      }
      if(!collected.length)continue;
      try{
        const {document}=katalogFamilyToProduct(t.family,t.line,t.subcategory,{size:t.size,fonts,templates:collected});
        const resources=document.config.localResources;
        // Named collisions are explicit conflicts. Geometry is carried by
        // objects; immutable SVG viewBoxes and photo originals stay unchanged.
        for(const [name,font]of Object.entries(fonts)){if(resources.fonts[name]&&!same(resources.fonts[name],font))fail(409,'Zielschrift kollidiert mit einer Quellschrift.');resources.fonts[name]=clone(font);}
        mergeNamed(resources.motifs,motifs,'key','Motiv');
        if(rasters.length)resources.rasters=clone(rasters);
        resources.photoExamples=clone(photos);resources.photoPlaceholders=clone(placeholders);
        if(hints.length)document.config.photo.hints=clone(hints);
        const native=repository.validate(document);
        for(const item of collected)validateProductDesign(native,item.template,{template:true});
        const prepared=prepareShopProduct({id:'assignment-plan',revision:1,status:'draft',document:native,metadata:{}});
        if(!prepared.sourceReady)fail(422,'Die native Zielgruppe ist noch nicht vollständig vorbereitet.');
        if(native.config.reviewOnly!==true||native.config.profile.features.orderEnabled!==false||native.config.profile.features.productionConfirmed!==false)fail(422,'Zielgruppe ist kein privater Prüfstand.');
        nativeBytes+=Buffer.byteLength(JSON.stringify(native));if(nativeBytes>GALLERY_ASSIGNMENT_LIMITS.nativeBytes)fail(422,'Die nativen Plandaten überschreiten 64 MiB. Bitte kleinere Stapel auswählen.','gallery_assignment_limit');
        const fingerprint=hash(native),key=GALLERY_ASSIGNMENT_PREFIX+hash({target:t.spec,sources:collected.map(x=>x.template.katalog.galleryAssignment.source),fingerprint});
        groups.push({key,fingerprint,document:native});options.push({target:clone(target),variants:prepared.variants,extras:prepared.extras});
        for(const item of collected){item.entry.productKey=key;item.entry.nativeDesignId=item.template.id;if(previews){const preview=workshop.editorPreview(native,item.template.id);previewBytes+=Buffer.byteLength(preview.svg);if(previewBytes>GALLERY_ASSIGNMENT_LIMITS.previewBytes)fail(422,'Die Vorschauen überschreiten 8 MiB. Bitte kleinere Stapel auswählen.','gallery_assignment_limit');item.entry.previewSvg=preview.svg;}}
      }catch(error){if(error.code==='gallery_assignment_limit')throw error;for(const item of collected){item.entry.status='blocked';item.entry.reason=error.message;delete item.entry.previewSvg;}}
    }
    const counts={create:entries.filter(e=>e.status==='create').length,existing:entries.filter(e=>e.status==='existing').length,blocked:entries.filter(e=>e.status==='blocked').length};
    const signature=hash({input,evidence,groups:groups.map(g=>({key:g.key,fingerprint:g.fingerprint})),entries:entries.map(({previewSvg,...e})=>e),options});
    return {input:clone(input),evidence,groups,public:{id:'gap_'+signature.slice(0,32),planHash:signature,valid:counts.blocked===0,counts,entries,options,limits:GALLERY_ASSIGNMENT_LIMITS,localOnly:true,published:false}};
  }
  function plan(input){pending=compile(input);return clone(pending.public);}
  function execute(input){
    strict(input,['planId','planHash']);const current=pending;
    if(!current||input.planId!==current.public.id||input.planHash!==current.public.planHash)fail(409,'Der Plan ist nicht mehr aktuell. Bitte die Auswahl neu prüfen.');
    if(!current.public.valid)fail(422,'Offene Zielvorlagen zuerst klären oder aus der Auswahl entfernen.');
    const prior=current.groups.map(g=>repository.importItem(g.key));
    if(prior.some(Boolean)&&!prior.every((p,i)=>p?.fingerprint===current.groups[i].fingerprint))fail(409,'Zuordnung wurde zwischenzeitlich geändert. Bitte neu planen.');
    let saved=[],replayed=current.groups.length>0&&prior.every(Boolean);
    if(!replayed){
      const guard=()=>{
        let checked;
        try{checked=compile(current.input,{previews:false});}catch(error){fail(409,'Der Plan ist nicht mehr gültig: '+error.message+' Bitte neu planen.');}
        if(checked.public.planHash!==current.public.planHash)fail(409,'Quelle, Familie, Angebot oder Zielbestand wurde geändert. Bitte neu planen.');
      };
      guard();if(current.groups.length)saved=repository.importBatch(current.groups,{beforeWrite:guard});
    }
    const keys=new Set(current.groups.map(g=>g.key)),registered=registrations().filter(r=>keys.has(r.productKey));
    for(const g of current.groups){const stored=repository.importItem(g.key);if(!stored||stored.fingerprint!==g.fingerprint||!same(repository.get(stored.id,{revision:1}).document,g.document))fail(409,'Die native Zuordnung wurde nicht vollständig zurückgelesen.');}
    return {created:saved.filter(r=>r.created).length,createdTargets:replayed?0:registered.length,existing:current.public.counts.existing,targets:registered,replayed,localOnly:true,published:false,approved:false};
  }
  return {context,plan,execute,registrations};
}
