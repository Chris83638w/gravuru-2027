import {verifyFormDesignSources} from './form-designs.mjs';
import {photoPlacement} from '../configurator/variant-m/photo-position-model.mjs';
const fail=message=>{throw Object.assign(Error(message),{status:422,code:'customer_rights'});};
const exact=(o,keys)=>{if(!o||typeof o!=='object'||Array.isArray(o)||Object.keys(o).length!==keys.length||keys.some(k=>!Object.hasOwn(o,k)))fail('Ungültige Kundenwerte.');};
const common=['id','deleted','xMm','yMm','widthMm','heightMm'];
export function initialFormCustomerState(design){return {fields:design.fields.map(f=>({id:f.id,deleted:false,xMm:f.xMm,yMm:f.yMm,widthMm:f.widthMm,heightMm:f.heightMm,...(f.type==='text'?{text:f.text,font:f.font,sizeMm:f.sizeMm,color:f.color,bold:f.bold,italic:f.italic}:{mediaId:null,crop:{zoom:1,x:0,y:0,angle:0},tone:'original'})}))};}
export function resolveFormCustomer(document,designId,input,{assets,fonts,media}){
 const source=document.designs?.find(d=>d.id===designId);if(!source)fail('Design gehört nicht zu diesem Produktstand.');
 exact(input,['fields']);if(!Array.isArray(input.fields)||input.fields.length!==source.fields.length)fail('Die vorgegebenen Felder dürfen nicht ausgetauscht werden.');
 const ids=new Set(),copy=structuredClone(document),design=copy.designs.find(d=>d.id===designId),photos=new Map(),warnings=[];
 for(const value of input.fields){
  if(!value||typeof value!=='object'||Array.isArray(value))fail('Ungültiges Kundenfeld.');
  const f=design.fields.find(f=>f.id===value.id);if(!f||ids.has(value.id))fail('Unbekanntes oder doppeltes Kundenfeld.');ids.add(value.id);
  exact(value,[...common,...(f.type==='text'?['text','font','sizeMm','color','bold','italic']:['mediaId','crop','tone'])]);
  if(typeof value.deleted!=='boolean'||value.deleted&&(!f.allowDelete||f.type==='photo'&&f.required))fail('Dieses Feld darf nicht entfernt werden.');
  if(!f.allowMove&&(value.xMm!==f.xMm||value.yMm!==f.yMm))fail('Die Position dieses Felds ist fest vorgegeben.');
  if(!f.allowScale&&(value.widthMm!==f.widthMm||value.heightMm!==f.heightMm||f.type==='text'&&value.sizeMm!==f.sizeMm))fail('Die Größe dieses Felds ist fest vorgegeben.');
  if(f.type==='text'&&!f.allowColor&&typeof value.color==='string'&&value.color.toLowerCase()!==f.color.toLowerCase())fail('Die Textfarbe ist fest vorgegeben.');
  for(const key of ['xMm','yMm','widthMm','heightMm',...(f.type==='text'?['text','font','sizeMm','color','bold','italic']:[])])f[key]=value[key];
  if(f.type==='photo'){
   exact(value.crop,['zoom','x','y','angle']);const c=value.crop;
   if(![c.zoom,c.x,c.y,c.angle].every(Number.isFinite)||c.zoom<.25||c.zoom>4||Math.abs(c.x)>1||Math.abs(c.y)>1||Math.abs(c.angle)>360||!['original','grayscale','sepia'].includes(value.tone)||!(value.mediaId===null||typeof value.mediaId==='string'&&/^photo_[a-f0-9-]+$/.test(value.mediaId)))fail('Ungültige Fotoausrichtung.');
   if(value.mediaId)photos.set(f.id,{...media(value.mediaId),crop:c,tone:value.tone});
   else if(f.required&&!value.deleted)warnings.push('Bitte ein Foto für „'+f.label+'“ hinzufügen.');
  }
 }
 // Validate all geometry and text, including hidden fields, before removing them from the rendering copy.
 verifyFormDesignSources(copy,assets,fonts);
 design.fields=design.fields.filter(f=>!input.fields.find(v=>v.id===f.id).deleted);
 if(document.processingMethod==='engraving')for(let i=0;i<design.fields.length;i++)for(let j=i+1;j<design.fields.length;j++){const a=design.fields[i],b=design.fields[j];if(a.xMm<b.xMm+b.widthMm&&a.xMm+a.widthMm>b.xMm&&a.yMm<b.yMm+b.heightMm&&a.yMm+a.heightMm>b.yMm)warnings.push('Gravur prüfen: „'+a.label+'“ und „'+b.label+'“ überlagern sich.');}
 return {document:copy,photos,warnings,ready:!warnings.length};
}
export function customerPhotoMarkup(field,photo){
 if(!photo)return null;
 const p=photoPlacement({w:field.widthMm,h:field.heightMm},{width:photo.width,height:photo.height},photo.crop),id='customer-photo-'+field.id;
 const shape=field.shape==='circle'?`<ellipse rx="${field.widthMm/2}" ry="${field.heightMm/2}"/>`:`<rect x="${-field.widthMm/2}" y="${-field.heightMm/2}" width="${field.widthMm}" height="${field.heightMm}"/>`;
 const filter=photo.tone==='grayscale'?'<feColorMatrix type="saturate" values="0"/>':photo.tone==='sepia'?'<feColorMatrix type="matrix" values=".393 .769 .189 0 0 .349 .686 .168 0 0 .272 .534 .131 0 0 0 0 0 1 0"/>':'';
 return `<g data-field="${field.id}" transform="translate(${field.xMm+field.widthMm/2} ${field.yMm+field.heightMm/2})"><defs><clipPath id="${id}-clip">${shape}</clipPath><filter id="${id}-tone" color-interpolation-filters="sRGB">${filter}</filter></defs><g clip-path="url(#${id}-clip)"><g data-photo-pan="${field.id}" transform="translate(${p.cx} ${p.cy}) rotate(${p.angle})"><image href="data:image/png;base64,${photo.preview.toString('base64')}" x="${-p.w/2}" y="${-p.h/2}" width="${p.w}" height="${p.h}" preserveAspectRatio="none"${filter?` filter="url(#${id}-tone)"`:''}/></g></g></g>`;
}
