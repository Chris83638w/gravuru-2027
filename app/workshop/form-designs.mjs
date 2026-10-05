import {measureText,textPaths} from '../platform/sources/app/shared/models/doorbell-preview.mjs';
const fail=message=>{throw Object.assign(Error(message),{status:422,code:'invalid_form_design'});};
const id=v=>typeof v==='string'&&/^[a-zA-Z0-9][\w-]{0,79}$/.test(v);
const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const exact=(o,keys)=>{if(!o||typeof o!=='object'||Array.isArray(o)||Object.keys(o).length!==keys.length||keys.some(k=>!Object.hasOwn(o,k)))fail('Unvollständige oder unbekannte Design-/Feldeinstellungen.');};
function box(o,w,h){if(![o.xMm,o.yMm,o.widthMm,o.heightMm].every(Number.isFinite)||o.xMm<0||o.yMm<0||o.widthMm<=0||o.heightMm<=0||o.xMm+o.widthMm>w+.001||o.yMm+o.heightMm>h+.001)fail('Die Platzierung muss innerhalb des ursprünglichen Formmaßes liegen.');}

export function validateFormDesigns(d){
 if(d.designs===undefined&&d.defaultDesignId===undefined)return;
 if(!Array.isArray(d.designs)||d.designs.length>30)fail('Höchstens 30 Designs pro Formprodukt.');
 const ids=new Set(),g=d.form.geometry;
 for(const a of d.designs){
  exact(a,['id','name','assetId','sourceSha256','originalName','xMm','yMm','widthMm','heightMm','sourcePrepared','fields']);
  if(!id(a.id)||ids.has(a.id)||typeof a.name!=='string'||!a.name.trim()||a.name.length>100||!hash(a.assetId)||!hash(a.sourceSha256)||typeof a.originalName!=='string'||a.originalName.length>200||/[\x00-\x1f\\/]/.test(a.originalName)||typeof a.sourcePrepared!=='boolean')fail('Ungültige Designzuordnung.');
  ids.add(a.id);box(a,g.widthMm,g.heightMm);
  if(!Array.isArray(a.fields)||a.fields.length>19)fail('Höchstens 19 Kundenfelder pro Design.');
  if(a.fields.length&&!a.sourcePrepared)fail('Bitte zuerst bestätigen: Die Vorlage ist an den neuen Kundenfeldern frei von zu ersetzenden Texten und Fotos.');
  const fields=new Set();
  for(const f of a.fields){
   exact(f,['id','label','type','xMm','yMm','widthMm','heightMm','allowMove','allowScale','allowDelete',...(f.type==='text'?['text','font','sizeMm','color','bold','italic','allowColor']:['shape','required'])]);
   if(!id(f.id)||fields.has(f.id)||typeof f.label!=='string'||!f.label.trim()||f.label.length>80||!['text','photo'].includes(f.type)||!['allowMove','allowScale','allowDelete'].every(k=>typeof f[k]==='boolean'))fail('Ungültiges Kundenfeld oder fehlende Freigabe.');
   fields.add(f.id);box(f,g.widthMm,g.heightMm);
   if(f.type==='text'){
    if(typeof f.text!=='string'||!f.text.trim()||f.text.length>500||typeof f.font!=='string'||!Number.isInteger(f.sizeMm)||f.sizeMm<1||f.sizeMm>100||!/^#[a-fA-F0-9]{6}$/.test(f.color)||!['bold','italic','allowColor'].every(k=>typeof f[k]==='boolean'))fail('Text benötigt eine vorhandene Schrift, ganze mm und eine gültige Farbe.');
   }else if(!['rect','circle'].includes(f.shape)||typeof f.required!=='boolean'||f.shape==='circle'&&f.widthMm!==f.heightMm)fail('Ungültiger Fotobereich; runde Bereiche benötigen gleiche Breite und Höhe.');
  }
 }
 if(d.designs.length?!ids.has(d.defaultDesignId):d.defaultDesignId!==null)fail('Bitte ein vorhandenes Standarddesign auswählen.');
}

export function verifyFormDesignSources(d,assets,fonts){
 validateFormDesigns(d);
 for(const a of d.designs||[]){
  const source=assets.get(a.assetId);
  if(source.sourceSha256!==a.sourceSha256||Math.abs(a.widthMm/source.widthMm-a.heightMm/source.heightMm)>1e-6)fail('Originalbezug oder Proportionen des Designs stimmen nicht.');
  for(const f of a.fields)if(f.type==='text'){
   if(!Object.hasOwn(fonts,f.font)||f.bold&&!fonts[f.font].bold)fail('Die gewählte Schrift oder ihr Fettschnitt ist nicht verfügbar.');
   const measured=measureText({...f,size:f.sizeMm},fonts);
   if(measured.w>f.widthMm+.001||measured.h>f.heightMm+.001)fail('Der Text passt nicht in sein Feld. Feld vergrößern oder kleinere ganze Schriftgröße wählen.');
  }
 }
 return d;
}

export function addFormDesign(d,asset,{name,fit='original',designId}){
 if(!['original','contain'].includes(fit))fail('Ungültige Platzierung.');
 const g=d.form.geometry,scale=fit==='original'?1:Math.min(g.widthMm/asset.widthMm,g.heightMm/asset.heightMm);
 const widthMm=asset.widthMm*scale,heightMm=asset.heightMm*scale;
 const a={id:designId,name,assetId:asset.assetId,sourceSha256:asset.sourceSha256,originalName:asset.originalName,xMm:(g.widthMm-widthMm)/2,yMm:(g.heightMm-heightMm)/2,widthMm,heightMm,sourcePrepared:false,fields:[]};
 const next=structuredClone(d);next.designs=[...(d.designs||[]),a];next.defaultDesignId=d.defaultDesignId||a.id;validateFormDesigns(next);return next;
}

// Preview only. The source remains a sandboxed image; no imported SVG is injected.
export function formDesignOverlay(d,fonts,designId=d.defaultDesignId,{photoMarkup=()=>null,sourceHref=id=>`/api/workshop/design-assets/${id}/preview.svg`}={}){
 const a=(d.designs||[]).find(a=>a.id===designId);if(!a)return '';
 const fields=a.fields.map(f=>f.type==='text'?`<g data-field="${f.id}" transform="translate(${f.xMm+f.widthMm/2} ${f.yMm+f.heightMm/2})" fill="${f.color}">${textPaths({...f,size:f.sizeMm},fonts)}</g>`:photoMarkup(f)||`<g data-field="${f.id}">${f.shape==='circle'?`<ellipse cx="${f.xMm+f.widthMm/2}" cy="${f.yMm+f.heightMm/2}" rx="${f.widthMm/2}" ry="${f.heightMm/2}"`:`<rect x="${f.xMm}" y="${f.yMm}" width="${f.widthMm}" height="${f.heightMm}"`} fill="#e7e9ec" stroke="#8995a0" stroke-width=".3" stroke-dasharray="1 1"/><text x="${f.xMm+f.widthMm/2}" y="${f.yMm+f.heightMm/2}" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-size="${Math.min(3,f.widthMm/12)}" fill="#4b5660">Fotobereich</text></g>`).join('');
 const rings=d.form.geometry.contours.map(c=>c.d+' Z').join(' ');
 return `<defs><clipPath id="form-design-clip"><path d="${rings}" clip-rule="evenodd"/></clipPath></defs><g clip-path="url(#form-design-clip)" data-design="${a.id}"><image data-design-source="${a.assetId}" href="${sourceHref(a.assetId)}" x="${a.xMm}" y="${a.yMm}" width="${a.widthMm}" height="${a.heightMm}" preserveAspectRatio="xMidYMid meet"/><g>${fields}</g></g>`;
}
