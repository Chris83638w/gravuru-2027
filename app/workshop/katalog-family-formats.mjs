// One review product per line/subcategory. No DB, Shopify, release or import writes.
import {familyProductConfig,sizeQuantityTiers} from './product-families.mjs';
import {createHash} from 'node:crypto';
import {assignTargetSeries,approvedForFamily,designTargetCompatibility,designTargets} from './design-targets.mjs';
import {katalogDesignToTemplate,scaleTemplate,applyPriceOverrides,defaultQuantityTiers} from './katalog-convert.mjs';
import {assessDesignTarget} from './design-target-rules.mjs';
import {customerUxConfig} from './customer-ux-policy.mjs';
import {prepareConfig} from '../configurator/variant-m/contract.mjs';
import {validateShopProductCut,shopProductCutMetafield,designZielgruppe} from './shop-product-cut.mjs';
import {FAMILY_FORMATS_SCHEMA,FAMILY_FORMAT_SOURCES,FAMILY_FORMS,customerForm,familyFormatCombinations} from '../configurator/variant-m/family-formats.mjs';

const copy=v=>structuredClone(v),fail=m=>{throw Error(m);};
export const SIGN_FAMILIES=FAMILY_FORMAT_SOURCES;
const color=f=>f.material.kind==='steel'?'edelstahl':f.material.variant;
const sameGeometry=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const slotKey=(s)=>customerForm(s.groupKey)+':'+s.widthMm+'x'+s.heightMm;
const optionLabel=s=>FAMILY_FORMS.find(([id])=>id===customerForm(s.form))[1]+' · '+s.label;

export async function planFamilyFormats(katalog,lineId,subcategoryId,{reviewUnreleased=false,designIds=null,available={},converter=null,shopProduct=null}={}){
 if(shopProduct)shopProduct=validateShopProductCut(shopProduct);
 const line=katalog.lines.get(lineId),sub=line?.subcategories.find(s=>s.id===subcategoryId);
 if(!sub)fail('Linie oder Unterkategorie fehlt.');
 const families=line.families.filter(id=>SIGN_FAMILIES.includes(id)).map(id=>applyPriceOverrides(katalog.families.get(id),sub));
 if(!families.length)fail('Keine freigegebene Türschild-Familienart.');
 // Issue #139: the product metafield selects one physical format and one
 // starter. Other approved themes remain available in "Weitere Designs".
 const selectedSize=shopProduct&&families.flatMap(f=>f.sizes).find(s=>s.key===shopProduct.sizeKey);
 const formChoice=shopProduct?.groessenWahl==='form',allChoice=shopProduct?.groessenWahl==='alle';
 const inCut=size=>!selectedSize||allChoice||(formChoice?size.groupKey===selectedSize.groupKey:slotKey(size)===slotKey(selectedSize));
 if(shopProduct&&(!selectedSize||shopProduct.themeId!==sub.themeId||!shopProduct.defaultDesignId||reviewUnreleased||designIds))fail('Shop-Produktschnitt braucht Kataloggröße, passendes Thema und Startdesign; keine Prüffreigaben oder eingeschränkte Galerie.');
 const allMasters=katalog.designs.masters.filter(d=>!d.hidden&&(!designIds||designIds.includes(d.id))&&(shopProduct||d.themes?.includes(sub.themeId))&&(!shopProduct?.zielgruppe||designZielgruppe(d)===shopProduct.zielgruppe));
 const report={schema:'gravuru-family-formats-plan/v1',lineId,subcategoryId,reviewUnreleased,shopifyWrites:false,sourceFamilies:families.map(f=>f.id),excluded:[],blocked:[],sizes:[],shopify:{options:families.length>1?['Form & Größe','Farbe','Befestigung']:['Form & Größe','Befestigung'],maximumVariants:2048,maximumOptions:3,variantIdsCreated:0,sources:['https://help.shopify.com/en/manual/products/variants/add-variants','https://shopify.dev/docs/api/admin-graphql/latest/mutations/productSet']}};
 const assigned=new Map(families.map(f=>[f.id,assignTargetSeries(f,allMasters.filter(d=>designTargets(d,katalog).some(t=>t.familie===f.id)&&(reviewUnreleased||approvedForFamily(d,f.id,katalog))),katalog)]));
 const needed=[...new Set([...assigned.entries()].flatMap(([id,list])=>list.filter(a=>!a.oldSize&&a.sizes.some(key=>inCut(katalog.families.get(id).sizes.find(s=>s.key===key)))).flatMap(a=>a.design.fonts||[])))];
 const {fonts,missing}=await katalog.fontResources(needed,{available,converter});report.fontsMissing=missing;
 const bank=new Map(),motifs=new Map(),rights={},formats=new Map(),colors=[],converted=new Map();let base;
 const theme=katalog.theme(sub.themeId);
 for(const family of families){
  const colorId=color(family);colors.push({id:colorId,label:colorId==='edelstahl'?'Edelstahl':colorId==='schwarz'?'Schwarz':'Anthrazit'});
  for(const size of family.sizes){
   if(!inCut(size))continue;
   // No generic family starter is exposed: it supplies geometry/options only.
   let config;
   try{const view={...family,groups:family.groups.filter(g=>g.key===size.groupKey),sizes:[size],mountingRules:family.mountingRules.filter(r=>size.mounting.includes(r.id))};const fallback=sizeQuantityTiers(family,size)===undefined?defaultQuantityTiers(line,sub):null;if(fallback)view.quantityTiers=fallback.tiers;config=familyProductConfig(view,size,1);}
   catch(error){report.blocked.push({familyId:family.id,sizeKey:size.key,reason:error.message});continue;}
   const p=config.profile,designs=[],unapprovedDesignIds=[];
   for(const a of assigned.get(family.id).filter(a=>!a.oldSize&&a.sizes.includes(size.key))){
    const compatibility=designTargetCompatibility(a.design,family,size,{katalog});
    if(compatibility.status==='passt nicht'){report.excluded.push({familyId:family.id,sizeKey:size.key,designId:a.design.id,issues:compatibility.issues});continue;}
    const key=family.id+'\0'+a.design.id;
    try{
     if(!converted.has(key))converted.set(key,katalogDesignToTemplate(a.design,family,theme,{fonts}));
     if(shopProduct&&!converted.get(key).template.objects.some(o=>o.type==='text'&&o.role!=='guide'&&o.text?.trim())){report.excluded.push({familyId:family.id,sizeKey:size.key,designId:a.design.id,issues:['Kein Schild ohne Text (Issue #139).']});continue;}
     const t=converted.get(key),scaled=scaleTemplate(t.template,t.template.katalog.plateMm,[size.widthMm,size.heightMm],fonts,{contain:true});
     const fit=assessDesignTarget({master:a.design,template:scaled,family,size,fonts,motifs:()=>t.motifs});
     if(fit.status==='passt nicht'){report.excluded.push({familyId:family.id,sizeKey:size.key,designId:a.design.id,issues:fit.issues});continue;}
     const existing=bank.get(t.template.id);
     if(existing&&JSON.stringify(existing)!==JSON.stringify(t.template))fail('Widersprüchliche Vorlage '+t.template.id+'.');
     bank.set(t.template.id,copy(t.template));designs.push(t.template.id);if(!approvedForFamily(a.design,family.id,katalog))unapprovedDesignIds.push(t.template.id);rights[t.template.id]=copy(t.rights);
     for(const m of t.motifs){if(motifs.has(m.key)&&JSON.stringify(motifs.get(m.key))!==JSON.stringify(m))fail('Widersprüchliche Motivressource '+m.key+'.');motifs.set(m.key,copy(m));}
    }catch(error){report.excluded.push({familyId:family.id,sizeKey:size.key,designId:a.design.id,issues:[error.message]});}
   }
   const slot=slotKey(size),format=formats.get(slot)||{key:size.key,form:size.groupKey,label:size.label,geometry:copy(p.geometry),...(p.workingArea?{workingArea:copy(p.workingArea)}:{}),variants:[]};
   if(!sameGeometry(format.geometry,p.geometry))fail('Die Farben haben verschiedene Geometrien: '+slot+'.');
   format.variants.push({color:colorId,familyId:family.id,sizeKey:size.key,basePriceCents:size.baseCents,material:copy(p.material),mounting:copy(p.optionGroups.find(g=>g.id==='mounting').values),designIds:designs,...(reviewUnreleased?{unapprovedDesignIds}:{}),...(config.quantityTiers?{quantityTiers:copy(config.quantityTiers)}:{})});formats.set(slot,format);
   report.sizes.push({familyId:family.id,sizeKey:size.key,form:customerForm(size.groupKey),basePriceCents:size.baseCents,designs:designs.length,mountings:format.variants.at(-1).mounting.length});
   if(!base&&(selectedSize||size.groupKey==='AB'&&size.widthMm===120&&size.heightMm===80)&&designs.length)base=config;
  }
 }
 const list=[...formats.values()],start=selectedSize?(list.find(s=>s.key===selectedSize.key)||list[0]):list.find(s=>s.form==='AB'&&s.geometry.width===120&&s.geometry.height===80);
 report.shopify.plannedVariants=list.reduce((sum,s)=>sum+s.variants.reduce((n,v)=>n+v.mounting.length,0),0);
 report.shopify.withinLimits=report.shopify.plannedVariants<=2048&&report.shopify.options.length<=3;
 report.shopify.variants=list.flatMap(s=>s.variants.flatMap(v=>v.mounting.map(m=>({source:{familyId:v.familyId,sizeKey:v.sizeKey,mounting:m.id},optionValues:[optionLabel(s),...(colors.length>1?[colors.find(c=>c.id===v.color).label]:[]),m.label],priceCents:v.basePriceCents+m.priceCents,designAvailable:!!v.designIds.length,shopifyVariantId:null}))));
 if(new Set(report.shopify.variants.map(v=>JSON.stringify(v.optionValues))).size!==report.shopify.plannedVariants)fail('Shopify-Auswahltexte sind nicht eindeutig.');
 report.unavailable=report.sizes.filter(s=>!s.designs);
 if(!base||!start){report.blocked.push({reason:(selectedSize?selectedSize.label:'AB 12 × 8 cm')+' hat kein verfügbares Ziel-Design; kein Ersatz-Startdesign erfunden.'});return {config:null,report};}
 const c=customerUxConfig(base),p=c.profile;
 p.id='katalog-formate-'+line.id+'-'+sub.id;p.revision='family-formats-v1';p.binding={kind:'local-review',productId:'local-'+p.id};p.name=line.name+' – '+sub.name;
 p.optionGroups=[{id:'size',name:'Form & Größe',defaultValueId:start.key,required:true,values:list.map(s=>({id:s.key,label:optionLabel(s),priceCents:0,currency:'EUR'}))},...(colors.length>1?[{id:'color',name:'Farbe',defaultValueId:colors[0].id,required:true,values:colors.map(v=>({...v,priceCents:0,currency:'EUR'}))}]:[]),{id:'mounting',name:'Befestigung',defaultValueId:'K00',required:true,values:[...new Map(list.flatMap(s=>s.variants.flatMap(v=>v.mounting.map(m=>[m.id,{id:m.id,label:m.label,priceCents:0,currency:'EUR'}])))).values()]}];
 c.familyFormats={schema:FAMILY_FORMATS_SCHEMA,source:{lineId,subcategoryId,reviewUnreleased},defaultSize:start.key,defaultColor:colors[0].id,colors,formats:list,designs:[...bank.values()]};
 if(shopProduct){
  const starter=c.familyFormats.designs.find(d=>d.katalog.designId===shopProduct.defaultDesignId);
  if(!starter||!starter.themes?.includes(sub.themeId)||start.variants.some(v=>!v.designIds.includes(starter.id)))fail('Startdesign ist nicht in jeder Produktfarbe freigegeben, passend und der Unterkategorie zugeordnet.');
  c.familyFormats.source.shopProduct=copy(shopProduct);p.themeId=shopProduct.themeId;p.defaultDesignId=starter.id;
  if(allChoice){c.familyFormats.defaultSize=start.key;const sizeGroup=p.optionGroups.find(g=>g.id==='size');if(sizeGroup)sizeGroup.defaultValueId=start.key;}
  else if(formChoice){c.familyFormats.defaultSize=start.key;const sizeGroup=p.optionGroups.find(g=>g.id==='size');if(sizeGroup){sizeGroup.name='Größe';sizeGroup.defaultValueId=start.key;}}
  else{c.familyFormats.fixedSize=start.key;p.optionGroups=p.optionGroups.filter(g=>g.id!=='size');}
  p.id+='-'+createHash('sha256').update(JSON.stringify(allChoice?['alle',shopProduct.zielgruppe??null,shopProduct.defaultDesignId]:formChoice?[start.form,shopProduct.zielgruppe??null,shopProduct.defaultDesignId]:[start.key,shopProduct.defaultDesignId])).digest('hex').slice(0,16);p.binding.productId='local-'+p.id;
  p.name+=' · '+(allChoice?'alle Formen'+(shopProduct.zielgruppe?' · '+shopProduct.zielgruppe:''):formChoice?(FAMILY_FORMS.find(([id])=>id===customerForm(start.form))?.[1]??start.form)+(shopProduct.zielgruppe?' · '+shopProduct.zielgruppe:''):start.label);
  if(p.material.kind==='steel'){c.photo={...c.photo,enabled:false};c.logo={...c.logo,enabled:false,vectorUpload:false};}
  if(formChoice){
   // Nur die Größe benennen („Herz M · 20,9 × 45,0 cm“), die Form steht im Produkt.
   const plainLabel=new Map(list.map(s=>[optionLabel(s),s.label]));
   const sizeGroup=p.optionGroups.find(g=>g.id==='size');if(sizeGroup)for(const v of sizeGroup.values)v.label=list.find(s=>s.key===v.id)?.label??v.label;
   report.shopify.options=report.shopify.options.map(n=>n==='Form & Größe'?'Größe':n);
   for(const v of report.shopify.variants)v.optionValues[0]=plainLabel.get(v.optionValues[0])??v.optionValues[0];
  }
  else if(!allChoice){report.shopify.options=report.shopify.options.filter(n=>n!=='Form & Größe');for(const v of report.shopify.variants)v.optionValues.shift();}
  report.shopProduct=copy(shopProduct);
  report.shopify.metafields=[shopProductCutMetafield(shopProduct)];
 }
 c.workshopElementRights=rights;c.localResources.fonts=fonts;c.localResources.motifs=[...motifs.values()];
 delete c.familyAcrylic;delete c.steelFormats;delete c.quantityTierScope;delete c.quantityTiers;
 // The same catalogue precedence as the ordinary importer. Fixed products also
 // expose their common tier contract to the existing saved-offer price binding.
 if(list.some(s=>s.variants.some(v=>v.quantityTiers!==undefined)))c.quantityTierScope='complete-unit';
 if(shopProduct){
  const tiers=start.variants[0].quantityTiers;
  if(start.variants.some(v=>JSON.stringify(v.quantityTiers)!==JSON.stringify(tiers)))fail('Die Produktfarben benötigen unterschiedliche Shopify-Staffelverträge.');
  if(tiers!==undefined)c.quantityTiers=copy(tiers);
 }
 // Font/resource geometry validation still runs, as for every native product.
 p.revision='family-formats-'+createHash('sha256').update(JSON.stringify(c)).digest('hex').slice(0,24);
 const prepared=prepareConfig(c);report.shopify.availableVariants=familyFormatCombinations(prepared).length;
 return {config:prepared,report};
}
