import {validateProductDocument} from './product-model.mjs';
import {measureText} from '../platform/sources/app/shared/models/doorbell-preview.mjs';

// Explicit offline revision operation. Never guess which rows belong together,
// never change an existing configuration, order or catalog master in place.
export function joinTemplateText(document,{designId,ids}){
 const result=structuredClone(document),design=result.config.profile.designs.find(d=>d.id===designId);
 if(!design||!Array.isArray(ids)||ids.length<2||new Set(ids).size!==ids.length)throw Error('Design und mindestens zwei eindeutige Textzeilen angeben.');
 const rows=ids.map(id=>design.objects.find(o=>o.id===id));
 if(rows.some(o=>!o||o.type!=='text'||o.text.includes('\n')))throw Error('Nur vorhandene einzeilige Texte zusammenführen.');
 const first=rows[0],keys=['x','font','size','bold','italic','rotation','color','letterSpacing','textAnchor','surfaceId','customerEditable','locked','technicalLocked','acrylicFixed','required'];
 if(first.rotation||first.italic||rows.some(o=>keys.some(k=>JSON.stringify(o[k])!==JSON.stringify(first[k]))))throw Error('Die Textzeilen haben unterschiedliche Gestaltung oder Freigaben.');
 const rights=result.elementRights[designId];
 if(rows.some(o=>JSON.stringify(rights[o.id])!==JSON.stringify(rights[first.id])))throw Error('Die Textzeilen haben unterschiedliche Elementrechte.');
 const leading=rows[1].y-first.y;
 if(leading<=0||rows.some((o,i)=>Math.abs(o.y-first.y-i*leading)>1e-7))throw Error('Zeilenfolge oder Zeilenabstand ist nicht gleichmäßig.');
 const removed=new Set(ids.slice(1));
 first.text=rows.map(o=>o.text).join('\n');first.y=(first.y+rows.at(-1).y)/2;first.lineHeight=leading;
 // Left/right anchored lines would move when the combined width changes.
 if(first.textAnchor&&first.textAnchor!=='middle'&&rows.some(o=>o.w!==first.w))throw Error('Unterschiedliche Textbreiten mit seitlicher Ausrichtung nicht automatisch zusammenführen.');
 measureText(first,result.config.localResources.fonts);
 design.objects=design.objects.filter(o=>!removed.has(o.id));
 if(design.customerFields)design.customerFields=design.customerFields.filter(f=>!removed.has(f.id));
 for(const id of removed){delete rights[id];if(result.config.workshopElementRights?.[designId])delete result.config.workshopElementRights[designId][id];}
 return validateProductDocument(result);
}
