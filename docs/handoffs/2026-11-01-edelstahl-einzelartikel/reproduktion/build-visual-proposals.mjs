import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
import {convertFont} from '../../../../app/workshop/font-library.mjs';
import {openKatalog} from '../../../../app/workshop/katalog-source.mjs';
import {assignTargetSeries,approvedForFamily} from '../../../../app/workshop/design-targets.mjs';
import {katalogDesignToTemplate,scaleTemplate} from '../../../../app/workshop/katalog-convert.mjs';
import {assessDesignTarget} from '../../../../app/workshop/design-target-rules.mjs';
import {familyProductConfig} from '../../../../app/workshop/product-families.mjs';
import {customerUxConfig} from '../../../../app/workshop/customer-ux-policy.mjs';
import {prepareConfig} from '../../../../app/configurator/variant-m/contract.mjs';
const [snapshot,catalogueRoot,destination,availableFontConfig]=process.argv.slice(2);if(!destination)throw Error('Arguments: visual-source.json catalogue-root output-dir [font-config.json]');
const out=path.resolve(destination);fs.mkdirSync(out,{recursive:true});
const source=JSON.parse(fs.readFileSync(snapshot)),k=openKatalog(path.resolve(catalogueRoot));
const family=source.files.find(f=>f.path==='familien/edelstahl/steel-door-signs.json').data;
const previous=JSON.parse(fs.readFileSync(new URL('../artikel-entwuerfe.json',import.meta.url))).articles;
const fontNames=[...new Set(source.files.filter(f=>f.svg).flatMap(f=>f.data.fonts||[]))];
const available=availableFontConfig?JSON.parse(fs.readFileSync(availableFontConfig)).localResources.fonts:{};
const {fonts,missing}=await k.fontResources(fontNames,{available,converter:convertFont});if(missing.length)throw Error('Missing fonts: '+missing.join(', '));
const theme=k.theme('familienschilder');
const masters=source.files.filter(f=>f.svg&&!f.data.hidden&&f.data.texts?.length&&f.data.themes?.some(t=>['namensschilder','familienschilder'].includes(t))).map(f=>({...f.data,json:f.data,fields:f.data.fields||{},fonts:f.data.fonts||[],seriesFolder:f.path.split('/')[1],svg:()=>f.svg,source:'lieferform2',record:f})).filter(d=>approvedForFamily(d,family.id,k)||d.record.roundReviewSource);
k.families.set(family.id,family);
const assigned=assignTargetSeries(family,masters,k),converted=new Map(),candidates=new Map(),excluded=[];
const norm=s=>s.normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim();
let checked=0;
for(const size of family.sizes){const options=[];
 for(const a of assigned.filter(a=>!a.oldSize&&a.sizes.includes(size.key))){const d=a.design;
  try{if(!converted.has(d.id))converted.set(d.id,katalogDesignToTemplate(d,family,theme,{fonts}));const t=converted.get(d.id),scaled=scaleTemplate(t.template,t.template.katalog.plateMm,[size.widthMm,size.heightMm],fonts,{contain:true});const fit=assessDesignTarget({master:d,template:scaled,family,size,fonts,motifs:()=>t.motifs});checked++;
   if(fit.status==='passt nicht'){excluded.push({size:size.key,id:d.id,...fit});continue;}
   options.push({d,t,scaled,fit,exact:Math.abs(d.plateMm[0]-size.widthMm)<.01&&Math.abs(d.plateMm[1]-size.heightMm)<.01});
  }catch(e){excluded.push({size:size.key,id:d.id,error:e.message});}
 }
 options.sort((a,b)=>Number(a.fit.status!=='passt')-Number(b.fit.status!=='passt')||Number(b.exact)-Number(a.exact)||a.d.designNo-b.d.designNo||a.d.id.localeCompare(b.d.id));candidates.set(size.key,options);
 console.log(size.key+' '+options.length);
}
const pin='GR-ES-RE-80X35-T15',pinId='TRE-V2A-8x3,5-D4',pinned=candidates.get(pin).find(c=>c.d.id===pinId);assert(pinned);
// D numbers identify the same recurring base layout across the supplied form series.
// Conservatively reserve the entire D number, even when its form-specific title differs.
const baseDesign=d=>'D'+d.designNo;
const owners=new Map([[baseDesign(pinned.d),pin]]),chosen=new Map([[pin,pinned]]);
function place(key,seen){for(const c of candidates.get(key)){const n=baseDesign(c.d);if(n===baseDesign(pinned.d)||seen.has(n))continue;seen.add(n);const owner=owners.get(n);if(!owner||owner!==pin&&place(owner,seen)){owners.set(n,key);chosen.set(key,c);return true;}}return false;}
for(const s of [...family.sizes].sort((a,b)=>candidates.get(a.key).length-candidates.get(b.key).length))if(s.key!==pin)place(s.key,new Set());
// Keep the same distinct base designs, but swap their slots when both fits improve.
// In particular do not put a fine motif in a small format if a larger slot avoids its warning.
const cost=c=>(c.fit.status==='passt'?0:1000)+c.fit.issues.length;
let improved=true;
while(improved){improved=false;const entries=[...chosen].filter(([key])=>key!==pin);
 for(let i=0;i<entries.length&&!improved;i++)for(let j=i+1;j<entries.length;j++){
  const [ka,a]=entries[i],[kb,b]=entries[j],aa=candidates.get(ka).filter(c=>baseDesign(c.d)===baseDesign(b.d)).sort((x,y)=>cost(x)-cost(y))[0],bb=candidates.get(kb).filter(c=>baseDesign(c.d)===baseDesign(a.d)).sort((x,y)=>cost(x)-cost(y))[0];
  if(aa&&bb&&cost(aa)+cost(bb)<cost(a)+cost(b)){chosen.set(ka,aa);chosen.set(kb,bb);improved=true;console.log('Fit swap '+ka+' / '+kb);break;}
 }
}
const rows=[],configs={};
for(let index=0;index<family.sizes.length;index++){const size=family.sizes[index],c=chosen.get(size.key),article=previous.find(a=>a.sizeKey===size.key);let config=null;
 if(c){config=customerUxConfig(familyProductConfig(family,size,1,{previewOnly:true}));config.profile.designs=[c.scaled];config.profile.defaultDesignId=c.scaled.id;config.localResources.fonts=Object.fromEntries(c.t.fonts.map(f=>[f,fonts[f]]));config.localResources.motifs=c.t.motifs;config.profile.name=article.title;config.workshopElementRights={[c.scaled.id]:c.t.rights};config=prepareConfig(config);configs[size.key]=config;}
 rows.push({number:index+1,sizeKey:size.key,title:article.title,form:article.form,displaySize:article.displaySize,sourcePriceCents:size.baseCents,designId:c?.d.id||null,designName:c?.d.name||null,exampleTexts:c?.d.texts.map(t=>t.text)||[],sourcePath:c?.d.record.path||null,sourceBlob:c?.d.record.oid||null,svgBlob:c?.d.record.svgBlob||null,sizeReviewSource:c?.d.record.sizeReviewSource||null,roundReviewSource:c?.d.record.roundReviewSource||null,sourceTargetApproved:c?approvedForFamily(c.d,family.id,k):false,fit:c?.fit||null,candidateCount:candidates.get(size.key).length,sourceDimensions:c?.d.plateMm||null,targetDimensions:[size.widthMm,size.heightMm],scaled:!!c&&!c.exact,userConfirmed:size.key===pin,visualReview:'offen',image:null});
}
assert.equal(new Set(rows.filter(r=>r.designId).map(r=>norm(r.designName))).size,chosen.size);assert.equal(rows.find(r=>r.sizeKey===pin).designId,pinId);
fs.writeFileSync(path.join(out,'visual-proposals.json'),JSON.stringify({sources:source.reviewSources,deduplication:'Jede D-Grundgestaltung höchstens einmal, auch über Formen und abweichende Katalognamen hinweg. Kein automatischer visueller Einzigartigkeitsnachweis.',counts:{sizes:rows.length,proposals:chosen.size,open:rows.length-chosen.size,checkedPairs:checked,excludedPairs:excluded.length,fitPass:rows.filter(r=>r.fit?.status==='passt').length,fitReview:rows.filter(r=>r.fit?.status==='prüfen').length,unapproved:rows.filter(r=>r.designId&&!r.sourceTargetApproved).length},rows},null,2)+'\n');
fs.writeFileSync(path.join(out,'visual-configs.json'),JSON.stringify(configs)+'\n');fs.writeFileSync(path.join(out,'visual-excluded.json'),JSON.stringify(excluded,null,2)+'\n');console.log(JSON.stringify({proposals:chosen.size,open:rows.filter(r=>!r.designId).map(r=>r.sizeKey)}));
