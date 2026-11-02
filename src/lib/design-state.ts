import options from './editor-options.json' with {type:'json'}
export function validateDesign(raw:any){
 if(raw==null)return undefined
 if(!Array.isArray(raw.objects)||raw.objects.length>20)throw Error('Bitte höchstens 20 Gestaltungselemente verwenden.')
 const objects=raw.objects.map((o:any,i:number)=>{
  if(!o||!['text','motif','image'].includes(o.type))throw Error('Bitte die Gestaltungselemente prüfen.')
  if(!['x','y','w','h'].every(k=>typeof o[k]==='number'&&Number.isFinite(o[k]))||o.w<=0||o.h<=0)throw Error('Bitte die Elementmaße prüfen.');
  const v:any={id:'element-'+i,type:o.type};
  for(const k of ['x','y','w','h','rotation','size','contrast','opacity','cropX','cropY','cropScale','logoPixelWidth','logoPixelHeight'])if(o[k]!==undefined){if(typeof o[k]!=='number'||!Number.isFinite(o[k])||Math.abs(o[k])>10000)throw Error('Bitte die Elementmaße prüfen.');v[k]=o[k]}
  for(const k of ['bold','italic','locked'])if(typeof o[k]==='boolean')v[k]=o[k]
  for(const k of ['align','photoMode','photoShape','color'])if(typeof o[k]==='string'&&/^[a-zA-Z0-9# ._-]{1,40}$/.test(o[k]))v[k]=o[k]
  if(o.type==='text'){if(typeof o.text!=='string'||o.text.length>2000||!options.fonts.includes(o.font))throw Error('Bitte Text und Schrift prüfen.');v.text=o.text;v.font=o.font}
  if(o.type==='motif'){if(!options.motifs.includes(o.motif))throw Error('Bitte ein Motiv aus der Bibliothek wählen.');v.motif=o.motif}
  if(o.type==='image'){for(const k of ['source','originalFile'])if(o[k]!==undefined){if(typeof o[k]!=='string'||o[k].length>18*1024*1024||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(o[k]))throw Error('Bitte ein gültiges PNG-, JPG- oder WebP-Bild verwenden.');v[k]=o[k]}if(!v.source)throw Error('Bitte das Foto vollständig laden.');if(o.printOriginal!==undefined){if(typeof o.printOriginal!=='string'||o.printOriginal.length>12*1024*1024||!/^data:(application\/pdf|image\/svg\+xml);base64,[A-Za-z0-9+/]+=*$/.test(o.printOriginal))throw Error('Bitte eine gültige PDF- oder SVG-Druckdatei verwenden.');v.printOriginal=o.printOriginal;if(o.printPage!==undefined){if(!Number.isSafeInteger(o.printPage)||o.printPage<1||o.printPage>1000)throw Error('Bitte eine gültige PDF-Seite wählen.');v.printPage=o.printPage}}v.originalName=String(o.originalName||'Bild').slice(0,200)}
  return v
 });return {objects}
}
