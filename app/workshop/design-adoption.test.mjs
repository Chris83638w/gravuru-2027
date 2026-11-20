// Auftrag #265 (Weg A): Ein weiteres Design desselben Produktstands wird im laufenden Editor
// aufgenommen. Die beiden Modelle kommen aus derselben Verkleinerung wie im Shop (shopStartModel).
import test from 'node:test';
import assert from 'node:assert/strict';
import {shopStartModel} from './shop-start-model.mjs';
import {prepareConfig,quote,selectedProfile} from '../configurator/variant-m/contract.mjs';
import {adoptDesignModel,canAdoptDesigns,planDesignAdoption} from '../configurator/variant-m/design-adoption.mjs';
import {attach} from '../configurator/variant-m/lazy-resources.mjs';
import {motifChoices} from '../configurator/variant-m/profile-selection.mjs';
import {customerMotifs} from '../configurator/variant-m/customer-motifs.mjs';
import {doorSignConfig} from './test-fixtures/door-sign-all-sizes.mjs';

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

// Original der Werkstattvorlage „Zwei Zeilen mit Trennlinie“, 80 × 50 mm.
const divider={
 key:'katalog-TAE-V2A-8x5-D3-motiv-1',embeddedOnly:true,bounds:[7,24.552,66,0.379],
 svgFragment:'<path d="M 7.000 24.552 L 73.000 24.552 L 73.000 24.931 L 7.000 24.931 Z" fill="currentColor" fill-rule="evenodd"/>'
};
function mountedRegistry(){
 const entries=[{key:'herz',name:'Herz',category:'Bibliothek'}],excluded=new Set();
 const el={ownerDocument:{defaultView:{GravuruTemplateOnlyMotifKeys:excluded}},motifs:{},catalog:{motifs:{},motif_bounds:{}},labels:{}};
 attach(el,{catalog:{motif_index:entries},entries});
 return {el,entries,excluded};
}

test('D3 übernimmt Originalpfad und Grenzen in laufenden Renderer und beide Modellkopien; das Motiv bleibt vorlagengebunden',()=>{
 const {a,b,second}=setup(),editor=prepareConfig(a),{el,entries,excluded}=mountedRegistry();
 const liveMotifs=a.localResources.motifs,editorMotifs=editor.localResources.motifs;
 b.localResources.motifs.push(structuredClone(divider));
 const commitGallery=planDesignAdoption(a,b,second);
 assert.equal(adoptDesignModel(editor,prepareConfig(b),second,el.uxRegisterTemplateMotifs),true);
 assert.equal(commitGallery(),true);
 for(const [model,held] of [[a,liveMotifs],[editor,editorMotifs]]){
  assert.equal(model.localResources.motifs,held);
  assert.deepEqual(held.find(m=>m.key===divider.key),divider);
 }
 assert.equal(el.motifs[divider.key],divider.svgFragment);
 assert.equal(el.catalog.motifs[divider.key],divider.svgFragment);
 assert.deepEqual(el.catalog.motif_bounds[divider.key],divider.bounds);
 assert.deepEqual(customerMotifs(a,el.motifs,el.catalog),[divider]);
 assert.deepEqual(motifChoices(entries,null,excluded).map(m=>m.key),['herz']);
 assert.equal(adoptDesignModel(editor,prepareConfig(b),second,el.uxRegisterTemplateMotifs),false);
 assert.equal(entries.filter(m=>m.key===divider.key).length,1);
});

test('ein belegter Rendererschlüssel verwirft die gesamte Übernahme vor jeder Änderung',()=>{
 const {a,b,second}=setup(),editor=prepareConfig(a),{el,entries,excluded}=mountedRegistry();
 b.localResources.motifs.push(structuredClone(divider),{...divider,key:'herz'});
 const initial=structuredClone([a,editor]),updateGallery=planDesignAdoption(a,b,second);
 assert.throws(()=>{adoptDesignModel(editor,prepareConfig(b),second,el.uxRegisterTemplateMotifs);updateGallery();},/eindeutig registriert/);
 assert.deepEqual([a,editor],initial);
 assert.deepEqual(el.catalog.motifs,{});assert.equal(excluded.size,0);assert.equal(entries.length,1);
});

test('abweichende Quellen, private Bildverweise und fehlende Eingangsregister behalten den bisherigen Wechsel',()=>{
 const {a,b,second}=setup();
 const check=(change)=>{
  const target=structuredClone(a),source=structuredClone(b);
  source.localResources.motifs.push(structuredClone(divider));change(target.localResources,source.localResources);
  const initial=structuredClone(target);
  assert.throws(()=>adoptDesignModel(target,source,second),{code:'design_adoption_refused'});
  assert.deepEqual(target,initial);
 };
 check((current)=>current.motifs.push({...divider,bounds:[0,0,66,1]}));
 check((current,incoming)=>{incoming.motifs.at(-1).svgFragment='<image href="/intern/quelle.svg"/>';});
 check((current,incoming)=>{incoming.photoExamples=[{designId:second}];});
 check(current=>{delete current.motifs;});
});
