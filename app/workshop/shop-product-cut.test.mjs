import test from 'node:test';import assert from 'node:assert/strict';
import {readShopProductCut,shopProductCutMetafield,validateShopProductCut,designZielgruppe} from './shop-product-cut.mjs';
test('139: product JSON metafield supplies an exact immutable-by-copy size, theme and starter',()=>{
 const cut={sizeKey:'AB120x80',themeId:'familie',defaultDesignId:'D800'},field=shopProductCutMetafield(cut);
 assert.deepEqual(readShopProductCut(field),cut);cut.themeId='changed';assert.equal(readShopProductCut(field).themeId,'familie');
 for(const bad of [{...field,key:'other'},{...field,value:'{}'},{...field,value:'null'},{...field,value:JSON.stringify({...cut,priceCents:0})}])assert.throws(()=>readShopProductCut(bad),/Produktschnitt|Produkt-Metafeld/);
});

test('Produktschnitt: optionale Zielgruppe und Größenwahl je Form (Chris 02.11.2026, Grabstecker)',()=>{
 const base={sizeKey:'GS-V2A-HERZ-M',themeId:'andenkenschilder',defaultDesignId:'GS-V2A-HERZ-M-D51'};
 assert.deepEqual(validateShopProductCut({...base,zielgruppe:'Hund',groessenWahl:'form'}),{...base,zielgruppe:'Hund',groessenWahl:'form'});
 assert.deepEqual(validateShopProductCut(base),base);
 assert.throws(()=>validateShopProductCut({...base,groessenWahl:'alle'}),/groessenWahl/);
 assert.throws(()=>validateShopProductCut({...base,fremd:'x'}),/Produktschnitt/);
 assert.equal(designZielgruppe({name:'Grabstecker Herz M · Hund · Klein: Name + Daten'}),'Hund');
 assert.equal(designZielgruppe({name:'Familie Berger'}),null);
});
