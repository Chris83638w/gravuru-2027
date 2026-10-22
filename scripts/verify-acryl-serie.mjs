import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';import assert from 'node:assert/strict';
import {createWorkshop} from '../app/workshop/http.mjs';import {formProductPreview} from '../app/workshop/form-product-preview.mjs';import {validateFormDesigns} from '../app/workshop/form-designs.mjs';import {initialFormCustomerState,resolveFormCustomer} from '../app/workshop/form-customer-model.mjs';
const CODE=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),ROOT=path.resolve(CODE,'../..'),OUT=path.join(ROOT,'outputs/Acryl-Serie-2027');
const manifest=JSON.parse(await fs.readFile(path.join(OUT,'Anlageregister.json'),'utf8')),seed=JSON.parse(await fs.readFile(path.join(CODE,'app/configurator/variant-m/.preview/models.json'),'utf8'))[0];
const w=createWorkshop({filename:path.join(CODE,'.local-data/acryl-serie/workshop.sqlite'),seedConfig:seed.universal,legacy:seed.legacy});
const group=w.variants.get(manifest.group.id),options=w.variants.options(group.id,group.revision);assert.equal(options.variants.length,798);
for(const v of options.variants){const selected=w.variants.select(group.id,group.revision,v.id);assert.equal(selected.productId,v.productId);assert.equal(selected.productRevision,v.productRevision);assert.equal(selected.basePriceCents,v.basePriceCents);}
for(const change of [d=>d.variants[0].choices.color='missing',d=>d.variants[1].choices={...d.variants[0].choices},d=>d.variants[0].productRevision=99,d=>d.axes[0].values.push({...d.axes[0].values[0]})]){const invalid=structuredClone(group.document);change(invalid);assert.throws(()=>w.variants.validate(invalid));}
const source=manifest.records.find(r=>r.sku==='TS-Acryl-RE-150X100-T30-SW-K00'),record=w.repository.get(source.id),fonts=w.fonts.resources();assert.equal(record.document.designs.length,40);
const renders=[];let warnings=[];
for(const design of record.document.designs){
 const state=initialFormCustomerState(design),resolved=resolveFormCustomer(record.document,design.id,state,{assets:w.assets,fonts});warnings.push(...resolved.warnings.map(warning=>({design:design.id,warning})));
 const svg=formProductPreview(record.document,{assets:w.assets,contours:w.contours,fonts,designId:design.id}),filename=design.id+'.svg';await fs.writeFile(path.join(OUT,'Vorschau',filename),svg);renders.push(filename);
}
const modified=initialFormCustomerState(record.document.designs[0]);modified.fields[0].text='Koch';assert.doesNotThrow(()=>resolveFormCustomer(record.document,record.document.designs[0].id,modified,{assets:w.assets,fonts}));
const invalid=structuredClone(record.document);invalid.designs[0].fields[0].sizeMm=NaN;assert.throws(()=>validateFormDesigns(invalid));
const fractional=structuredClone(record.document);fractional.designs[0].fields[0].sizeMm=4.125;assert.doesNotThrow(()=>validateFormDesigns(fractional));
for(const r of manifest.records.filter(r=>r.mounting==='B02'&&r.color==='AN').slice(0,1)){const doc=w.repository.get(r.id).document;await fs.writeFile(path.join(OUT,'Vorschau','Anthrazit-mit-Bohrungen.svg'),formProductPreview(doc,{assets:w.assets,contours:w.contours,fonts}));}
await fs.writeFile(path.join(OUT,'Funktionspruefung.json'),JSON.stringify({variantSelection:798,invalidChoiceRejected:true,duplicateChoiceRejected:true,staleProductRevisionRejected:true,duplicateAxisValueRejected:true,originalEditableDesigns:40,editedNameValidated:true,fractionalFontSizesPreserved:true,warnings,renderedDesigns:renders,scope:'Servermodelle und gespeicherte Entwürfe; Browserprüfung separat'},null,2));
w.close();console.log(JSON.stringify({variants:798,rendered:renders.length,fieldWarnings:warnings}));
