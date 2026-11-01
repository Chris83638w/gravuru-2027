import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {familyProductConfig} from '../../workshop/product-families.mjs';
import {measureText} from '../../platform/sources/app/shared/models/doorbell-preview.mjs';
import {prepareConfig,resolvedOptions,selectedProfile,quote,variantCombinations,saveDraft,readDraft} from './contract.mjs';
import {artworkViewport} from './print-geometry.mjs';
import {validateSteelFormats} from './steel-formats.mjs';
import {FAMILY_FORMATS_SCHEMA,familyFormatState,familyFormatChoices,validateFamilyFormats,designNumber} from './family-formats.mjs';
import {familyChoicesMarkup} from './family-formats-ui.mjs';
import {makeProductDocument} from '../../workshop/product-model.mjs';
import {prepareAcrylicReview} from '../../workshop/acrylic-review.mjs';
import {acrylicArtwork} from '../../workshop/acrylic-artwork.mjs';
import {validateCommerce,variantKey} from './commerce-model.mjs';
const clone=v=>structuredClone(v);
// Real pinned catalogue geometry/prices; synthetic A/Name templates only for these tests.
function fixture(material='steel'){
 const f=JSON.parse(fs.readFileSync(new URL('../../workshop/test-fixtures/acryl3-rear/'+material+'.json',import.meta.url))),formats=[],designs=[];let c;
 const chosen=f.sizes.filter((s,i,list)=>['AB','RT2'].includes(s.groupKey)&&s.widthMm===120&&s.heightMm===80||list.findIndex(a=>a.groupKey===s.groupKey)===i);
 for(const s of chosen){const view={...f,groups:f.groups.filter(g=>g.key===s.groupKey),sizes:[s],mountingRules:f.mountingRules.filter(r=>s.mounting.includes(r.id))},n=familyProductConfig(view,s,1),p=n.profile;
  if(s.groupKey==='AB'&&s.widthMm===120)c=n;
  const d=clone(p.designs[0]);d.id='test-'+s.key;d.katalog={designId:'TEST-'+s.groupKey+'-D42',plateMm:[s.widthMm,s.heightMm]};
  const o=d.objects[0];Object.assign(o,{text:'Name',fieldKey:'name',size:3.2,x:s.widthMm/2,y:s.heightMm/2});measureText(o,n.localResources.fonts);designs.push(d);
  formats.push({key:s.key,form:s.groupKey,label:s.label,geometry:clone(p.geometry),variants:[{color:material,familyId:f.id,sizeKey:s.key,basePriceCents:s.baseCents,material:p.material,mounting:p.optionGroups[0].values,designIds:s.groupKey==='R'?[]:[d.id]}]});
 }
 c.familyFormats={schema:FAMILY_FORMATS_SCHEMA,defaultSize:formats.find(s=>s.form==='AB'&&s.geometry.width===120).key,defaultColor:material,colors:[{id:material,label:material}],formats,designs};
 c.profile.optionGroups=[{id:'size',name:'Form & Größe',required:true,defaultValueId:c.familyFormats.defaultSize,values:formats.map(s=>({id:s.key,label:s.label,priceCents:0,currency:'EUR'}))},{id:'mounting',name:'Befestigung',required:true,defaultValueId:'K00',values:[...new Map(formats.flatMap(s=>s.variants[0].mounting.map(m=>[m.id,{id:m.id,label:m.label,priceCents:0,currency:'EUR'}]))).values()]}];
 delete c.familyAcrylic;return prepareConfig(c);
}
const state=c=>({designId:c.profile.designs[0].id,objects:clone(c.profile.designs[0].objects),mOptions:resolvedOptions(c),selected:null});
for(const material of ['steel','schwarz','anthrazit']){
 test(material+': frozen review and manufacturing SVG use selected RT2, not AB start geometry',async()=>{
  const c=fixture(material),doc=makeProductDocument(c),record={id:c.profile.id,revision:1,document:doc};
  const s=familyFormatState(c,state(c),{size:c.familyFormats.formats.find(f=>f.form==='RT2').key},{fonts:c.localResources.fonts});
  const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j6yEAAAAASUVORK5CYII=','base64');
  const bundle=await prepareAcrylicReview({record,config:doc.config,input:{productId:record.id,productRevision:1,designId:s.designId,objects:s.objects,options:s.mOptions,quantity:1,media:[],preview:image.toString('base64')},preparePhoto:async()=>({original:image,preview:image,width:1,height:1})});
  const art=await acrylicArtwork(bundle.package,bundle.manifest.packageSha256,{engraving:true}),p=selectedProfile(c,s.mOptions);
  assert.equal(art.geometry.widthMm,p.geometry.width);assert.equal(art.geometry.heightMm,p.geometry.height);assert.equal(art.geometry.contours[0].d,p.geometry.outlinePath);assert.equal(bundle.manifest.product.material.kind,p.material.kind);assert.match(art.svg,/data-native-design/);
 });
 test(material+': AB 12×8, K00; one Oval and unavailable round, stable source keys',()=>{
  const c=fixture(material),o=resolvedOptions(c),p=selectedProfile(c,o);assert.equal(p.geometry.width,120);assert.equal(p.geometry.height,80);assert.deepEqual(p.geometry.holes,[]);assert.equal(o.mounting,'K00');
  const forms=familyFormatChoices(c,o);assert.deepEqual(forms.map(f=>f.id),['RE','AB','QU','OV','R','RT1','RT2']);assert.equal(forms.find(f=>f.id==='R').sizes.some(s=>s.available),false);assert(forms.find(f=>f.id==='OV').sizes.every(s=>c.familyFormats.formats.some(f=>f.key===s.key)));
  assert.match(familyChoicesMarkup(c,o),/data-family-value="R"[^>]*disabled/);
 });
 test(material+': RE → OV → RT2 → QU keeps own text and D number; draft restores selected geometry',()=>{
  const c=fixture(material),initial=JSON.stringify(c);let s=state(c);s.objects[0].text='Mia';
  for(const form of ['RE','OV','RT2','QU']){const target=c.familyFormats.formats.find(f=>f.form===form);s=familyFormatState(c,s,{size:target.key},{fonts:c.localResources.fonts});assert.equal(s.objects[0].text,'Mia');assert.equal(designNumber(selectedProfile(c,s.mOptions).designs.find(d=>d.id===s.designId)),'42');
   const q=quote(c,s.objects,s.designId,s.mOptions);assert.equal(q.unitCents,target.variants[0].basePriceCents);assert.equal(artworkViewport(c,s).scale,1);
   const draft=saveDraft(c,s,s.mOptions,c.localResources.fonts,[],{draft:true}),restored=readDraft(c,draft,c.localResources.fonts,[]);assert.deepEqual(restored.design.objects,draft.design.objects);assert.deepEqual(restored.options,s.mOptions);
  }assert.equal(JSON.stringify(c),initial);
 });
 test(material+': exact retro path/holes and mounting-specific price; no double scaling',()=>{
  const c=fixture(material),f=c.familyFormats.formats.find(f=>f.form==='RT2'),m=f.variants[0].mounting.find(m=>m.holes.length),o={size:f.key,mounting:m.id},p=selectedProfile(c,o);
  assert.equal(p.geometry.outlinePath,f.geometry.outlinePath);assert.deepEqual(p.geometry.holes,m.holes);assert.equal(quote(c,p.designs[0].objects,p.designs[0].id,o).unitCents,f.variants[0].basePriceCents+m.priceCents);assert.equal(artworkViewport(c,{mOptions:o}).scale,1);
 });
 test(material+': undo restores exact prior state; repeated fastening choice never transforms objects',()=>{
  const c=fixture(material),s=state(c),original=clone(s),f=c.familyFormats.formats.find(f=>f.form==='RT1');const changed=familyFormatState(c,s,{size:f.key},{fonts:c.localResources.fonts});assert.deepEqual(s,original);const again=familyFormatState(c,changed,changed.mOptions,{fonts:c.localResources.fonts});assert.deepEqual(again.objects,changed.objects);assert.deepEqual(selectedProfile(c,original.mOptions).geometry,c.profile.geometry);
 });
}
test('reject unknown options, wrong size, round without source, and incompatible fastening on server',()=>{
 const c=fixture();assert.throws(()=>resolvedOptions(c,{other:'x'}),/Unbekannte/);assert.throws(()=>resolvedOptions(c,{size:'invented'}),/Unbekannte/);assert.throws(()=>resolvedOptions(c,{size:c.familyFormats.formats.find(f=>f.form==='R').key}),/kein freigegebenes/);
 const f=c.familyFormats.formats[0];f.variants[0].mounting=f.variants[0].mounting.filter(m=>m.id==='K00');assert.throws(()=>resolvedOptions(c,{size:f.key,mounting:'B02'}),/nicht erlaubt/);
 const s=familyFormatState(c,state(c),{size:f.key,mounting:'B02'},{fonts:c.localResources.fonts});assert.equal(s.mOptions.mounting,'K00');
});
test('variant combinations include only family-allowed, available size/mounting pairs',()=>{
 const c=fixture(),list=variantCombinations(c);assert.equal(list.length,c.familyFormats.formats.reduce((n,f)=>n+(f.variants[0].designIds.length?f.variants[0].mounting.length:0),0));assert.equal(new Set(list.map(x=>JSON.stringify(x))).size,list.length);for(const v of list)assert.deepEqual(resolvedOptions(c,v),v);
});
test('Shopify binding validates every family variant using its own available design and price, with no writes',()=>{
 const c=fixture(),variants=variantCombinations(c).map((o,i)=>{const p=selectedProfile(c,o);return {id:String(100+i),key:variantKey(o),priceCents:quote(c,[],p.defaultDesignId,o).unitCents};});
 const binding={schema:'gravuru-shopify-commerce/v2',productId:'gid://shopify/Product/1',profileId:c.profile.id,revision:c.profile.revision,currency:'EUR',priceMode:'base-only',designIds:c.familyFormats.designs.map(d=>d.id),variants};assert.equal(validateCommerce(c,binding),binding);
 binding.variants[0].priceCents++;assert.throws(()=>validateCommerce(c,binding),/Preiszuordnung/);
});
test('catalog contour permission does not remove free steelFormats contour guard',()=>{
 const c=fixture(),f=c.familyFormats.formats.find(f=>f.form==='RT1');assert.throws(()=>validateSteelFormats({...c,profile:{...c.profile,geometry:f.geometry},steelFormats:{version:1}}),/Kontur/);
});
test('definition rejects absent/duplicate sources, invalid prices, and nondefault start',()=>{
 for(const mutate of [c=>c.familyFormats.formats.push(clone(c.familyFormats.formats[0])),c=>c.familyFormats.formats[0].variants[0].basePriceCents=null,c=>c.familyFormats.formats[0].variants[0].designIds=['missing'],c=>c.familyFormats.defaultSize=c.familyFormats.formats[0].key]){const c=fixture();mutate(c);assert.throws(()=>validateFamilyFormats(c));}
});

test('one acrylic configuration switches color, preserving text and using the selected source family',()=>{
 const c=fixture('schwarz'),other=fixture('anthrazit');
 c.familyFormats.colors.push(...other.familyFormats.colors);c.familyFormats.designs.push(...other.familyFormats.designs);
 for(const f of c.familyFormats.formats){const match=other.familyFormats.formats.find(g=>g.form===f.form&&g.geometry.width===f.geometry.width&&g.geometry.height===f.geometry.height);f.variants.push(...clone(match.variants));}
 c.profile.optionGroups.splice(1,0,{id:'color',name:'Farbe',required:true,defaultValueId:'schwarz',values:c.familyFormats.colors.map(v=>({...v,priceCents:0,currency:'EUR'}))});
 prepareConfig(c);const s=state(c);s.objects[0].text='Mia';const next=familyFormatState(c,s,{color:'anthrazit'},{fonts:c.localResources.fonts}),p=selectedProfile(c,next.mOptions);
 assert.equal(next.objects.find(o=>o.type==='text').text,'Mia');assert.equal(p.material.variant,'anthrazit');assert.equal(p.material.engravingSide,'back');assert.equal(p.familySelection.familyId,'acryl-3mm-tuerschilder-anthrazit');
 assert.equal(variantCombinations(c).length,variantCombinations(fixture('schwarz')).length*2);
});

test('quantity tiers use the selected size base price and preserve its fastening surcharge',()=>{
 const c=fixture(),f=c.familyFormats.formats.find(f=>f.form==='RT2'),v=f.variants[0],m=v.mounting.find(m=>m.priceCents>0);
 v.quantityTiers=[{minQuantity:5,unitCents:1200}];const o={size:f.key,mounting:m.id},p=selectedProfile(c,o),q=quote(c,[],p.defaultDesignId,o,5);
 assert.equal(q.unitCents,1200+m.priceCents);assert.equal(q.totalCents,(1200+m.priceCents)*5);assert.equal(q.quantityTier.unitCents,1200);
});

test('80 source sizes are supported only by the explicit family format contract',()=>{
 const c=fixture(),f=c.familyFormats.formats[0];for(let i=c.familyFormats.formats.length;i<80;i++)c.familyFormats.formats.push({...clone(f),key:'test-size-'+i});
 c.profile.optionGroups[0].values=c.familyFormats.formats.map(s=>({id:s.key,label:s.label,priceCents:0,currency:'EUR'}));
 assert.doesNotThrow(()=>prepareConfig(c));delete c.familyFormats;assert.throws(()=>prepareConfig(c),/40/);
});

test('RE, RT1, RT2, OV and QU use the identical neutral steel file without a colored overlay',async()=>{
 const {studioSvg}=await import('../../platform/sources/app/shared/models/studio-svg.mjs');
 const {surfacePreview}=await import('./material-surface.mjs');const {designAreaPreview}=await import('./design-area.mjs');
 const c=fixture(),original=c.materialSurface;let s=state(c);
 for(const form of ['RE','RT1','RT2','OV','QU']){const format=c.familyFormats.formats.find(f=>f.form===form);s=familyFormatState(c,s,{size:format.key},{fonts:c.localResources.fonts});const p=selectedProfile(c,s.mOptions);
  const svg=designAreaPreview(surfacePreview(studioSvg(p,p.designs[0],c.localResources.fonts),c.materialSurface,p.geometry),c,p);
  assert.equal(c.materialSurface,original);assert(svg.includes('href="'+original+'"'));assert.doesNotMatch(svg,/fill-opacity=".08"|fill="#278a72"/);
 }
});
test('detached price renderer reads the selected base and tier from the central quote',async()=>{
 const {commercePrice}=await import('./commerce-model.mjs');const {money,visibleGroups}=await import('./contract.mjs');const {uploadQuote,additionalMotifCount}=await import('./ux-model.mjs');
 const config=fixture(),s=state(config),format=config.familyFormats.formats.find(f=>f.form==='RT2');s.mOptions={size:format.key,mounting:'K00'};s.designId=selectedProfile(config,s.mOptions).defaultDesignId;s.objects=selectedProfile(config,s.mOptions).designs[0].objects;
 const nodes=new Map(),$=key=>{if(!nodes.has(key))nodes.set(key,{value:2});return nodes.get(key);},tierNote={dataset:{}};
 const source=fs.readFileSync(new URL('./ux.mjs',import.meta.url),'utf8'),start=source.indexOf('  function updatePrice()'),end=source.indexOf('\n  function update(){',start);
 const args={config,el:{state:s},profile:config.profile,$,uploadQuote,commercePrice,quote,money,visibleGroups,additionalMotifCount,esc:String,tierNote,say:message=>{throw Error(message);}};
 Function(...Object.keys(args),source.slice(start,end)+'\nupdatePrice();')(...Object.values(args));
 assert.equal($('[data-fk-total]').textContent,money(commercePrice(config,s,2).totalCents));assert($('[data-ux-price-lines]').innerHTML.includes(money(format.variants[0].basePriceCents)));assert.equal(typeof tierNote.textContent,'string');
});
