import {validateContourGeometry} from './contour-geometry.mjs';
import {request} from './motifs.mjs';
import {LIST,ONE,SAVE,decode,saveDoorbell,publishDoorbell,validateProfile} from './doorbells.mjs';
import {validateDesignContent,objectIssue,validateGeometryHoles,validContentId,DESIGN_LIMITS} from './design-content.mjs';
import {MATERIAL_COLORS,getProcessingProfile,validateProcessingProfile,applyProcessingProfile} from './processing-profiles.mjs';
import {validateUniversalElements,validateOptionGroups} from './universal-elements.mjs';
export function dimensions(p){return p.kind==='layered-doorbell'?{width:160,height:280,margin:10,shape:'rect'}:{width:p.geometry.width,height:p.geometry.height,margin:p.geometry.safeMarginMm??2,shape:p.geometry.shape||'rect',radius:p.geometry.cornerRadiusMm||0};}
export function validateStudio(p,original,{extraFontIds=[]}={}){
 if(!p||!original)throw Error('Ungültige Produktvorlage.');
 if(p.kind==='layered-doorbell'){validateOptionGroups(p.optionGroups);return validateProfile(p,original,{extraFontIds});}
 if(p.kind!=='universal-product'||!validContentId(p.id)||p.id!==original.id||JSON.stringify(p.binding)!==JSON.stringify(original.binding))throw Error('Ungültige Produktzuordnung.');
 if(typeof p.name!=='string'||!p.name.trim()||p.name.length>200)throw Error('Bitte einen Produktnamen eingeben.');
 if(!p.geometry||!p.material)throw Error('Produktgeometrie oder Material fehlt.');
 const {width,height,margin,shape,radius}=dimensions(p);
 if(![width,height,margin,radius].every(Number.isFinite)||width<10||height<10||width>2000||height>2000||margin<0||margin*2>=Math.min(width,height)||!['rect','ellipse','contour'].includes(shape)||radius<0||radius>Math.min(width,height)/2)throw Error('Bitte gültige Produktmaße und eine passende Form eingeben.');
 if(!['steel','acrylic','wood','slate','other','print'].includes(p.material.kind)||!/^#[0-9a-f]{6}$/i.test(p.material.color)||!Number.isFinite(p.material.thicknessMm)||p.material.thicknessMm<=0||p.material.thicknessMm>100)throw Error('Bitte Material, Farbe und Stärke prüfen.');
 validateProcessingProfile(p);validateOptionGroups(p.optionGroups);
 if(shape==='contour'){validateContourGeometry(p.geometry);for(const group of p.optionGroups||[])for(const value of group.values||[])if(value.holes!==undefined)validateGeometryHoles({...p,geometry:{...p.geometry,holes:value.holes}});}
 validateGeometryHoles(p);
 if(!Array.isArray(p.designs)||!p.designs.length||p.designs.length>DESIGN_LIMITS.maxDesigns||p.designs.some(d=>!d)||new Set(p.designs.map(d=>d.id)).size!==p.designs.length)throw Error('Bitte 1 bis '+DESIGN_LIMITS.maxDesigns+' Designs mit eindeutigen Kennungen verwenden.');
 for(const d of p.designs){if(typeof d.name!=='string'||!d.name.trim()||d.name.length>200)throw Error('Jedes Design braucht einen Namen mit höchstens 200 Zeichen.');validateDesignContent(d,{universal:true,extraFontIds});validateUniversalElements(d);for(const o of d.objects){const issue=objectIssue(o,p);if(issue)throw Error(d.name+': '+issue);}}
 return p;
}
export async function listStudioProducts(){const rows=[];let after=null;const seen=new Set();do{const page=(await request(LIST,{after})).metaobjects;rows.push(...page.nodes.map(decode).filter(r=>['layered-doorbell','universal-product'].includes(r.profile.kind)));if(!page.pageInfo.hasNextPage)break;after=page.pageInfo.endCursor;if(!after||seen.has(after))throw Error('Die Produktliste ist unvollständig.');seen.add(after);}while(true);return rows.sort((a,b)=>a.name.localeCompare(b.name,'de'));}
export async function saveStudio(row,p){if(p.kind==='layered-doorbell')return saveDoorbell(row,p);validateStudio(p,row.profile);const handle={type:'gravuru_configurator',handle:row.handle},fresh=decode((await request(ONE,{handle})).metaobjectByHandle);if(fresh.updatedAt!==row.updatedAt)throw Error('Zwischenzeitlich geändert. Bitte das Produkt neu öffnen.');const next=structuredClone(p);next.admin={...next.admin,draftRevision:crypto.randomUUID(),savedAt:new Date().toISOString()};const fields=[{key:'name',value:next.name},{key:'revision',value:next.admin.draftRevision},{key:'configuration',value:JSON.stringify(next)}];const result=(await request(SAVE,{handle,metaobject:{fields}})).metaobjectUpsert;if(result.userErrors?.length)throw Error(result.userErrors.map(e=>e.message).join(' · '));const saved=decode((await request(ONE,{handle})).metaobjectByHandle);if(saved.profile.admin.draftRevision!==next.admin.draftRevision)throw Error('Speichern konnte nicht bestätigt werden.');return saved;}
export async function publishStudio(row){if(row.profile.kind==='layered-doorbell')return publishDoorbell(row);throw Error('Diese Produktvorlage ist gespeichert. Vor der ersten Shopfreigabe muss der passende Warenkorb- und Fertigungsexport mit dem Artikel verbunden werden.');}
export function newUniversalProfile({name,type,width,height,material,profileId,thicknessMm,product}){
 const id='produkt-'+crypto.randomUUID(),revision=crypto.randomUUID();
 if(!Number.isFinite(Number(thicknessMm))||Number(thicknessMm)<=0||Number(thicknessMm)>100)throw Error('Bitte die tatsächliche Materialstärke in Millimetern angeben.');
 const kind=material||'other';
 const p={schemaVersion:1,kind:'universal-product',id,name,productType:type,revision,
  geometry:{width:Number(width),height:Number(height),shape:'rect',cornerRadiusMm:0,safeMarginMm:2,holes:[]},
  material:{kind,color:MATERIAL_COLORS[kind],thicknessMm:Number(thicknessMm)},
  frames:[{key:'standard',name:'Produktansicht',acrylic:{x:0,y:0,width:Number(width),height:Number(height)}}],mounting:{options:[{key:'K00',name:'Keine Befestigung'}]},optionGroups:[],features:{motifsAllowed:true},
  binding:{shop:'gravuru-design.myshopify.com',productId:product.id,handle:product.handle,url:'https://gravuru-design.myshopify.com/products/'+product.handle},
  designs:[{id:'design-'+crypto.randomUUID(),name:'Meine erste Vorlage',category:'Schlicht & modern',collections:[],marks:[],objects:[{id:crypto.randomUUID(),type:'text',text:'Dein Text',font:'Montserrat',size:Math.max(DESIGN_LIMITS.minFontSize,Math.min(Number(width)/12,Number(height)/5,8)),x:Number(width)/2,y:Number(height)/2,w:Number(width)/2,h:Number(height)/4,rotation:0,color:'#000000',bold:false,templateOrigin:true,customerEditable:true}]}],admin:{draftRevision:revision,publishedRevision:null,createdAt:new Date().toISOString()}};
 applyProcessingProfile(p,profileId||getProcessingProfile(p).id);return p;
}
export async function createStudioProduct(profile){validateStudio(profile,profile);const rows=await listStudioProducts();if(rows.some(r=>r.profile.binding.productId===profile.binding.productId))throw Error('Für diesen Shopify-Artikel gibt es bereits eine Vorlage. Bitte öffne sie in der Übersicht.');const handle={type:'gravuru_configurator',handle:profile.id};const result=(await request(SAVE,{handle,metaobject:{fields:[{key:'name',value:profile.name},{key:'revision',value:profile.admin.draftRevision},{key:'configuration',value:JSON.stringify(profile)}]}})).metaobjectUpsert;if(result.userErrors?.length)throw Error(result.userErrors.map(e=>e.message).join(' · '));const saved=decode((await request(ONE,{handle})).metaobjectByHandle);if(saved.profile.id!==profile.id)throw Error('Anlegen konnte nicht bestätigt werden.');return saved;}
