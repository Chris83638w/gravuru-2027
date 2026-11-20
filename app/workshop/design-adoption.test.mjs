// Auftrag #265 (Weg A): Ein weiteres Design desselben Produktstands wird im laufenden Editor
// aufgenommen. Die beiden Modelle kommen aus derselben Verkleinerung wie im Shop (shopStartModel).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {familyProductConfig} from './product-families.mjs';
import {shopStartModel} from './shop-start-model.mjs';
import {measureText} from '../platform/sources/app/shared/models/doorbell-preview.mjs';
import {prepareConfig,quote,selectedProfile} from '../configurator/variant-m/contract.mjs';
import {FAMILY_FORMATS_SCHEMA} from '../configurator/variant-m/family-formats.mjs';
import {adoptDesignModel,canAdoptDesigns} from '../configurator/variant-m/design-adoption.mjs';

// Gleiche Vorlage wie shop-design-gallery-alle.test.mjs: echte Katalogmaße und -preise, drei Formate, je zwei Designs.
function doorSignConfig(){
 const f=JSON.parse(fs.readFileSync(new URL('./test-fixtures/acryl3-rear/steel.json',import.meta.url))),formats=[],designs=[];let c;
 const chosen=f.sizes.filter((s,i,list)=>s.groupKey==='AB'&&s.widthMm===120&&s.heightMm===80||list.findIndex(a=>a.groupKey===s.groupKey)===i).slice(0,3);
 for(const s of chosen){
  const view={...f,groups:f.groups.filter(g=>g.key===s.groupKey),sizes:[s],mountingRules:f.mountingRules.filter(r=>s.mounting.includes(r.id))},n=familyProductConfig(view,s,1),p=n.profile;
  if(!c||s.groupKey==='AB'&&s.widthMm===120)c=n;
  const ids=[];
  for(const k of [1,2]){const d=structuredClone(p.designs[0]);d.id='ts-'+s.key+'-'+k;d.name='Design '+k;d.themes=['familienschilder'];d.katalog={designId:'TS-'+s.groupKey+'-D'+k,plateMm:[s.widthMm,s.heightMm]};const o=d.objects[0];Object.assign(o,{text:'Name '+k,fieldKey:'name',size:3.2,x:s.widthMm/2,y:s.heightMm/2});measureText(o,n.localResources.fonts);designs.push(d);ids.push(d.id);}
  formats.push({key:s.key,form:s.groupKey,label:s.label,geometry:structuredClone(p.geometry),variants:[{color:'steel',familyId:f.id,sizeKey:s.key,basePriceCents:s.baseCents,material:p.material,mounting:p.optionGroups[0].values,designIds:ids}]});
 }
 const start=formats.find(s=>s.form==='AB')||formats[0];
 c.familyFormats={schema:FAMILY_FORMATS_SCHEMA,defaultSize:start.key,defaultColor:'steel',colors:[{id:'steel',label:'steel'}],formats,designs,source:{shopProduct:{sizeKey:start.key,themeId:'familienschilder',defaultDesignId:designs.find(d=>start.variants[0].designIds.includes(d.id)).katalog.designId,groessenWahl:'alle'}}};
 c.profile.themeId='familienschilder';c.profile.defaultDesignId=start.variants[0].designIds[0];
 c.profile.optionGroups=[{id:'size',name:'Form & Größe',required:true,defaultValueId:start.key,values:formats.map(s=>({id:s.key,label:s.label,priceCents:0,currency:'EUR'}))},{id:'mounting',name:'Befestigung',required:true,defaultValueId:'K00',values:[{id:'K00',label:'Ohne',priceCents:0,currency:'EUR'}]}];
 c.workshopElementRights=Object.fromEntries(designs.map(d=>[d.id,{[d.objects[0].id]:{content:true,move:true,scale:true,delete:true}}]));
 delete c.familyAcrylic;return prepareConfig(c);
}
function setup(){
 const full=doorSignConfig(),f=full.familyFormats,start=f.defaultSize,other=f.formats.find(s=>s.key!==start).key;
 const model={key:'acryl',name:'Türschild Edelstahl',configuration:{id:'cfg_ts',revision:1},universal:full,legacy:{designs:structuredClone(full.profile.designs),defaultDesignId:full.profile.defaultDesignId}};
 const first='ts-'+start+'-1',second='ts-'+start+'-2';
 return {full,start,other,first,second,a:shopStartModel(model,first).universal,b:shopStartModel(model,second).universal};
}
const ids=profile=>profile.designs.map(d=>d.id);

test('Shop-Modelle zweier Designs desselben Produktstands unterscheiden sich nur in den Design-Teilen',()=>{
 const {a,b,first,second}=setup();
 assert.deepEqual(ids(a.profile),[first]);assert.deepEqual(ids(b.profile),[second]);
 const strip=u=>{const c=structuredClone(u);delete c.profile.designs;delete c.profile.defaultDesignId;delete c.workshopElementRights;delete c.familyFormats.designs;delete c.familyFormats.source;for(const s of c.familyFormats.formats)for(const v of s.variants)delete v.designIds;return c;};
 assert.deepEqual(strip(a),strip(b));
});

test('das nachgeholte Design steht danach in jedem Format bereit und entspricht dem vollständigen Produkt',()=>{
 const {full,start,other,first,second,a,b}=setup(),editor=prepareConfig(a),options={size:start,mounting:'K00'};
 assert.ok(canAdoptDesigns(editor));
 assert.deepEqual(ids(selectedProfile(editor,options)),[first]);
 assert.equal(adoptDesignModel(editor,prepareConfig(b),second),true);
 assert.deepEqual(ids(selectedProfile(editor,options)),[first,second]);
 // Gleiche Vorlage, gleiche Rechte und gleicher Preis wie im vollständigen Produkt.
 const pick=(config,id,o=options)=>selectedProfile(config,o).designs.find(d=>d.id===id);
 assert.deepEqual(pick(editor,second),pick(full,second));
 assert.deepEqual(pick(editor,first),pick(full,first));
 assert.deepEqual(editor.workshopElementRights[second],full.workshopElementRights[second]);
 for(const id of [first,second])assert.equal(quote(editor,[],id,options).unitCents,quote(full,[],id,options).unitCents);
 // Ein Größenwechsel findet beide Designs auch im anderen Format.
 const elsewhere={size:other,mounting:'K00'};
 assert.deepEqual(ids(selectedProfile(editor,elsewhere)),['ts-'+other+'-1','ts-'+other+'-2']);
 assert.deepEqual(pick(editor,'ts-'+other+'-2',elsewhere),pick(full,'ts-'+other+'-2',elsewhere));
 assert.equal(editor.profile.defaultDesignId,first,'das Startdesign bleibt unverändert');
 // Ein zweiter Aufruf ändert nichts mehr.
 const before=JSON.stringify(editor);
 assert.equal(adoptDesignModel(editor,prepareConfig(b),second),false);assert.equal(JSON.stringify(editor),before);
});

test('auch das unvorbereitete Modell der Shop-Seite nimmt das Design auf',()=>{
 const {a,b,first,second}=setup();
 assert.equal(adoptDesignModel(a,b,second),true);
 assert.deepEqual(ids(a.profile),[first,second]);
 assert.deepEqual(ids(selectedProfile(prepareConfig(a))),[first,second]);
});

test('bei jeder anderen Abweichung wird nichts übernommen und das laufende Modell bleibt unverändert',()=>{
 const refused={code:'design_adoption_refused'};
 const attempt=(change,designId)=>{const {a,b,second}=setup(),before=JSON.stringify(a);change(b,a);assert.throws(()=>adoptDesignModel(a,b,designId??second),refused);assert.equal(JSON.stringify(a),before);};
 attempt(b=>{b.familyFormats.formats[0].variants[0].basePriceCents+=100;});
 attempt(b=>{b.familyFormats.formats[1].variants[0].mounting=[];});
 attempt(b=>{b.familyFormats.formats[0].geometry.width+=1;});
 attempt(b=>{b.familyFormats.formats.pop();});
 attempt(b=>{b.familyFormats.defaultSize=b.familyFormats.formats[1].key;});
 attempt(b=>{b.profile.id+='-x';});
 attempt(b=>{b.quantityTiers=[{from:5,percent:10}];});
 attempt(b=>{b.familyFormats.formats[0].variants[0].designIds.push('unbekannt');});
 attempt((b,a)=>{b.familyFormats.designs.push({...structuredClone(a.familyFormats.designs[0]),name:'verändert'});});
 attempt((b,a)=>{const id=Object.keys(a.workshopElementRights)[0];b.workshopElementRights[id]={x:{content:false}};});
 attempt(()=>{},'nicht-im-modell');
 const {a,b,second}=setup();
 assert.throws(()=>adoptDesignModel({profile:{id:'p',designs:[]}},b,second),refused);
 assert.throws(()=>adoptDesignModel(a,{profile:b.profile},second),refused);
});
