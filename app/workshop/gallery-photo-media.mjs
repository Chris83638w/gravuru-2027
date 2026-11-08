import {createHash} from 'node:crypto';
import {prepareCustomerPhoto} from './customer-photo.mjs';
import {photoPlacement} from '../configurator/variant-m/photo-position-model.mjs';

const fail=message=>{throw Object.assign(Error(message),{status:422,code:'review_photo_invalid'});};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const plain=v=>v&&typeof v==='object'&&!Array.isArray(v);
const finite=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
export function validatePhotoRecipe(value){
 if(value===null||value===undefined)return null;
 if(!plain(value)||Object.keys(value).sort().join(',')!=='angle,color,flip,shape,x,y,zoom'||!finite(value.angle,-3600,3600)||![1,-1].includes(value.flip)||!finite(value.zoom,1,4)||!finite(value.x,-1,1)||!finite(value.y,-1,1)||!['original','square','portrait','landscape','circle','heart','oval','star','cloud'].includes(value.shape)||!['original','grayscale','sepia'].includes(value.color))fail('Das Bearbeitungsrezept ist ungültig.');
 return structuredClone(value);
}
export function validatePhotoCrop(value){
 if(value===null||value===undefined)return null;
 if(!plain(value)||Object.keys(value).sort().join(',')!=='angle,x,y,zoom'||!finite(value.zoom,.25,4)||!finite(value.x,-1,1)||!finite(value.y,-1,1)||!finite(value.angle,-3600,3600))fail('Die Foto-Ausrichtung ist ungültig.');
 return structuredClone(value);
}

// Uses the existing private design-assets database. An immutable native SVG
// references the exact original, processed rendition, edit source and recipe
// by digest. Thus changing any of them changes the native review fingerprint.
export function createGalleryPhotoMedia({db,tenant,assets}){
 db.exec(`CREATE TABLE IF NOT EXISTS review_photo_edits (
  asset_id TEXT NOT NULL REFERENCES design_assets(id), tenant_id TEXT NOT NULL,
  original_sha256 TEXT NOT NULL REFERENCES design_sources(sha256),
  processed_sha256 TEXT NOT NULL REFERENCES design_sources(sha256),
  edit_source_sha256 TEXT NOT NULL REFERENCES design_sources(sha256),
  metadata TEXT NOT NULL, PRIMARY KEY(tenant_id,asset_id));
  CREATE TRIGGER IF NOT EXISTS review_photo_edit_immutable BEFORE UPDATE ON review_photo_edits BEGIN SELECT RAISE(ABORT,'immutable review photo'); END;`);
 const row=id=>db.prepare('SELECT * FROM review_photo_edits WHERE tenant_id=? AND asset_id=?').get(tenant,id);
 return {
  async import(input){
   const {original,processed,editSource}=input;
   if(!finite(input.widthMm,.01,2000)||!finite(input.heightMm,.01,2000)||typeof input.edited!=='boolean'||!['original','grayscale','sepia'].includes(input.color)||!['original','grayscale','sepia'].includes(input.editSourceColor))fail('Ungültige Fotogröße oder Farbe.');
   const photoEdit=validatePhotoRecipe(input.photoEdit),crop=validatePhotoCrop(input.crop);
   const validated=[];
   for(const [index,bytes] of [original,processed,editSource].entries())validated.push(await prepareCustomerPhoto(bytes,{previewColor:index===1&&!input.edited?input.color:'original'}));
   const [source,picture,editing]=validated;
   const metadata={schema:'gravuru-gallery-photo/v1',width:picture.width,height:picture.height,widthMm:input.widthMm,heightMm:input.heightMm,
    edited:input.edited,color:input.color,editSourceColor:input.editSourceColor,photoEdit,crop,
    originalSha256:hash(source.original),processedSha256:hash(picture.original),editSourceSha256:hash(editing.original)};
   const p=photoPlacement({w:input.widthMm,h:input.heightMm,photoShape:input.photoShape,photoMaskAssetId:input.photoMaskAssetId},metadata,crop||undefined);
   const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${input.widthMm}mm" height="${input.heightMm}mm" viewBox="0 0 ${input.widthMm} ${input.heightMm}"><desc>gravuru-gallery-photo:${hash(JSON.stringify(metadata))}</desc><g transform="translate(${input.widthMm/2} ${input.heightMm/2})"><image href="data:image/png;base64,${picture.preview.toString('base64')}" x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" transform="rotate(${p.angle} ${p.cx} ${p.cy})" preserveAspectRatio="xMidYMid meet"/></g></svg>`;
   const asset=await assets.import({name:'Galeriefoto.svg',bytes:Buffer.from(svg).toString('base64')});
   db.exec('BEGIN IMMEDIATE');
   try{
    for(const photo of validated)db.prepare('INSERT OR IGNORE INTO design_sources(sha256,bytes) VALUES(?,?)').run(hash(photo.original),photo.original);
    // Existing AI/photo-source consumers must still receive the untouched
    // original, never the processed image embedded in the native SVG.
    db.prepare('INSERT OR IGNORE INTO photo_example_sources(asset_id,source_sha256,tenant_id) VALUES(?,?,?)').run(asset.assetId,metadata.originalSha256,tenant);
    db.prepare('INSERT OR IGNORE INTO review_photo_edits(asset_id,tenant_id,original_sha256,processed_sha256,edit_source_sha256,metadata) VALUES(?,?,?,?,?,?)').run(asset.assetId,tenant,metadata.originalSha256,metadata.processedSha256,metadata.editSourceSha256,JSON.stringify(metadata));
    db.exec('COMMIT');
   }catch(error){db.exec('ROLLBACK');throw error;}
   return {assetId:asset.assetId,...metadata};
  },
  metadata(id){assets.get(id);const r=row(id);return r?JSON.parse(r.metadata):null;},
  read(id,part){
   assets.get(id);const r=row(id),field={original:'original_sha256',processed:'processed_sha256',editSource:'edit_source_sha256'}[part];
   if(!field)fail('Unbekannte Bildfassung.');
   if(!r)return assets.photoExampleImage(id);
   return Buffer.from(db.prepare('SELECT bytes FROM design_sources WHERE sha256=?').get(r[field]).bytes);
  }
 };
}
