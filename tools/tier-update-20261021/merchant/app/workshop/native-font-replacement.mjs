import {validateProductDocument,PRODUCT_SCHEMA} from './product-model.mjs';
import {measureText} from '../platform/sources/app/shared/models/doorbell-preview.mjs';
import fs from 'node:fs';
import {isDeepStrictEqual} from 'node:util';
import {gunzipSync} from 'node:zlib';

export function bundledWorkshopFont(name) {
  const chunks=Array.from({length:16},(_,i)=>fs.readFileSync(new URL(`../designs/aosu-labrador/runtime/gravuru-entwurf-fonts-${String(i).padStart(2,'0')}.txt`,import.meta.url),'utf8').trim()).join('');
  const fonts=JSON.parse(gunzipSync(Buffer.from(chunks,'base64')));
  if(typeof name!=='string'||!Object.hasOwn(fonts,name))throw Error('Die gewählte Schrift ist nicht in den gesicherten Werkstatt-Ressourcen enthalten.');
  return fonts[name];
}

// Administrative document edit only. The repository caller must save a new
// revision with optimistic concurrency; historical documents are never edited.
export function replaceNativeFont(document,{from,to,font}) {
  const result=validateProductDocument(document);
  if(result.schema!==PRODUCT_SCHEMA||result.profileAssignments.fonts.mode!=='inherit'||
      typeof from!=='string'||typeof to!=='string'||!from||!to||from===to||
      !result.config.localResources.fonts[from]||!font?.regular?.glyphs)throw Error('Eindeutige native Schriftzuordnung erforderlich.');
  const required='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÄÖÜäöüß0123456789';
  if([...required].some(c=>!font.regular.glyphs[c]))throw Error('Die Ersatzschrift enthält nicht den vollständigen deutschen Grundzeichensatz.');
  if(Object.hasOwn(result.config.localResources.fonts,to)&&!isDeepStrictEqual(result.config.localResources.fonts[to],font))throw Error('Unter diesem Namen ist bereits eine andere Schrift gespeichert.');
  result.config.localResources.fonts[to]=structuredClone(font);
  let changed=0;
  for(const design of result.config.profile.designs)for(const object of design.objects){
    if(object.type!=='text'||object.font!==from)continue;
    const width=object.w,height=object.h;object.font=to;object.size=Math.floor(object.size);
    if(object.bold&&!font.bold)throw Error('Die tatsächlich verwendete fette Schriftvariante fehlt.');
    for(;;){
      if(object.size<1)throw Error('Der Text passt mit dieser Schrift nicht in seinen bisherigen Bereich.');
      measureText(object,result.config.localResources.fonts);
      if(object.w<=width+.001&&object.h<=height+.001)break;
      object.size--;
    }
    changed++;
  }
  if(!changed)throw Error('Keine Texte mit der gewählten Originalschrift gefunden.');
  delete result.config.localResources.fonts[from];
  return {document:validateProductDocument(result),changedTextElements:changed,fontName:to};
}
