import test from 'node:test';import assert from 'node:assert/strict';
import {readShopProductCut,shopProductCutMetafield} from './shop-product-cut.mjs';
test('139: product JSON metafield supplies an exact immutable-by-copy size, theme and starter',()=>{
 const cut={sizeKey:'AB120x80',themeId:'familie',defaultDesignId:'D800'},field=shopProductCutMetafield(cut);
 assert.deepEqual(readShopProductCut(field),cut);cut.themeId='changed';assert.equal(readShopProductCut(field).themeId,'familie');
 for(const bad of [{...field,key:'other'},{...field,value:'{}'},{...field,value:'null'},{...field,value:JSON.stringify({...cut,priceCents:0})}])assert.throws(()=>readShopProductCut(bad),/Produktschnitt|Produkt-Metafeld/);
});
