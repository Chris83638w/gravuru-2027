import {createHash} from 'node:crypto';
import {authorDesign} from './ui/design-authoring.mjs';
import {measureText} from '../platform/sources/app/shared/models/doorbell-preview.mjs';
import {surfaceObjectIssue} from '../platform/sources/app/shared/models/design-content.mjs';

export const aiFail=(status,code,message)=>Object.assign(Error(message),{status,code});
const reject=message=>{throw aiFail(422,'ai_plan_invalid',message);};
const fields=['action','objectId','text','font','size','x','y','w','h','color','motifKey'];
const actions=['text','move','resize','color','add_text','add_motif','remove'];
export const AI_PLAN_SCHEMA={type:'object',additionalProperties:false,required:['summary','operations'],properties:{summary:{type:'string'},operations:{type:'array',items:{type:'object',additionalProperties:false,required:fields,properties:Object.fromEntries(fields.map(k=>[k,k==='action'?{type:'string',enum:actions}:{type:[['size','x','y','w','h'].includes(k)?'number':'string','null']}]))}}}};
export const aiDigest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function aiRequest(input){
 const keys=['requestId','expectedRevision','designId','instruction','preserveText','preservePhotos'];
 if(!input||Object.keys(input).some(k=>![...keys,'kind','targetObjectId'].includes(k))||keys.some(k=>!Object.hasOwn(input,k))||!/^air_[a-f0-9-]{36}$/.test(input.requestId)||!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<1||typeof input.designId!=='string'||input.designId.length>128||typeof input.instruction!=='string'||!input.instruction.trim()||input.instruction.length>4000||typeof input.preserveText!=='boolean'||typeof input.preservePhotos!=='boolean'||(input.kind!==undefined&&!['layout','image_generate','photo_edit'].includes(input.kind))||(input.kind==='photo_edit'?(typeof input.targetObjectId!=='string'||!input.targetObjectId||input.targetObjectId.length>128):input.targetObjectId!==undefined))throw aiFail(422,'ai_request_invalid','Bitte Auftrag, Design und gespeicherten Stand prüfen.');
 return {...input,instruction:input.instruction.trim()};
}
export function aiContext(record,request){
 const c=record.document.config,d=c?.profile?.designs.find(d=>d.id===request.designId);
 if(!d)throw aiFail(422,'ai_design_unsupported','Bitte ein natives Design mit einzelnen Elementen auswählen. PDF-Gestaltungen zuerst in Elemente aufbereiten.');
 if(record.status==='archived')throw aiFail(409,'ai_archived','Archivierte Produkte können nicht geändert werden.');
 return {geometry:c.profile.geometry,preserveText:request.preserveText,preservePhotos:request.preservePhotos,design:{name:d.name,objects:d.objects.map(o=>Object.fromEntries(['id','type','text','font','size','x','y','w','h','rotation','color','motif','technicalLocked'].filter(k=>o[k]!==undefined).map(k=>[k,o[k]])))},fonts:Object.keys(c.localResources.fonts).slice(0,100),motifs:c.localResources.motifs.slice(0,200).map(m=>({key:m.key,label:m.label||m.name||m.key,bounds:m.bounds})),instruction:request.instruction};
}
export function applyAiPlan(original,request,plan){
 if(!plan||Object.keys(plan).sort().join(',')!=='operations,summary'||typeof plan.summary!=='string'||plan.summary.length>1600||!Array.isArray(plan.operations)||plan.operations.length<1||plan.operations.length>24)reject('Der Vorschlag enthält keine gültigen Gestaltungsänderungen.');
 let document=structuredClone(original);const changes=[];
 for(const op of plan.operations){
  if(!op||Object.keys(op).length!==fields.length||fields.some(k=>!Object.hasOwn(op,k))||!actions.includes(op.action))reject('Der Vorschlag enthält eine unbekannte Aktion.');
  for(const k of fields.slice(1))if(op[k]!==null&&(['size','x','y','w','h'].includes(k)?!Number.isFinite(op[k]):typeof op[k]!=='string'||op[k].length>2000))reject('Ein Gestaltungswert ist ungültig.');
  const allowed={text:['objectId','text','font','size'],move:['objectId','x','y'],resize:['objectId','w','h'],color:['objectId','color'],add_text:['text','font','size','x','y','color'],add_motif:['motifKey','x','y','w','h','color'],remove:['objectId']}[op.action];
  if(fields.slice(1).some(k=>op[k]!==null&&!allowed.includes(k)))reject('Die Aktion enthält unpassende Felder.');
  const c=document.config,d=c.profile.designs.find(d=>d.id===request.designId);if(!d)reject('Das ausgewählte Design fehlt.');
  let o=d.objects.find(o=>o.id===op.objectId);
  if(!op.action.startsWith('add_')){
   if(!o||o.technicalLocked)reject('Technische Konturen und unbekannte Elemente bleiben geschützt.');
   if(request.preserveText&&o.type==='text'&&['text','remove'].includes(op.action))reject('Der Vorschlag würde einen geschützten Text ändern.');
   if(request.preservePhotos&&o.type==='photoSlot')reject('Der Vorschlag würde ein geschütztes Fotofeld ändern.');
  }
  if(op.action==='add_text'||op.action==='add_motif'){
   if(op.action==='add_text'&&(!op.text?.trim()||!c.localResources.fonts[op.font]))reject('Für neuen Text fehlen Inhalt oder vorhandene Schrift.');
   const motif=op.action==='add_motif'?c.localResources.motifs.find(m=>m.key===op.motifKey):null;
   if(op.action==='add_motif'&&!motif)reject('Das vorgeschlagene Motiv ist nicht in der Bibliothek vorhanden.');
   const result=authorDesign(document,request.designId,op.action==='add_text'?'text':'motif',{font:op.font,motif});document=result.document;o=document.config.profile.designs.find(d=>d.id===request.designId).objects.find(o=>o.id===result.objectId);
  }
  if(op.action==='text'||op.action==='add_text'){
   if(o.type!=='text')reject('PDF-Schriftpfade müssen zuerst in Werkstatttext umgewandelt werden.');
   if(op.text!==null){if(!op.text.trim())reject('Text darf nicht leer sein.');o.text=op.text;}
   if(op.font!==null){if(!document.config.localResources.fonts[op.font])reject('Die Schrift ist nicht vorhanden.');o.font=op.font;}
   if(op.size!==null){if(!Number.isInteger(op.size)||op.size<1||op.size>100)reject('Schriftgröße bitte in ganzen Millimetern angeben.');o.size=op.size;}
   measureText(o,document.config.localResources.fonts);
  }
  if(['move','add_text','add_motif'].includes(op.action)){
   if(op.action==='move'&&(op.x===null||op.y===null))reject('Zum Verschieben fehlen die Koordinaten.');
   if(op.x!==null)o.x=op.x;if(op.y!==null)o.y=op.y;
  }
  if(op.action==='resize'||op.action==='add_motif'){
   if(o.type==='text'||o.sourceBounds||o.acrylicFixed)reject('Dieses Element kann über diese Aktion nicht skaliert werden.');
   if(op.action==='resize'&&(op.w===null||op.h===null))reject('Breite und Höhe fehlen.');
   if((op.w===null)!==(op.h===null))reject('Breite und Höhe müssen gemeinsam angegeben werden.');
   if(op.w!==null){if(op.w<=0||op.h<=0||Math.abs(op.w/op.h-o.w/o.h)>.001)reject('Die ursprünglichen Proportionen müssen erhalten bleiben.');o.w=op.w;o.h=op.h;}
  }
  if(op.color!==null){if(!['text','motif','graphic'].includes(o.type)||!/^#[0-9a-fA-F]{6}$/.test(op.color))reject('Ungültige Elementfarbe.');o.color=op.color;if(o.type==='motif')o.preserveColors=false;}
  if(op.action==='color'&&op.color===null)reject('Die neue Farbe fehlt.');
  if(op.action==='remove')document=authorDesign(document,request.designId,'remove',{objectId:o.id}).document;
  else {const issue=surfaceObjectIssue(o,document.config.profile);if(issue)reject(issue);}
  changes.push({action:op.action,elementId:o.id});
 }
 if(aiDigest(document)===aiDigest(original))reject('Der Vorschlag enthält keine Änderung.');
 return {document,summary:plan.summary,changes};
}
