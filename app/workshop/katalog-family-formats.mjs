// One review product per line/subcategory. No DB, Shopify, release or import writes.
import {familyProductConfig} from './product-families.mjs';
import {createHash} from 'node:crypto';
import {assignTargetSeries,approvedForFamily,designTargetCompatibility,designTargets} from './design-targets.mjs';
import {katalogDesignToTemplate,scaleTemplate} from './katalog-convert.mjs';
import {assessDesignTarget} from './design-target-rules.mjs';
import {customerUxConfig} from './customer-ux-policy.mjs';
import {prepareConfig} from '../configurator/variant-m/contract.mjs';
import {FAMILY_FORMATS_SCHEMA,FAMILY_FORMS,customerForm,familyFormatCombinations} from '../configurator/variant-m/family-formats.mjs';

const copy=v=>structuredClone(v),fail=m=>{throw Error(m);};
export const SIGN_FAMILIES=['steel-door-signs','acryl-3mm-tuerschilder-schwarz','acryl-3mm-tuerschilder-anthrazit'];
const color=f=>f.material.kind==='steel'?'edelstahl':f.material.variant;
const sameGeometry=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const slotKey=(s)=>customerForm(s.groupKey)+':'+s.widthMm+'x'+s.heightMm;
const optionLabel=s=>FAMILY_FORMS.find(([id])=>id===customerForm(s.form))[1]+' · '+s.label;

export async function planFamilyFormats(katalog,lineId,subcategoryId,{reviewUnreleased=false,designIds=null,available={},converter=null}={}){
 const line=katalog.lines.get(lineId),sub=line?.subcategories.find(s=>s.id===subcategoryId);
 if(!sub)fail('Linie oder Unterkategorie fehlt.');
 const families=line.families.filter(id=>SIGN_FAMILIES.includes(id)).map(id=>katalog.families.get(id));
 if(!families.length)fail('Keine freigegebene Türschild-Familienart.');
 const allMasters=katalog.designs.masters.filter(d=>!d.hidden&&(!designIds||designIds.includes(d.id))&&d.themes?.includes(sub.themeId));
 const report={schema:'gravuru-family-formats-plan/v1',lineId,subcategoryId,reviewUnreleased,shopifyWrites:false,sourceFamilies:families.map(f=>f.id),excluded:[],blocked:[],sizes:[],shopify:{options:families.length>1?['Form & Größe','Farbe','Befestigung']:['Form & Größe','Befestigung'],maximumVariants:2048,maximumOptions:3,variantIdsCreated:0,sources:['https://help.shopify.com/en/manual/products/variants/add-variants','https://shopify.dev/docs/api/admin-graphql/latest/mutations/productSet']}};
 const assigned=new Map(families.map(f=>[f.id,assignTargetSeries(f,allMasters.filter(d=>designTargets(d,katalog).some(t=>t.familie===f.id)&&(reviewUnreleased||approvedForFamily(d,f.id,katalog))),katalog)]));
 const needed=[...new Set([...assigned.values()].flatMap(list=>list.filter(a=>!a.oldSize).flatMap(a=>a.design.fonts||[])))];
 const {fonts,missing}=await katalog.fontResources(needed,{available,converter});report.fontsMissing=missing;
 const bank=new Map(),motifs=new Map(),rights={},formats=new Map(),colors=[],converted=new Map();let base;
 const theme=katalog.theme(sub.themeId);
 for(const family of families){
  const colorId=color(family);colors.push({id:colorId,label:colorId==='edelstahl'?'Edelstahl':colorId==='schwarz'?'Schwarz':'Anthrazit'});
  for(const size of family.sizes){
   // No generic family starter is exposed: it supplies geometry/options only.
   let config;
   try{const view={...family,groups:family.groups.filter(g=>g.key===size.groupKey),sizes:[size],mountingRules:family.mountingRules.filter(r=>size.mounting.includes(r.id))};config=familyProductConfig(view,size,1);}
   catch(error){report.blocked.push({familyId:family.id,sizeKey:size.key,reason:error.message});continue;}
   const p=config.profile,designs=[],unapprovedDesignIds=[];
   for(const a of assigned.get(family.id).filter(a=>!a.oldSize&&a.sizes.includes(size.key))){
    const compatibility=designTargetCompatibility(a.design,family,size,{katalog});
    if(compatibility.status==='passt nicht'){report.excluded.push({familyId:family.id,sizeKey:size.key,designId:a.design.id,issues:compatibility.issues});continue;}
    const key=family.id+'\0'+a.design.id;
    try{
     if(!converted.has(key))converted.set(key,katalogDesignToTemplate(a.design,family,theme,{fonts}));
     const t=converted.get(key),scaled=scaleTemplate(t.template,t.template.katalog.plateMm,[size.widthMm,size.heightMm],fonts,{contain:true});
     const fit=assessDesignTarget({master:a.design,template:scaled,family,size,fonts,motifs:()=>t.motifs});
     if(fit.status==='passt nicht'){report.excluded.push({familyId:family.id,sizeKey:size.key,designId:a.design.id,issues:fit.issues});continue;}
     const existing=bank.get(t.template.id);
     if(existing&&JSON.stringify(existing)!==JSON.stringify(t.template))fail('Widersprüchliche Vorlage '+t.template.id+'.');
     bank.set(t.template.id,copy(t.template));designs.push(t.template.id);if(!approvedForFamily(a.design,family.id,katalog))unapprovedDesignIds.push(t.template.id);rights[t.template.id]=copy(t.rights);
     for(const m of t.motifs){if(motifs.has(m.key)&&JSON.stringify(motifs.get(m.key))!==JSON.stringify(m))fail('Widersprüchliche Motivressource '+m.key+'.');motifs.set(m.key,copy(m));}
    }catch(error){report.excluded.push({familyId:family.id,sizeKey:size.key,designId:a.design.id,issues:[error.message]});}
   }
   const slot=slotKey(size),format=formats.get(slot)||{key:size.key,form:size.groupKey,label:size.label,geometry:copy(p.geometry),variants:[]};
   if(!sameGeometry(format.geometry,p.geometry))fail('Die Farben haben verschiedene Geometrien: '+slot+'.');
   format.variants.push({color:colorId,familyId:family.id,sizeKey:size.key,basePriceCents:size.baseCents,material:copy(p.material),mounting:copy(p.optionGroups.find(g=>g.id==='mounting').values),designIds:designs,...(reviewUnreleased?{unapprovedDesignIds}:{}),...(config.quantityTiers?{quantityTiers:copy(config.quantityTiers)}:{})});formats.set(slot,format);
   report.sizes.push({familyId:family.id,sizeKey:size.key,form:customerForm(size.groupKey),basePriceCents:size.baseCents,designs:designs.length,mountings:format.variants.at(-1).mounting.length});
   if(!base&&size.groupKey==='AB'&&size.widthMm===120&&size.heightMm===80&&designs.length)base=config;
  }
 }
 const list=[...formats.values()],start=list.find(s=>s.form==='AB'&&s.geometry.width===120&&s.geometry.height===80);
 report.shopify.plannedVariants=list.reduce((sum,s)=>sum+s.variants.reduce((n,v)=>n+v.mounting.length,0),0);
 report.shopify.withinLimits=report.shopify.plannedVariants<=2048&&report.shopify.options.length<=3;
 report.shopify.variants=list.flatMap(s=>s.variants.flatMap(v=>v.mounting.map(m=>({source:{familyId:v.familyId,sizeKey:v.sizeKey,mounting:m.id},optionValues:[optionLabel(s),...(colors.length>1?[colors.find(c=>c.id===v.color).label]:[]),m.label],priceCents:v.basePriceCents+m.priceCents,designAvailable:!!v.designIds.length,shopifyVariantId:null}))));
 if(new Set(report.shopify.variants.map(v=>JSON.stringify(v.optionValues))).size!==report.shopify.plannedVariants)fail('Shopify-Auswahltexte sind nicht eindeutig.');
 report.unavailable=report.sizes.filter(s=>!s.designs);
 if(!base||!start){report.blocked.push({reason:'AB 12 × 8 cm hat kein verfügbares Ziel-Design; kein Ersatz-Startdesign erfunden.'});return {config:null,report};}
 const c=customerUxConfig(base),p=c.profile;
 p.id='katalog-formate-'+line.id+'-'+sub.id;p.revision='family-formats-v1';p.binding={kind:'local-review',productId:'local-'+p.id};p.name=line.name+' – '+sub.name;
 p.optionGroups=[{id:'size',name:'Form & Größe',defaultValueId:start.key,required:true,values:list.map(s=>({id:s.key,label:optionLabel(s),priceCents:0,currency:'EUR'}))},...(colors.length>1?[{id:'color',name:'Farbe',defaultValueId:colors[0].id,required:true,values:colors.map(v=>({...v,priceCents:0,currency:'EUR'}))}]:[]),{id:'mounting',name:'Befestigung',defaultValueId:'K00',required:true,values:[...new Map(list.flatMap(s=>s.variants.flatMap(v=>v.mounting.map(m=>[m.id,{id:m.id,label:m.label,priceCents:0,currency:'EUR'}])))).values()]}];
 c.familyFormats={schema:FAMILY_FORMATS_SCHEMA,source:{lineId,subcategoryId,reviewUnreleased},defaultSize:start.key,defaultColor:colors[0].id,colors,formats:list,designs:[...bank.values()]};
 c.workshopElementRights=rights;c.localResources.fonts=fonts;c.localResources.motifs=[...motifs.values()];
 delete c.familyAcrylic;delete c.steelFormats;delete c.quantityTierScope;delete c.quantityTiers;
 // Font/resource geometry validation still runs, as for every native product.
 p.revision='family-formats-'+createHash('sha256').update(JSON.stringify(c)).digest('hex').slice(0,24);
 const prepared=prepareConfig(c);report.shopify.availableVariants=familyFormatCombinations(prepared).length;
 return {config:prepared,report};
}
