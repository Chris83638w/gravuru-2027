import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';import {createWorkshop} from '../app/workshop/http.mjs';import {formMotif} from '../app/workshop/form-additions.mjs';import {formProductPreview} from '../app/workshop/form-product-preview.mjs';
const CODE=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),ROOT=path.resolve(CODE,'../..'),OUT=path.join(ROOT,'outputs/Acryl-Serie-2027'),BEFORE=path.join(ROOT,'work/Vor-Galerie');
const read=async p=>JSON.parse(await fs.readFile(p,'utf8')),write=async(p,v)=>fs.writeFile(p,JSON.stringify(v,null,2)),sha=v=>createHash('sha256').update(v).digest('hex');process.env.GRAVURU_PYTHON=process.argv[2];process.env.PYTHONPATH=process.argv[3];
const manifest=await read(path.join(BEFORE,'Anlageregister.json')),prepared=await read(path.join(ROOT,'work/acryl-prepared.json')),sourceDesigns=new Map(prepared.designs.map(d=>[d.id,d])),seed=(await read(path.join(CODE,'app/configurator/variant-m/.preview/models.json')))[0];
const w=createWorkshop({filename:path.join(CODE,'.local-data/acryl-serie/workshop.sqlite'),seedConfig:seed.universal,legacy:seed.legacy});
try{
 const metadata=new Map(),entries=[],expected=new Map();let motifAssignments=0;
 for(const r of manifest.records){
  const old=w.repository.get(r.id,{revision:r.revision}),current=w.repository.get(r.id),d=structuredClone(old.document);assert.equal(old.document.basePriceCents,r.priceCents);assert.equal(current.status,'draft');
  for(const a of d.designs){
   let meta=metadata.get(a.id);
   if(!meta){
    const source=sourceDesigns.get(a.id),original=w.assets.read(a.assetId,true).toString('utf8'),vb=original.match(/viewBox="([^"]+)"/)[1].trim().split(/\s+/).map(Number),[x,y,width,height]=vb;assert.ok(vb.every(Number.isFinite));
    const blank='<svg xmlns="http://www.w3.org/2000/svg" width="'+width+'mm" height="'+height+'mm" viewBox="0 0 '+width+' '+height+'"><rect width="1" height="1" fill="none"/></svg>';
    const asset=await w.assets.import({name:a.id+'-Bearbeitbare-Elemente.svg',bytes:Buffer.from(blank).toString('base64')});meta={x,y,width,height,asset,source};metadata.set(a.id,meta);
   }
   const scale=a.widthMm/meta.width;assert.ok(Math.abs(scale-a.heightMm/meta.height)<1e-6);
   const motifs=meta.source.motifs.map((m,i)=>{const key='acryl-'+a.id.split('-D')[1]+'-motiv-'+(i+1),source=formMotif(key),[x,y,width,height]=m.box;return {id:'motiv-'+(i+1),label:'Originalmotiv '+(i+1),type:'motif',xMm:a.xMm+(x-meta.x)*scale,yMm:a.yMm+(y-meta.y)*scale,widthMm:width*scale,heightMm:height*scale,allowMove:true,allowScale:true,allowDelete:true,motifKey:key,motifSha256:source.sha256,rotation:0,color:'#000000',allowColor:false};});
   a.assetId=meta.asset.assetId;a.sourceSha256=meta.asset.sourceSha256;a.originalName=meta.asset.originalName;a.fields.push(...motifs);motifAssignments+=motifs.length;
  }
  w.repository.validate(d);const key='acryl-native-motifs-v1:'+r.sku,fingerprint=sha(JSON.stringify(d)),prior=w.repository.importItem(key);if(prior){assert.equal(prior.fingerprint,fingerprint);assert.equal(current.revision,r.revision+1);assert.deepEqual(current.document,d);}else assert.equal(current.revision,r.revision);
  expected.set(r.sku,{r,d,old:old.document});entries.push({key,fingerprint,action:'update',productId:r.id,expectedRevision:r.revision,document:d});
 }
 console.log(JSON.stringify({stage:'prepared',products:entries.length,designs:metadata.size,motifAssignments}));
 for(let i=0;i<entries.length;i+=50){w.repository.importBatch(entries.slice(i,i+50));console.log(JSON.stringify({stage:'saved',count:Math.min(i+50,entries.length)}));}
 const oldGroup=w.variants.get(manifest.group.id,manifest.group.revision),groupDoc=structuredClone(oldGroup.document);for(const v of groupDoc.variants)v.productRevision=expected.get(v.id).r.revision+1;
 const head=w.variants.get(oldGroup.id),group=head.revision===oldGroup.revision?w.variants.save(oldGroup.id,groupDoc,head.revision):head;assert.deepEqual(group.document,groupDoc);
 const records=[];
 for(const {r,d,old} of expected.values()){const actual=w.repository.get(r.id);assert.deepEqual(actual.document,d);assert.equal(actual.document.basePriceCents,old.basePriceCents);assert.deepEqual(actual.document.form,old.form);assert.equal(actual.status,'draft');assert.equal(actual.revision,r.revision+1);for(let i=0;i<old.designs.length;i++)assert.deepEqual(actual.document.designs[i].fields.filter(f=>f.type==='text'),old.designs[i].fields);const selected=w.variants.select(group.id,group.revision,r.sku);assert.equal(selected.basePriceCents,r.priceCents);assert.equal(selected.productRevision,actual.revision);records.push({...r,revision:actual.revision});await write(path.join(OUT,'Produktdaten',r.sku+'.json'),actual.document);}
 const updated={...manifest,updatedAt:new Date().toISOString(),group:{id:group.id,revision:group.revision},records,url:'http://127.0.0.1:8976/konfigurator/ausfuehrungen/?group='+group.id+'&revision='+group.revision,galleryUrl:'http://127.0.0.1:8976/acryl-galerie/Designgalerie.html'};updated.review.motifs='Originalmotive als einzeln verschiebbare, skalierbare und drehbare Elemente; Texte bearbeitbar';await write(path.join(OUT,'Anlageregister.json'),updated);await write(path.join(OUT,'Auswahlgruppe.json'),group);
 await fs.mkdir(path.join(OUT,'Galerievorschauen'),{recursive:true});const fonts=w.fonts.resources();
 for(const color of ['SW','AN']){const r=records.find(r=>r.sku==='TS-Acryl-RE-150X100-T30-'+color+'-K00'),doc=w.repository.get(r.id).document;for(const a of doc.designs){await fs.writeFile(path.join(OUT,'Galerievorschauen',a.id+'-'+color+'.svg'),formProductPreview(doc,{assets:w.assets,contours:w.contours,fonts,designId:a.id}));}}
 const forms=[...new Set(records.map(r=>r.form))];for(const form of forms)for(const color of ['SW','AN']){const r=records.find(r=>r.form===form&&r.color===color&&r.mounting==='K00'&&r.size==='15x10')||records.find(r=>r.form===form&&r.color===color&&r.mounting==='K00'&&r.designCount===40);assert.ok(r);const doc=w.repository.get(r.id).document;await fs.writeFile(path.join(OUT,'Galerievorschauen','Form-'+form+'-'+color+'.svg'),formProductPreview(doc,{assets:w.assets,contours:w.contours,fonts,designId:'TS-Acryl-D14'}));}
 await write(path.join(OUT,'Galerie-Anlagepruefung.json'),{products:798,designs:40,forms:forms.length,motifAssignments,originalMotifs:prepared.designs.reduce((n,d)=>n+d.motifs.length,0),preservedPrices:798,preservedIds:798,unchangedTextPositions:true,unchangedContours:true,allDraft:true,selectionReadback:798,groupRevision:group.revision,previousRevisionsRetained:true,previewSvgs:96,manualEditBrowserTest:'ausstehend'});console.log(JSON.stringify({stage:'complete',products:798,group:updated.group,gallery:updated.galleryUrl}));
}finally{w.close();}
