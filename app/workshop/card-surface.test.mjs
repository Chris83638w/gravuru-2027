import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';
import {createDesignAssetStore} from './design-assets.mjs';
import {steelSpecimen} from './specimen-product.mjs';
import {makeProductDocument} from './product-model.mjs';
import {productPreview} from './product-preview.mjs';
import {cardSurface,cardSurfaceSwapsFrom,CARD_SURFACE_DIR} from './card-surface.mjs';

const data=(type,file)=>'data:image/'+type+';base64,'+fs.readFileSync(path.join(CARD_SURFACE_DIR,file)).toString('base64');
const PNG=data('png','gravuru-edelstahl-feine-maserung-vorschau.png'),WEBP=data('webp','gravuru-edelstahl-feine-maserung-vorschau.webp'),CARD=data('webp','gravuru-edelstahl-feine-maserung-vorschau.karte.webp');

test('card surface maps PNG and full WebP steel texture to the small card file, everything else unchanged',()=>{
 assert.equal(cardSurface(PNG),CARD);assert.equal(cardSurface(WEBP),CARD);
 assert(CARD.length*5<WEBP.length,'Kartentextur muss deutlich kleiner sein');
 for(const other of [undefined,null,'',  '/api/workshop/material-surfaces/'+'a'.repeat(64)+'.png','data:image/png;base64,AAAA'])assert.equal(cardSurface(other),other);
 assert.equal(cardSurfaceSwapsFrom(path.join(CARD_SURFACE_DIR,'gibt-es-nicht')).size,0);
});

test('gallery card previews embed the small texture, editor/portrait previews keep the original',async t=>{
 const assets=createDesignAssetStore({filename:':memory:'});t.after(()=>assets.close());
 const doc=makeProductDocument(await steelSpecimen(assets));
 assert.equal(doc.config.materialSurface,PNG,'Ausgangslage: Edelstahl-Vorschau als PNG');
 for(const surface of [PNG,WEBP]){
  const config={...doc.config,materialSurface:surface};
  const card=productPreview({universal:config},{layout:'card'}),portrait=productPreview({universal:config});
  assert(card.includes(CARD)&&!card.includes(surface),'Karte nutzt die kleine Textur');
  assert(portrait.includes(surface)&&!portrait.includes(CARD),'Hochformat bleibt unverändert');
  assert(card.length<portrait.length-50000,'Karten-SVG ist mindestens 50 KB kleiner');
 }
});
