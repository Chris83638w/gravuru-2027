import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeAcrylicConfig,acrylicSelection} from '../configurator/variant-m/acrylic-product.mjs';
import {measureText} from '../platform/sources/app/shared/models/doorbell-preview.mjs';
import {makeProductDocument,validateProductDocument,resolveProduct,validateProductDesign} from './product-model.mjs';

const resources=JSON.parse(fs.readFileSync(new URL('../designs/acrylic-unser-anfang/resources.json',import.meta.url),'utf8'));
function native(){
  const config=makeAcrylicConfig({profile:{kind:'universal-product',schemaVersion:2}},resources,'a'.repeat(64));
  for(const object of config.profile.designs[0].objects.filter(o=>o.type==='text')){
    measureText(object,resources.fonts);
    if(object.id==='names'){object.size*=118/object.w;measureText(object,resources.fonts);}
  }
  return config;
}
const fixture=()=>makeProductDocument(native());
const first=product=>product.config.profile.designs[0];
const rights=product=>product.elementRights[first(product).id];
const checkedDesign=(document,change)=>{
  const design=structuredClone(first(document));change(design);
  return validateProductDesign(document,design);
};

test('native pilot becomes a cloneable document without inventing repository IDs or changing the source',()=>{
  const config=native(),before=structuredClone(config),document=makeProductDocument(config,{name:'Meine Acrylvorlage',kind:'master'});
  assert.equal(document.schema,'gravuru-product/v1');assert.equal(document.kind,'master');
  assert.equal(document.name,'Meine Acrylvorlage');assert.equal(document.masterId,null);
  assert.equal(document.config.profile.name,document.name);
  assert.deepEqual(document.categoryIds,[]);assert.deepEqual(config,before);
  assert.equal(document.id,undefined);assert.equal(document.revision,undefined);
  assert.deepEqual(validateProductDocument(document),document);
  document.config.profile.designs[0].objects[0].x=10;
  assert.deepEqual(config,before);
});
test('inherit, explicitly empty and override remain distinct and missing assignments are rejected',()=>{
  const document=fixture();
  document.profileAssignments.fonts={mode:'empty',profileId:null};
  document.profileAssignments.motifs={mode:'override',profileId:'gifts-motifs-v2'};
  document.categoryIds=['gifts','acrylic'];
  const validated=validateProductDocument(document);
  assert.deepEqual(validated.profileAssignments,document.profileAssignments);
  assert.deepEqual(validated.profileAssignments.colors,{mode:'inherit',profileId:null});
  for(const change of [
    p=>{delete p.profileAssignments.fonts;},p=>{delete p.profileAssignments.fonts.mode;},
    p=>{p.profileAssignments.fonts={mode:'override',profileId:null};},
    p=>{p.profileAssignments.fonts={mode:'empty',profileId:'wrong'};},
    p=>{p.profileAssignments.fonts={mode:'inherit',profileId:'wrong'};},
    p=>{p.profileAssignments.fonts={mode:'first-category',profileId:null};}
  ]){const broken=structuredClone(document);change(broken);assert.throws(()=>validateProductDocument(broken),/Profil/);}
});
test('unknown design, option and rights references fail instead of falling back',()=>{
  for(const change of [
    p=>{p.config.profile.defaultDesignId='missing-design';},
    p=>{p.config.profile.optionGroups[0].values[0].id='extra-large';},
    p=>{p.config.profile.optionGroups[0].defaultValueId='missing-size';},
    p=>{p.elementRights.unknown={};},
    p=>{delete rights(p).heart;},
    p=>{rights(p).heart.unknown=true;}
  ]){const broken=fixture();change(broken);assert.throws(()=>validateProductDocument(broken));}
  assert.throws(()=>resolveProduct(fixture(),{designId:'other-design'}),/Design/);
  assert.throws(()=>resolveProduct(fixture(),{designId:null}),/Design/);
  assert.throws(()=>resolveProduct(fixture(),{options:{size:'extra-large'}}),/Auswahl/);
  assert.throws(()=>resolveProduct(fixture(),{options:{material:'steel'}}),/Optionsgruppe/);
});
test('persisted authoritative cent prices are required; invalid money cannot enter a revision',()=>{
  for(const change of [
    p=>{delete p.config.acrylic.pricing;},
    p=>{p.config.acrylic.pricing.wallCents=5.99;},
    p=>{p.config.acrylic.pricing.sizes.large=-1;},
    p=>{p.config.acrylic.pricing.bases.none=100;},
    p=>{p.config.acrylic.pricing.largeBaseExtraCents='100';},
    p=>{p.config.acrylic.pricing.sizes.large=Number.MAX_SAFE_INTEGER;}
  ]){const broken=fixture();change(broken);assert.throws(()=>validateProductDocument(broken));}
});
test('compatibility price mirrors are derived from the single persisted pricing source',()=>{
  const document=fixture();document.config.acrylic.pricing.sizes.large=2499;
  document.config.acrylic.pricing.bases.eiche=1199;
  document.config.acrylic.pricing.wallCents=699;
  document.config.basePriceCents=1;
  document.config.profile.optionGroups.find(group=>group.id==='base').values.find(value=>value.id==='eiche').priceCents=2;
  const resolved=resolveProduct(document,{options:{size:'large',base:'eiche',wall:'wall'}});
  assert.equal(resolved.price.unitCents,4497);
  assert.equal(resolved.config.basePriceCents,1499);
  assert.equal(resolved.config.profile.optionGroups.find(group=>group.id==='base').values.find(value=>value.id==='eiche').priceCents,1199);
  assert.equal(document.config.basePriceCents,1);
});
test('all 28 pilot variants resolve the same dimensions and prices as the existing configurator',()=>{
  const document=fixture();let count=0;
  const expectedBases={none:0,buche:899,eiche:999,nussbaum:1099,klar:399,satiniert:499,'holz-flach':599};
  for(const size of ['small','large'])for(const [base,cents] of Object.entries(expectedBases))for(const wall of ['none','wall']){
    const options={size,base,wall},resolved=resolveProduct(document,{options}),selection=acrylicSelection(options,document.config.acrylic.pricing);
    assert.deepEqual(resolved.resolvedOptions,options);
    assert.equal(resolved.price.unitCents,(size==='small'?1499:1999)+cents+(size==='large'&&base!=='none'?100:0)+(wall==='wall'?599:0));
    assert.equal(resolved.price.unitCents,selection.totalCents);
    assert.equal(resolved.physical.widthMm,size==='small'?150:200);
    assert.equal(resolved.physical.heightMm,size==='small'?200:266.7);
    assert.equal(resolved.physical.thicknessMm,3);
    assert.equal(resolved.physical.insertionMm,base==='none'?0:['buche','eiche','nussbaum'].includes(base)?7:5);
    assert.equal(resolved.profile.geometry.width,150);assert.equal(resolved.designSpace.widthMm,150);
    assert.equal(resolved.designSpace.scaleX,resolved.physical.widthMm/150);
    assert.equal(resolved.designSpace.scaleY,resolved.physical.heightMm/200);
    count++;
  }
  assert.equal(count,28);
});
test('fixed elements receive explicit separate rights without losing permitted photo or colour changes',()=>{
  const document=fixture(),table=rights(document);
  assert.deepEqual(table['photo-main'],{content:false,color:false,replace:true,move:false,scale:false,delete:false});
  assert.deepEqual(table.heart,{content:false,color:true,replace:false,move:false,scale:false,delete:false});
  assert.deepEqual(table.names,{content:true,color:true,replace:false,move:true,scale:true,delete:true});
  for(const key of ['move','scale','replace']){
    const broken=structuredClone(document);rights(broken).heart[key]=true;
    assert.throws(()=>validateProductDocument(broken),/Rechte/);
  }
  assert.doesNotThrow(()=>checkedDesign(document,design=>{
    Object.assign(design.objects.find(o=>o.id==='photo-main'),{uxUploadId:'replacement',uxUploadKind:'photo',uxPhotoBackground:'keep'});
    // K10: Farbwahl aus der UV-Profilpalette (Rot #c93232).
    design.objects.find(o=>o.id==='heart').color='#c93232';
  }));
});
test('server-side design validator enforces each individually restricted right',()=>{
  for(const [right,change] of [
    ['content',(d,o)=>{o.text='Anderer Text';}],['color',(d,o)=>{o.color='#c93232';}],
    ['move',(d,o)=>{o.x+=1;}],['scale',(d,o)=>{o.size+=1;}],['delete',(d,o)=>{d.objects=d.objects.filter(item=>item.id!==o.id);}]
  ]){
    const document=fixture();rights(document).names[right]=false;
    assert.throws(()=>checkedDesign(document,design=>change(design,design.objects.find(o=>o.id==='names'))),/Recht|entfernt/);
  }
  const document=fixture();rights(document)['photo-main'].replace=false;
  assert.throws(()=>checkedDesign(document,design=>Object.assign(design.objects.find(o=>o.id==='photo-main'),{uxUploadId:'replacement',uxUploadKind:'photo'})),/replace/);
  for(const change of [
    (d,o)=>{o.x+=1;},(d,o)=>{o.w+=1;},(d,o)=>{o.uxHidden=true;},(d,o)=>{o.opacity=0;},
    (d,o)=>{o.acrylicFixed=false;},(d,o)=>{o.fieldKey='baby';},(d,o)=>{d.objects.push(structuredClone(o));}
  ])assert.throws(()=>checkedDesign(fixture(),design=>change(design,design.objects.find(o=>o.id==='photo-main'))));
});
test('server validation preserves editable text and measures it when scaling is disallowed',()=>{
  const document=fixture();rights(document).place.scale=false;
  const changed=checkedDesign(document,design=>{
    const object=design.objects.find(o=>o.id==='place');object.text='Am See';object.w=900;
  });
  assert.equal(changed.objects.find(o=>o.id==='place').text,'Am See');
  assert.ok(changed.objects.find(o=>o.id==='place').w<100);
});
test('repository relationships and metadata are explicit, bounded and not silently invented',()=>{
  const document=makeProductDocument(native(),{kind:'product',masterId:'g27-master-123'});
  assert.equal(document.masterId,'g27-master-123');
  for(const change of [
    p=>{p.schema='gravuru-product/v99';},p=>{p.kind='published';},p=>{p.masterId='';},
    p=>{p.categoryIds=['same','same'];},p=>{p.name=' ';},p=>{p.seo.title='X'.repeat(71);},
    p=>{p.seo.description='X'.repeat(161);},p=>{p.id='repository-id';},
    p=>{p.config.profile.geometry.shape='ellipse';},p=>{p.config.acrylic.designHeight=201;}
  ]){const broken=structuredClone(document);change(broken);assert.throws(()=>validateProductDocument(broken));}
});

test('explicit backend delete permission removes fixed artwork without mutating source or permitting geometry edits',()=>{
 const document=fixture(),source=structuredClone(document.config.profile.designs[0]);
 rights(document).heart.delete=true;assert.doesNotThrow(()=>validateProductDocument(document));
 assert.doesNotThrow(()=>checkedDesign(document,d=>{d.objects=d.objects.filter(o=>o.id!=='heart');}));
 assert.deepEqual(document.config.profile.designs[0],source);
 assert.throws(()=>checkedDesign(document,d=>{d.objects.find(o=>o.id==='heart').x+=4;}),/Recht|Vorlagenbereich/);
 rights(document).heart.delete=false;assert.throws(()=>checkedDesign(document,d=>{d.objects=d.objects.filter(o=>o.id!=='heart');}),/entfernt/);
});
