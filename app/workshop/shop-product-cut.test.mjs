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
 assert.throws(()=>validateShopProductCut({...base,groessenWahl:'quer'}),/groessenWahl/);
 assert.deepEqual(validateShopProductCut({...base,groessenWahl:'alle'}),{...base,groessenWahl:'alle'});
 assert.throws(()=>validateShopProductCut({...base,fremd:'x'}),/Produktschnitt/);
 assert.equal(designZielgruppe({name:'Grabstecker Herz M · Hund · Klein: Name + Daten'}),'Hund');
 assert.equal(designZielgruppe({name:'Familie Berger'}),null);
});
test('Türschild-Konfi ohne Motive: Zierlinien und Rahmen bleiben, Figuren sind Motive (Chris 03.11.2026)',async()=>{
 const {isDecorativeMotif,hasFigureMotif}=await import('./shop-product-cut.mjs');
 const plate=[120,80];
 assert.equal(isDecorativeMotif({w:90,h:0.6},plate),true,'waagerechte Zierlinie');
 assert.equal(isDecorativeMotif({w:1,h:40},plate),true,'senkrechte Linie');
 assert.equal(isDecorativeMotif({w:116,h:76},plate),true,'Rahmen');
 assert.equal(isDecorativeMotif({w:30,h:28},plate),false,'Figur');
 assert.equal(hasFigureMotif({objects:[{type:'text'},{type:'motif',w:90,h:1}]},plate),false);
 assert.equal(hasFigureMotif({objects:[{type:'motif',w:90,h:1},{type:'motif',w:20,h:25}]},plate),true);
 const base={sizeKey:'GR-ES-AB-120X80-T15',themeId:'familienschilder',defaultDesignId:'X'};
 assert.deepEqual(validateShopProductCut({...base,groessenWahl:'alle',motive:'ohne'}),{...base,groessenWahl:'alle',motive:'ohne'});
 assert.throws(()=>validateShopProductCut({...base,motive:'nur'}),/motive/);
});
