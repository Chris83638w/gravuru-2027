import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {build} from '../configurator/variant-m/build.mjs';
import {cleanObject,quote,selectedProfile} from '../configurator/variant-m/contract.mjs';
import {photoBackgroundChoice} from '../configurator/variant-m/photo-upload.mjs';
import {exportSettings} from '../configurator/variant-m/print-export-model.mjs';
import {createAcrylicPrintProof} from './acrylic-print-proof.mjs';
import {prepareAcrylicReview,validateAcrylicReview} from './acrylic-review.mjs';
import {importEnvironment} from './design-assets.mjs';
import {createWorkshop} from './http.mjs';
import {katalogDesignToTemplate} from './katalog-convert.mjs';
import {NATIVE_REVIEW} from './native-review-schema.mjs';
import {makeProductDocument} from './product-model.mjs';
import {familyProductConfig,validateFamily} from './product-families.mjs';
import {digest,readReviewPackage} from './review-package.mjs';

const samplePng='iVBORw0KGgoAAAANSUhEUgAAACgAAAA8CAIAAACb22+3AAAAOklEQVR4nO3NIQEAMAgAsPOEaDT9M9ABg9kKLLL6Xfgnq1gsFovFYrFYLBaLxWKxWCwWi8VisVgsXhqq4AGG9djEFQAAAABJRU5ErkJggg==';
const size={key:'BSUV-AD-30X20',groupKey:'RE',label:'30 × 20 cm',widthMm:300,heightMm:200,baseCents:2999,mounting:['KGL','B02-E8-D4']};
const family={
 schema:'gravuru-product-family/v2',id:'alu-dibond-30x20',name:'Alu-Dibond 30 × 20',
 material:{kind:'aluDibond',label:'Alu-Dibond',thicknessMm:3,processingProfileId:'color-print'},
 designArea:{marginMm:0,keepoutMm:1},groups:[{key:'RE',name:'Rechteck',shape:'rect',cornerRadiusMm:0}],
 mountingRules:[
  {id:'KGL',label:'Kleben glatt',layout:'none',count:0,diameterMm:null,edgeMm:null,priceCents:299,skuSuffix:'KGL'},
  {id:'B02-E8-D4',label:'Zwei Bohrlöcher',layout:'left-right',count:2,diameterMm:4,edgeMm:8,priceCents:249,skuSuffix:'B02'}
 ],
 sizes:[size],withoutMounting:true,fonts:['Montserrat'],briefingNotes:'Synthetische Druckprüfung.'
};

const fields={'text-1':{required:false},'foto-1':{required:false,photoBackgroundDefault:'keep'},
 'foto-2':{required:false,photoBackgroundDefault:'remove'},'foto-3':{required:false}};
const svg='<svg xmlns="http://www.w3.org/2000/svg" width="300mm" height="200mm" viewBox="0 0 300 200">'+
 '<g id="text-1" data-feld="name"><text x="150" y="95" font-family="Montserrat" font-size="8" text-anchor="middle" fill="#2a4768">Muster</text></g>'+
 ['foto-1','foto-2','foto-3'].map((id,index)=>'<g id="'+id+'"><rect x="'+(20+index*80)+'" y="20" width="45" height="40"/></g>').join('')+'</svg>';

test('Alu-Dibond-Familie baut einen weißen, vorderseitigen Druckträger mit dem bestehenden Variantenvertrag',()=>{
 validateFamily(family);
 const config=familyProductConfig(family,size,1),record=makeProductDocument(config);
 assert.deepEqual(record.config.profile.material,{kind:'aluDibond',color:'#ffffff',thicknessMm:3});
 assert.equal(record.config.profile.processing.profileId,'color-print');
 assert.equal(record.config.profile.features.productionConfirmed,false);
 assert.deepEqual(selectedProfile(config,{mounting:'B02'}).geometry.holes.map(h=>[h.x,h.y,h.diameter]),[[8,100,4],[292,100,4]]);
 assert.equal(quote(record.config,[],'start',{mounting:'KGL'}).unitCents,3298);
 const invalid=structuredClone(family);
 invalid.material.processingProfileId='acrylic-engraving';
 assert.throws(()=>validateFamily(invalid),/Farbdruck auf der Vorderseite/);
});

test('Fotofeld-Vorgaben werden importiert, gespeichert und erst durch die Kundenwahl überschrieben',()=>{
 const config=familyProductConfig(family,size,1),fonts=config.localResources.fonts;
 const source={id:'BSUV-TEST',name:'Lokales Druckmuster',source:'test',fields,themes:[]};
 const {template}=katalogDesignToTemplate(source,family,null,{fonts,svgText:svg});
 const slots=template.objects.filter(o=>o.type==='photoSlot');
 assert.deepEqual(slots.map(o=>o.photoBackgroundDefault),['keep','remove',undefined]);
 assert.deepEqual(slots.map(photoBackgroundChoice),['keep','remove','remove']);
 const picked={...slots[0],uxUploadKind:'photo',uxUploadId:'original',uxPhotoBackground:'remove'};
 assert.equal(photoBackgroundChoice(picked),'remove');
 assert.equal(cleanObject(picked).photoBackgroundDefault,'keep');
 assert.equal(cleanObject(picked).uxPhotoBackground,'remove');
 const invalid={...source,fields:{...fields,'foto-1':{photoBackgroundDefault:'always'}}};
 assert.throws(()=>katalogDesignToTemplate(invalid,family,null,{fonts,svgText:svg}),/photoBackgroundDefault/);
 const textRule={...source,fields:{...fields,'text-1':{photoBackgroundDefault:'keep'}}};
 assert.throws(()=>katalogDesignToTemplate(textRule,family,null,{fonts,svgText:svg}),/Fotofeld/);
 const plateSvg=svg.replace('<g id="text-1"', '<g id="deko-1"><path fill="#1f1f1f" d="M-1.4999 -1.5H301.5V201.5001H-1.4999Z"/></g>'+
  '<g id="deko-2"><path fill="#000000" d="M0 0 L300 0 L300 200 L0 200 Z"/></g><g id="text-1"');
 const painted=katalogDesignToTemplate(source,family,null,{fonts,svgText:plateSvg});
 assert.deepEqual(painted.motifs.map(motif=>motif.bounds),[[0,0,300,200],[0,0,300,200]]);
 assert.match(painted.motifs[1].svgFragment,/fill="#000000"/);
 config.profile.designs=[painted.template];
 config.profile.defaultDesignId=painted.template.id;
 config.localResources.motifs=painted.motifs;
 config.photo.enabled=true;
 assert.match(makeProductDocument(config).config.localResources.motifs[1].svgFragment,/fill="#000000"/);
 painted.motifs[1].svgFragment=painted.motifs[1].svgFragment.replace('#000000','url(https://example.invalid)');
 assert.throws(()=>makeProductDocument(config),/nicht erlaubte Inhalte/);
});

test('der native Prüfstand liefert vollflächiges RDG_WHITE mit 1,5 mm Beschnitt und blauer Schnittkontur',async t=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'g27-alu-dibond-'));
 build({outputDirectory:directory});
 const [seed]=JSON.parse(fs.readFileSync(path.join(directory,'models.json'),'utf8'));
 const w=createWorkshop({filename:':memory:',seedConfig:seed.universal,legacy:seed.legacy});
 t.after(()=>{w.close();fs.rmSync(directory,{recursive:true,force:true});});
 const config=familyProductConfig(family,size,1);
 const {template}=katalogDesignToTemplate({id:'BSUV-TEST',name:'Lokales Druckmuster',source:'test',fields,themes:[]},family,null,{fonts:config.localResources.fonts,svgText:svg});
 config.photo.enabled=true;
 config.profile.designs=[template];
 config.profile.defaultDesignId=template.id;
 const example=await w.assets.importPhotoExample({bytes:samplePng,widthMm:45,heightMm:40});
 config.localResources.photoExamples=[{designId:template.id,slotId:'foto-2',assetId:example.assetId}];
 const record=w.repository.create(makeProductDocument(config));
 const model=w.model(record.id,record.revision).universal;
 const input={productId:record.id,productRevision:record.revision,designId:template.id,
  objects:structuredClone(model.profile.designs[0].objects),options:{mounting:'K00'},quantity:1,media:[],preview:samplePng};
 const forged=structuredClone(input);
 forged.objects.find(o=>o.id==='foto-1').photoBackgroundDefault='remove';
 assert.throws(()=>validateAcrylicReview(record,model,forged),/Vorauswahl gehört zur Vorlage/);
 const proof=await prepareAcrylicReview({record,config:model,input,assets:w.assets});
 const {files}=readReviewPackage(proof.package,proof.manifest.packageSha256,NATIVE_REVIEW);
 assert.ok(files.has('quellen/'+example.assetId+'-vorschau.svg'));
 assert.equal(proof.manifest.product.material.kind,'aluDibond');
 const saved=JSON.parse(files.get('produkt-und-gestaltung.json'));
 assert.equal(saved.state.design.objects.find(o=>o.id==='foto-1').photoBackgroundDefault,'keep');
 const result=await createAcrylicPrintProof(proof.package,proof.manifest.packageSha256);
 assert.equal(result.metadata.edgeInk,false,'Vollweiß hat auch bei randfreier Gestaltung Beschnitt');
 assert.equal(result.metadata.settings.white,'full');
 assert.equal(result.metadata.settings.mirror,false);
 assert.equal(result.metadata.settings.whiteBleedMm,1.5);
 assert.equal(result.metadata.productionReady,false);
 const printFiles=readReviewPackage(result.archive,digest(result.archive),NATIVE_REVIEW).files;
 assert.doesNotMatch(printFiles.get('gesicherte-gestaltung.svg').toString(),/data-field="photo-foto-2"/);
 const inspection=execFileSync(process.env.GRAVURU_PYTHON||'python3',['-c',`import json, sys, pymupdf as fitz
d = fitz.open(stream=sys.stdin.buffer.read(), filetype='pdf')
page, k = d[0], 72/25.4
layers = d.get_ocgs()
objs = '\\n'.join(d.xref_object(i) for i in range(1,d.xref_length()))
white = [i for i, v in layers.items() if v['name']=='RDG_WHITE']
d.set_layer(-1, on=white, off=[i for i in layers if i not in white])
solo = fitz.open(stream=d.tobytes(), filetype='pdf')
pix = solo[0].get_pixmap(alpha=True)
print(json.dumps({'page': [round(page.rect.width/k,3),round(page.rect.height/k,3)],
 'trim': [round(page.trimbox.width/k,3),round(page.trimbox.height/k,3)],
 'white': '/Separation /RDG_WHITE /DeviceCMYK' in objs, 'corner':pix.pixel(1,1)[-1],
 'blueCut': '/Separation /CutContour /DeviceRGB' in objs and '/C1 [ 0 0 1 ]' in objs,
 'cutStroke': '0.2 w' in page.read_contents().decode('ascii')}))`],{input:result.pdf,env:importEnvironment()}).toString().trim();
 assert.deepEqual(JSON.parse(inspection),{page:[303,203],trim:[300,200],white:true,corner:255,blueCut:true,cutStroke:true});
 assert.throws(()=>exportSettings({width:300,height:200},{bleedMm:1.5,whiteBleedMm:1.5}),/Exporteinstellungen/);
});
