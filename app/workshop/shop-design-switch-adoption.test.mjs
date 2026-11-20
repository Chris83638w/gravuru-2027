// Auftrag #265 (Weg A): Die Shop-Seite liest das Modell eines weiteren Designs derselben Sitzung,
// ohne Sitzung, Rahmen oder Adresse zu wechseln. Jede Abweichung der Produktzuordnung wird abgelehnt.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createDesignSwitch,universalWithDesignParts,mergeDesignParts} from './ui/shop-design-switch.mjs';
import {shopStartModel,shopDesignParts,shopDesignBase} from './shop-start-model.mjs';
import {planDesignAdoption} from '../configurator/variant-m/design-adoption.mjs';
import {doorSignModel} from './test-fixtures/door-sign-all-sizes.mjs';

const binding={productId:'cfg_ts',productRevision:4,shopifyProductId:'gid://shopify/Product/1',shopifyVariantId:'gid://shopify/ProductVariant/11'};
const model=designId=>({editorPath:'/_merchant-editor.html',binding:{...binding},model:{name:'Türschild',configuration:{id:'cfg_ts',revision:4},universal:{profile:{designs:[{id:designId}]}},legacy:{}}});
function fixture(answer,fragment='s=gse1.a.b'){
 const calls=[],replaced=[],appended=[];
 const win={location:{origin:'https://test.example'},history:{replaceState(...args){replaced.push(args);}},addEventListener(){},removeEventListener(){},setTimeout,clearTimeout};
 const frame={style:{},contentWindow:{},remove(){}};
 const client={loadModel:async id=>{calls.push(['loadModel',id]);return answer(id);},switchDesign:async()=>{calls.push(['switchDesign']);throw Error('nicht erwartet');},loadDesignGallery:async()=>({items:[]})};
 let api,active;
 createDesignSwitch({initial:{client,data:model('d1'),resources:{},frame},fragment:new URLSearchParams(fragment),container:{append(node){appended.push(node);}},activate:(entry,a)=>{active=entry;api=a;},toDataUrl:async()=>'',win,doc:{createElement(){throw Error('kein neuer Rahmen erwartet');}}});
 return {api,calls,replaced,appended,frame,active:()=>active};
}

test('liest das Modell des weiteren Designs mit derselben Sitzung und lässt Rahmen, Sitzung und Adresse unverändert',async()=>{
 const f=fixture(id=>model(id)),before=f.active();
 const loaded=await f.api.loadDesign('d2');
 assert.deepEqual(loaded.universal.profile.designs.map(d=>d.id),['d2']);
 assert.deepEqual(f.calls,[['loadModel','d2']]);
 assert.equal(f.active(),before);assert.equal(f.active().frame,f.frame);
 assert.deepEqual(f.replaced,[]);assert.deepEqual(f.appended,[]);
 assert.equal(f.api.canGoBack(),false);
});

test('lehnt ein Modell mit anderer Produktzuordnung, anderem Produktstand oder ohne das Design ab',async()=>{
 const wrong=[
  id=>({...model(id),binding:{...binding,shopifyVariantId:'gid://shopify/ProductVariant/12'}}),
  id=>({...model(id),binding:{...binding,productRevision:5}}),
  id=>({...model(id),binding:{...binding,productId:'cfg_x'}}),
  id=>({...model(id),binding:{productId:binding.productId}}),
  id=>{const m=model(id);m.model.configuration.revision=5;return m;},
  id=>{const m=model(id);m.model.configuration.id='cfg_x';return m;},
  ()=>model('anderes-design')
 ];
 for(const answer of wrong){const f=fixture(answer);await assert.rejects(f.api.loadDesign('d2'),/Produktzuordnung|gehört nicht/);assert.deepEqual(f.appended,[]);assert.deepEqual(f.replaced,[]);}
 const failing=fixture(async()=>{throw Error('Sitzung abgelaufen');});
 await assert.rejects(failing.api.loadDesign('d2'),/Sitzung abgelaufen/);
});

test('beim Bearbeiten aus dem Warenkorb wird nichts nachgeholt: der Entwurf bleibt an sein Design gebunden',async()=>{
 for(const fragment of ['s=gse1.a.b&config=konfig_1&rev=2&line=abc','s=gse1.a.b&rev=2','s=gse1.a.b&line=abc']){
  const f=fixture(id=>model(id),fragment);
  await assert.rejects(f.api.loadDesign('d2'),/Warenkorb/);assert.deepEqual(f.calls,[]);
 }
});

// Stufe 2 (Chris 20.11.2026: „so wie bei Variante C“): Design-Teile vorladen, statt je Design das ganze Modell zu holen.
function partsFixture({fragment='s=gse1.a.b',answer=null,saveData=false,third=false}={}){
 const server=doorSignModel(),f=server.universal.familyFormats,size=f.defaultSize,ids=['ts-'+size+'-1','ts-'+size+'-2'];
 if(third){
  // Ein drittes Design derselben Größe, damit mehrere Designs zusammen aufgenommen werden können.
  const d=structuredClone(f.designs.find(x=>x.id===ids[1]));d.id='ts-'+size+'-3';d.name='Design 3';d.katalog={...d.katalog,designId:d.katalog.designId.replace(/-D2$/,'-D3')};
  f.designs.push(d);f.formats.find(s=>s.key===size).variants[0].designIds.push(d.id);
  server.universal.workshopElementRights[d.id]=structuredClone(server.universal.workshopElementRights[ids[1]]);ids.push(d.id);
 }
 const shown=id=>shopStartModel(server,id),start=shown(ids[0]),base=shopDesignBase(start.universal);
 const data={editorPath:'/_merchant-editor.html',binding:{...binding},designBase:base,model:{name:'Türschild',configuration:{id:'cfg_ts',revision:4},universal:start.universal,legacy:start.legacy}};
 const calls=[];
 const full=id=>({editorPath:data.editorPath,binding:{...binding},designBase:base,model:{...data.model,universal:shown(id).universal}});
 const parts=wanted=>({binding:{...binding},configuration:{id:'cfg_ts',revision:4},designs:wanted.filter(id=>ids.includes(id)).map(id=>({id,base,parts:JSON.parse(JSON.stringify(shopDesignParts(shown(id).universal)))}))});
 const win={location:{origin:'https://test.example'},navigator:{connection:{saveData}},history:{replaceState(){}},addEventListener(){},removeEventListener(){},setTimeout,clearTimeout};
 const frame={style:{},contentWindow:{},remove(){}};
 const client={loadModel:async id=>{calls.push(['loadModel',id]);return full(id);},
  loadDesignParts:async wanted=>{calls.push(['loadDesignParts',...wanted]);return (answer||parts)(wanted,parts);},
  switchDesign:async()=>{throw Error('nicht erwartet');},
  loadDesignGallery:async()=>({items:[...ids.map(id=>({designId:id,current:true})),{designId:'anderes-produkt',current:false}]})};
 let api;const entry={client,data,resources:{},frame};
 createDesignSwitch({initial:entry,fragment:new URLSearchParams(fragment),container:{append(){}},activate:(e,a)=>{api=a;},toDataUrl:async()=>'',win,doc:{createElement(){throw Error('kein neuer Rahmen erwartet');}},readyFallbackMs:1});
 return {api,calls,ids,shown,start,base,data};
}

test('Stufe 2: EIN kleiner Abruf lädt die Teile einer ganzen Gruppe von Designs; der Wechsel braucht danach kein Modell mehr',async()=>{
 const f=partsFixture();
 await f.api.load(0,'preferred');assert.deepEqual(f.calls,[],'die Liste allein lädt noch nichts');
 assert.deepEqual((await f.api.loadDesigns(f.ids)).designIds,f.ids);
 assert.deepEqual(f.calls,[['loadDesignParts',...f.ids]]);
 const loaded=await f.api.loadDesign(f.ids[1]);
 assert.deepEqual(f.calls,[['loadDesignParts',...f.ids]],'kein Modellabruf, kein zweiter Teile-Abruf');
 assert.deepEqual(loaded.universal,f.shown(f.ids[1]).universal);
 // Der Editor übernimmt daraus wie aus dem vollständigen Modell.
 assert.equal(planDesignAdoption(structuredClone(f.start.universal),structuredClone(loaded.universal),f.ids[1])(),true);
 // Ohne vorherige Liste: ein kleiner Abruf nur für das angetippte Design.
 const direct=partsFixture();
 assert.deepEqual((await direct.api.loadDesign(direct.ids[1])).universal,direct.shown(direct.ids[1]).universal);
 assert.deepEqual(direct.calls,[['loadDesignParts',direct.ids[1]]]);
});

test('Stufe 2: alle vorgeladenen Designs kommen als ein Modell; der Editor nimmt sie in einem Schritt auf',async()=>{
 const f=partsFixture({third:true});
 const all=await f.api.loadDesigns(f.ids.slice(1));
 assert.deepEqual(all.designIds,f.ids.slice(1));assert.deepEqual(f.calls,[['loadDesignParts',...f.ids.slice(1)]]);
 // Dieselben Designs noch einmal: kein zweiter Abruf.
 await f.api.loadDesigns(f.ids.slice(1));assert.equal(f.calls.length,1);
 const device=structuredClone(f.start.universal);
 assert.equal(planDesignAdoption(device,structuredClone(all.universal),all.designIds[0])(),true);
 // Ergebnis wie nach zwei einzelnen Übernahmen über das vollständige Modell.
 const single=structuredClone(f.start.universal);
 for(const id of f.ids.slice(1))planDesignAdoption(single,structuredClone(f.shown(id).universal),id)();
 assert.deepEqual(device,single);
 assert.deepEqual(device.profile.designs.map(d=>d.id),f.ids);
 // Nichts vorgeladen oder nichts Passendes: null, nie ein Modellabruf.
 assert.equal(await f.api.loadDesigns(['gibt-es-nicht']),null);assert.equal(await f.api.loadDesigns('x'),null);
 assert.equal(f.calls.some(c=>c[0]==='loadModel'),false);
});

test('Stufe 2: anderer Fingerabdruck, andere Zuordnung, anderer Produktstand oder ein Fehler führen zum vollständigen Modell wie in Stufe 1',async()=>{
 const wrong=[
  (wanted,parts)=>{const r=parts(wanted);for(const d of r.designs)d.base='0'.repeat(64);return r;},
  (wanted,parts)=>({...parts(wanted),binding:{...binding,shopifyVariantId:'gid://shopify/ProductVariant/12'}}),
  (wanted,parts)=>({...parts(wanted),binding:{...binding,productRevision:5}}),
  (wanted,parts)=>({...parts(wanted),configuration:{id:'cfg_ts',revision:5}}),
  (wanted,parts)=>({...parts(wanted),configuration:{id:'cfg_x',revision:4}}),
  (wanted,parts)=>{const r=parts(wanted);for(const d of r.designs)d.parts.designId='anderes';return r;},
  (wanted,parts)=>{const r=parts(wanted);for(const d of r.designs)d.parts.designIds=d.parts.designIds.slice(1);return r;},
  (wanted,parts)=>({...parts(wanted),designs:[]}),
  async()=>{throw Error('nicht erreichbar');}
 ];
 for(const answer of wrong){
  const f=partsFixture({answer});assert.equal(await f.api.loadDesigns(f.ids),null);
  const loaded=await f.api.loadDesign(f.ids[1]);
  assert.deepEqual(f.calls.at(-1),['loadModel',f.ids[1]],String(answer));
  assert.deepEqual(loaded.universal,f.shown(f.ids[1]).universal);
  assert.equal(await f.api.loadDesigns([f.ids[1]]),null);
 }
 // Ein Start ohne Fingerabdruck (älterer Server): gar kein Teile-Abruf.
 const old=partsFixture();delete old.data.designBase;
 assert.equal(await old.api.loadDesigns(old.ids),null);await old.api.loadDesign(old.ids[1]);
 assert.deepEqual(old.calls,[['loadModel',old.ids[1]]]);
});

test('Stufe 2: aus dem Warenkorb nichts vorladen; im Datensparmodus nichts ungefragt, das angetippte Design aber klein',async()=>{
 const edit=partsFixture({fragment:'s=gse1.a.b&config=konfig_1&rev=2&line=abc'});
 await assert.rejects(edit.api.loadDesign(edit.ids[1]),/Warenkorb/);assert.equal(await edit.api.loadDesigns(edit.ids),null);assert.deepEqual(edit.calls,[]);
 const saving=partsFixture({saveData:true});
 assert.equal(await saving.api.loadDesigns(saving.ids),null);assert.deepEqual(saving.calls,[]);
 await saving.api.loadDesign(saving.ids[1]);assert.deepEqual(saving.calls,[['loadDesignParts',saving.ids[1]]]);
});

test('Stufe 2: Teile mit gleicher Kennung und anderem Inhalt werden nicht zusammengeführt',()=>{
 const f=partsFixture({third:true}),a=JSON.parse(JSON.stringify(shopDesignParts(f.shown(f.ids[1]).universal))),b=JSON.parse(JSON.stringify(shopDesignParts(f.shown(f.ids[2]).universal)));
 const merged=mergeDesignParts([a,b]);
 assert.deepEqual(merged.profileDesigns.map(d=>d.id),[f.ids[1],f.ids[2]]);
 assert.deepEqual(universalWithDesignParts(structuredClone(f.start.universal),merged,f.ids[1]).profile.designs.map(d=>d.id),[f.ids[1],f.ids[2]]);
 const changed=structuredClone(b);changed.familyDesigns=structuredClone(a.familyDesigns);changed.familyDesigns[0].name='anders';
 assert.throws(()=>mergeDesignParts([a,changed]),/bisherigen Weg/);
 const rights=structuredClone(b);rights.rights={...a.rights};rights.rights[Object.keys(a.rights)[0]]={anders:true};
 assert.throws(()=>mergeDesignParts([a,rights]),/bisherigen Weg/);
 for(const bad of [[],null,[a,{}],[a,{...b,designIds:b.designIds.slice(1)}]])assert.throws(()=>mergeDesignParts(bad),/bisherigen Weg/);
});
