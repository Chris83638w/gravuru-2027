// Mikail, 04.11.2026 / #85: one physical plate, separate customer selections
// by catalogue theme, audience and original photo template. No new approvals.
import {createHash} from 'node:crypto';
import {validateProductDocument,resolveProduct} from './product-model.mjs';
import {quote,variantCombinations} from '../configurator/variant-m/contract.mjs';
import {productPreview} from './product-preview.mjs';
import {applySlateCustomerRules} from './slate-customer-rules.mjs';
import {offeredFamilyIds} from './subcategory-materials.mjs';

const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const compare=new Intl.Collator('de',{numeric:true,sensitivity:'variant'}).compare;
const normalized=value=>String(value??'').trim().replace(/\s+/g,' ').toLocaleLowerCase('de');
const slug=value=>normalized(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export const slateAudience=master=>{
 const value=master?.json?.katalog?.zielgruppe??master?.json?.targetGroup;
 return typeof value==='string'&&value.trim()?value.trim().replace(/\s+/g,' '):null;
};
export const slatePhotoKind=template=>template.objects.some(o=>o.type==='photoSlot')?'mit':'ohne';

// This function consumes the approved, geometry-checked native preparation.
// Source metadata classifies templates; it never adds a template or a release.
export function slateProductGroups(document,{familyId,sizeKey,masters,themes=[]}){
 if(!familyId?.startsWith('schiefer-tafeln-')||!sizeKey)throw Error('Schieferfamilie und Größenschlüssel fehlen.');
 if(document.config?.profile?.material?.kind!=='slate')throw Error('Eine native Schiefertafel ist erforderlich.');
 const groups=new Map(),excluded=[];
 const index=masters instanceof Map?masters:new Map(masters.map(d=>[d.id,d]));
 for(const template of document.config.profile.designs){
  const sourceId=template.katalog?.designId;
  if(!sourceId)continue; // The generic "Eigene Gestaltung" scaffold is not a theme design.
  const master=index.get(sourceId),target=template.katalog.target;
  if(!master||master.hidden||target?.familyId!==familyId||target.released!==true||target.explicit!==true){excluded.push({designId:sourceId,reason:'Freigegebene native Zielzuordnung fehlt.'});continue;}
  const themeIds=[...new Set(master.themes??[])].sort(compare);
  if(!themeIds.length){excluded.push({designId:sourceId,reason:'Katalogthema fehlt.'});continue;}
  for(const themeId of themeIds){
   const theme=themes.find(t=>t.id===themeId);
   if(!theme){excluded.push({designId:sourceId,reason:'Katalogthema unbekannt: '+themeId});continue;}
   const audience=slateAudience(master),photoDesigns=slatePhotoKind(template);
   const scope={familyId,sizeKey,themeId,audience:audience===null?null:normalized(audience),photoDesigns};
   const digest=hash(scope),key='schiefer-gruppe:'+digest.slice(0,32);
   if(!groups.has(key))groups.set(key,{key,...scope,audienceLabel:audience,themeName:theme.name,
    handle:['schiefer',slug(sizeKey),slug(themeId),slug(audience||'thema'),photoDesigns+'-foto',digest.slice(0,8)].join('-'),designs:[]});
   groups.get(key).designs.push({id:template.id,sourceId});
  }
 }
 return {groups:[...groups.values()].sort((a,b)=>compare(a.key,b.key)).map(g=>({...g,designs:g.designs.sort((a,b)=>compare(a.sourceId,b.sourceId)||compare(a.id,b.id))})),excluded};
}

export function slateGroupDocument(source,group,{startDesign}={}){
 const selected=group.designs.find(d=>d.sourceId===(startDesign??group.startDesign??group.designs[0]?.sourceId));
 if(!selected)throw Error('Das festgelegte Hauptbild-Design fehlt in dieser Produktgruppe: '+startDesign);
 const result=structuredClone(source),c=result.config,ids=new Set(group.designs.map(d=>d.id));
 c.profile.designs=group.designs.map(d=>{
  const template=c.profile.designs.find(t=>t.id===d.id);
  if(!template||slatePhotoKind(template)!==group.photoDesigns||!template.themes?.includes(group.themeId))throw Error('Produktgruppe widerspricht der nativen Vorlage: '+d.id);
  return template;
 });
 c.profile.defaultDesignId=selected.id;
 c.profile.id='slate-group-'+hash(group.key).slice(0,32);
 c.profile.binding={...c.profile.binding,productId:'local-'+c.profile.id};
 c.profile.themeId=group.themeId;
 if(group.themeId==='gedenken'){
  if(['mensch','menschen'].includes(group.audience))c.motifTheme='remembranceHuman';
  if(['tier','tiere'].includes(group.audience))c.motifTheme='remembranceAnimal';
 }
 const audience=group.audienceLabel&&normalized(group.audienceLabel)!=='allgemein'?' · '+group.audienceLabel:'';
 result.name=[group.mainProductName??group.themeName+audience,source.name,group.photoDesigns==='mit'?'mit Foto':'ohne Foto'].join(' · ');
 c.profile.name=result.name;
 result.seo.title=result.name.slice(0,70);
 result.elementRights=Object.fromEntries([...ids].map(id=>[id,result.elementRights[id]]));
 result.categoryIds=[...new Set([...result.categoryIds,'thema-'+slug(group.themeId),'foto-'+group.photoDesigns,...(group.audience?['zielgruppe-'+slug(group.audience)]:[])])];
 c.localResources.photoExamples=(c.localResources.photoExamples??[]).filter(e=>ids.has(e.designId));
 if(c.photo.hints)c.photo.hints=c.photo.hints.filter(h=>ids.has(h.designId));
 const usedMotifs=new Set(c.profile.designs.flatMap(d=>d.objects.filter(o=>o.type==='motif').map(o=>o.motif)));
 c.localResources.motifs=c.localResources.motifs.filter(m=>!m.embeddedOnly||usedMotifs.has(m.key));
 // Preserve the separately priced customer upload feature even for "ohne Foto".
 result.config=applySlateCustomerRules(c);
 return validateProductDocument(result);
}

// Respect catalogue main products (including their main-image designs), rather
// than replacing four established dog products by a new arbitrary starter.
export function slateMainProducts(groups,{lines=[],excluded=[]}={}){
 const result=[];
 for(const group of groups){
  const choices=[];let missingDeclaredStarter=false,excludedMaterialOffer=false,hasMaterialOffer=false;
  for(const line of lines instanceof Map?lines.values():lines){
   for(const sub of line.subcategories){
    if(sub.themeId!==group.themeId||sub.photoDesigns&&sub.photoDesigns!==group.photoDesigns)continue;
    const offered=offeredFamilyIds(line,sub);
    if(!offered.includes(group.familyId)){
     if(sub.familyIdsOffered!=null&&line.families.includes(group.familyId)){excludedMaterialOffer=true;excluded.push({groupKey:group.key,reason:'Katalog-Unterkategorie '+line.id+'/'+sub.id+': Materialfamilie nicht angeboten.'});}
     continue;
    }
    hasMaterialOffer=true;
    if(sub.sizesOffered&&!sub.sizesOffered.includes(group.sizeKey))continue;
    const mains=sub.mainProducts?.length?sub.mainProducts:sub.startDesign?[{id:sub.id,name:sub.name,startDesign:sub.startDesign}]:[];
    for(const main of mains){
     if(main.sizesOffered&&!main.sizesOffered.includes(group.sizeKey))continue;
     if(!group.designs.some(d=>d.sourceId===main.startDesign)){
      // An existing main product may belong to another photo/audience group.
      // If its starter is absent everywhere, never manufacture a replacement.
      if(!groups.some(g=>g.familyId===group.familyId&&g.sizeKey===group.sizeKey&&g.themeId===group.themeId&&g.designs.some(d=>d.sourceId===main.startDesign))){
       missingDeclaredStarter=true;excluded.push({groupKey:group.key,designId:main.startDesign,reason:'Katalog-Hauptprodukt '+line.id+'/'+sub.id+'/'+main.id+': Startdesign nicht vorbereitet.'});
      }
      continue;
     }
     const identity={group:group.key,line:line.id,subcategory:sub.id,main:main.id},digest=hash(identity);
     choices.push({...group,key:'schiefer-gruppe:'+digest.slice(0,32),handle:group.handle+'-'+slug(main.id)+'-'+digest.slice(0,8),
      startDesign:main.startDesign,mainProductName:main.name??sub.name,catalogueMainProduct:identity,externalIds:main.externalIds??{}});
    }
   }
  }
  result.push(...(choices.length?choices:missingDeclaredStarter||excludedMaterialOffer&&!hasMaterialOffer?[]:[group]));
 }
 return result;
}

export function slateGroupVariants(document){
 const c=document.config;
 return variantCombinations(c).map(options=>({options,
  label:Object.entries(options).map(([g,v])=>c.profile.optionGroups.find(x=>x.id===g).values.find(x=>x.id===v).label).join(' · '),
  priceCents:quote(c,[],c.profile.defaultDesignId,options).unitCents}));
}

export function saveSlateGroup(repository,{key,document,previous}){
 const fingerprint=hash(document),prior=repository.importItem(key);
 let entry={key,fingerprint,document};
 if(prior){
  const current=repository.get(prior.id),currentHash=hash(current.document);
  if(currentHash===fingerprint)return {id:prior.id,revision:current.revision,fingerprint,created:false};
  if(!previous||previous.id!==prior.id||previous.revision!==current.revision||previous.fingerprint!==currentHash)throw Error('Produktgruppe wurde außerhalb dieses Imports geändert; vorhandenen Stand zuerst abgleichen.');
  entry={...entry,key:key+':r'+(current.revision+1)+':'+fingerprint.slice(0,16),action:'update',productId:prior.id,expectedRevision:current.revision};
 }else if(previous)throw Error('Die zuvor gespeicherte Produktgruppe fehlt.');
 const saved=repository.importBatch([entry])[0];
 return {...saved,revision:repository.get(saved.id).revision,fingerprint};
}

// Render exactly the saved default. Missing starters and photo assets are errors,
// never a fallback to the first template or an unrelated stock photograph.
export function slateGroupMainImage(document,{examples=[]}={}){
 const {designId,design,resolvedOptions}=resolveProduct(document);
 for(const slot of design.objects.filter(o=>o.type==='photoSlot')){
  if(!examples.some(e=>e.designId===designId&&e.slotId===slot.id&&e.url))throw Error('Musterfoto für Hauptbild fehlt: '+slot.id);
 }
 const preview=structuredClone(document.config);
 // The main image contains the same artwork, without a non-clickable UI button.
 preview.photo.hints=design.objects.filter(o=>o.type==='photoSlot').map(o=>({designId,slotId:o.id,enabled:false}));
 const svg=productPreview({universal:preview},{designId,options:resolvedOptions,examples});
 return {designId,sourceDesignId:design.katalog.designId,options:resolvedOptions,sha256:createHash('sha256').update(svg).digest('hex'),svg};
}
