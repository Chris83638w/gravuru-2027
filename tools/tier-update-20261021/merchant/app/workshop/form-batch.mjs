import {addFormDesign} from './form-designs.mjs';
const text=v=>String(v??'').trim();
const fail=message=>{throw Error(message);};
export function prepareFormBatch(document,row,{asset,filename,allowNewDesign=false,designName}={}){
 for(const field of ['price_small_eur','price_large_eur','heading','names','place','date','slogan'])if(text(row[field]))fail('Formprodukte übernehmen ihre eigenen Maße und Kundenfelder. '+field+' gehört zur bisherigen Acrylvorlage; für den Grundpreis price_eur verwenden.');
 if(!asset)return {document,artwork:null};
 const target=text(row.design_id)||document.defaultDesignId;
 const old=document.designs?.find(d=>d.id===target);
 if(target&&!old&&!allowNewDesign)fail('Das ausgewählte Design ist in diesem Formmaster nicht vorhanden.');
 const fit=text(row.design_fit)||'original';
 if(!['original','contain'].includes(fit))fail('Formprodukte unterstützen design_fit original oder contain (proportional einpassen).');
 const id=old?.id||(allowNewDesign?target:null)||'design-import';
 const base={...document,designs:(document.designs||[]).filter(d=>d.id!==id),defaultDesignId:null};
 const next=addFormDesign(base,{...asset,originalName:filename},{name:designName||old?.name||filename.replace(/\.(svg|pdf)$/i,''),fit,designId:id});
 const inserted=next.designs.find(d=>d.id===id);
 if(old){if(old.additions!==undefined)inserted.additions=structuredClone(old.additions);else delete inserted.additions;next.designs=document.designs.map(d=>d.id===id?inserted:d);}
 next.defaultDesignId=document.defaultDesignId||id;
 return {document:next,artwork:{name:filename,page:asset.page,assetId:asset.assetId,designId:id,designName:inserted.name,placement:{xMm:inserted.xMm,yMm:inserted.yMm,widthMm:inserted.widthMm,heightMm:inserted.heightMm},warnings:['Neue Gesamtgestaltung: Kundenfelder des ersetzten Designs werden nicht auf ungeprüfte Inhalte übertragen. Felder im Produkteditor ausdrücklich zuordnen.',...(fit==='contain'?['Proportional eingepasst; abweichende Seitenverhältnisse können freie Ränder lassen.']:[]),'Druck reicht nur dort bis zum Rand, wo die Originalgrafik die Kontur tatsächlich ausfüllt.']}};
}
