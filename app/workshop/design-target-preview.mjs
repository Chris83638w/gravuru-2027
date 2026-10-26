import {katalogFor,patchDesign,designTargetChecksum} from './design-dashboard.mjs';
import {designTargets,designTargetCompatibility,assignTargetSeries} from './design-targets.mjs';
import {familyProductConfig} from './product-families.mjs';
import {katalogDesignToTemplate,parseDesignSvg,scaleTemplate,scaleEmbeddedMotifs} from './katalog-convert.mjs';
import {convertFont} from './font-library.mjs';
import {productPreview} from './product-preview.mjs';
import {assessDesignTarget} from './design-target-rules.mjs';
const fail=(status,message)=>{throw Object.assign(Error(message),{status,code:'design_target_invalid'});};
export async function targetDesignPreview(root,{reihe,id,familie,size:requestedSize},{available={},converter=convertFont}={}){
 const katalog=katalogFor(root,{maxAgeMs:0}),master=katalog.designs.masters.find(d=>d.seriesFolder===reihe&&d.id===id),family=katalog.families.get(familie);
 if(!master)fail(404,'Katalogdesign nicht gefunden.');if(!family)fail(422,'Familie fehlt.');
 if(!designTargets(master,katalog).some(t=>t.familie===familie))fail(422,'Dieses Ziel wurde noch nicht bestätigt.');
 const assigned=assignTargetSeries(family,[master],katalog)[0],applicable=family.sizes.filter(s=>assigned.sizes.includes(s.key));
 const size=requestedSize?family.sizes.find(s=>s.key===requestedSize):applicable[0]||family.sizes[0];
 if(!size)fail(422,'Größe gehört nicht zu dieser Familie.');
 const svgText=master.svg(),sourceMaster={...master,svg:()=>svgText},names=[...new Set(parseDesignSvg(svgText).layers.filter(l=>l.kind==='text'||l.text).map(l=>l.font))],resources=await katalog.fontResources(names,{available,converter});
 const checksum=designTargetChecksum(master,family,svgText,resources.versions);
 if(resources.missing.length)fail(422,'Schrift fehlt: '+resources.missing.join(', ')+'.');
 const fonts=resources.fonts,converted=katalogDesignToTemplate(master,family,katalog.theme(master.themes?.[0]),{fonts,svgText});
 const scaled=scaleTemplate(converted.template,master.plateMm,[size.widthMm,size.heightMm],fonts,{contain:true}),motifs=scaleEmbeddedMotifs(converted.motifs,scaled.katalog.scale);
 const compatibility=designTargetCompatibility(master,family,size,{katalog}),variantRequired=compatibility.variantRequired;
 const evaluate=(candidate)=>{const t=scaleTemplate(converted.template,master.plateMm,[candidate.widthMm,candidate.heightMm],fonts,{contain:true}),m=scaleEmbeddedMotifs(converted.motifs,t.katalog.scale);return {...assessDesignTarget({master:sourceMaster,template:t,family,size:candidate,fonts,motifs:m}),size:candidate.key,label:candidate.label};};
 const fit=evaluate(size),checks=applicable.map(evaluate);
 if(variantRequired){fit.status='passt nicht';fit.issues=[...fit.issues,...compatibility.issues];}
 const rank={'passt':0,'prüfen':1,'passt nicht':2},reviewFit={status:variantRequired||!checks.length?'passt nicht':checks.reduce((status,item)=>rank[item.status]>rank[status]?item.status:status,'passt'),issues:checks.flatMap(item=>item.issues.map(issue=>item.label+': '+issue)),sizes:checks};
 if(variantRequired)reviewFit.issues.push(...fit.issues);
 if(!checks.length&&!reviewFit.issues.length)reviewFit.issues.push('Keine kompatible Zielgröße. Eine Variante oder Klärung der Quelle ist erforderlich.');
 const view=structuredClone(family),viewSize=structuredClone(size);view.groups=view.groups.filter(g=>g.key===size.groupKey);view.options=[];delete view.quantityTiers;delete view.backing;view.mountingRules=view.mountingRules.filter(r=>size.mounting.includes(r.id));for(const rule of view.mountingRules)rule.priceCents=0;viewSize.baseCents=0;delete viewSize.quantityTiers;if(view.photo)view.photo.extraPriceCents=0;view.sizes=[viewSize];
 const compatible=new Set(applicable.map(s=>s.key)),sizeOption=s=>{const group=family.groups.find(g=>g.key===s.groupKey);return {key:s.key,sizeLabel:s.label,label:s.label+' · '+group.name,groupKey:group.key,groupName:group.name,compatible:compatible.has(s.key)};};
 const sizes=family.sizes.map(sizeOption).sort((a,b)=>Number(b.compatible)-Number(a.compatible));
 const response={checksum,reviewFit,fit,familie,size:sizeOption(size),sizes,variantRequired};
 let config;try{config=familyProductConfig(view,viewSize,1,{previewOnly:true});}catch(error){if(error.status!==422)throw error;const message=error.message.startsWith('Vorschau offen:')?error.message:'Vorschau offen: '+error.message;return {...response,svg:null,fit:{...fit,status:'passt nicht',issues:[...fit.issues,message]},reviewFit:{...reviewFit,status:'passt nicht',issues:[...reviewFit.issues,message]}};}
 config.localResources={...config.localResources,fonts,motifs};config.profile.designs=[scaled];config.profile.defaultDesignId=scaled.id;config.photo.enabled=scaled.objects.some(o=>o.type==='photoSlot');
 const mounting=config.profile.optionGroups.find(g=>g.id==='mounting'),drilled=mounting?.values.find(v=>v.holes?.length);if(drilled)mounting.defaultValueId=drilled.id;
 return {...response,svg:productPreview({universal:config},{keepout:false,designArea:true})};
}

// HTTP only accepts input fields; review/checksum are produced here, never from the browser.
export async function patchDesignWithTargetReview(root,input,options={}){
 if(input?.onlyPassing!==undefined&&typeof input.onlyPassing!=='boolean')fail(422,'onlyPassing ist true oder false.');
 if(input?.onlyPassing===true&&(input.freigegeben!==true||typeof input.checksum!=='string'||!/^[a-f0-9]{64}$/.test(input.checksum)))fail(422,'Sammelfreigabe benötigt eine geprüfte Zielvorschau mit aktueller Prüfsumme.');
 if(input?.freigegeben!==true)return patchDesign(root,input,options);
 const katalog=katalogFor(root,{maxAgeMs:0}),master=katalog.designs.masters.find(d=>d.seriesFolder===input.reihe&&d.id===input.designId);
 if(!master)fail(404,'Katalogdesign nicht gefunden.');
 const targets=designTargets(master,katalog),familie=input.familie??(targets.length===1?targets[0].familie:null);
 const result=await targetDesignPreview(root,{reihe:input.reihe,id:input.designId,familie},options);
 if(input.checksum!==undefined&&input.checksum!==result.checksum)fail(409,'Das Design oder die Familie wurde seit der Vorschau geändert. Vorschau neu öffnen.');
 if(result.reviewFit.status==='passt nicht')fail(422,'Freigabe nicht möglich: '+result.reviewFit.issues.join(' '));
 if(input.onlyPassing===true&&result.reviewFit.status!=='passt')fail(422,'Sammelfreigabe nur bei „passt“. Dieses Ziel muss einzeln geöffnet und geprüft werden: '+result.reviewFit.issues.join(' '));
 return patchDesign(root,input,{...options,targetReview:{familie,checksum:result.checksum,fit:result.reviewFit}});
}
