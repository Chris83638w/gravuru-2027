import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareNativeShellState} from './native-shell-state.mjs';

test('native initialisation uses the product revision and dimensions without reference-device state or commerce',async()=>{
 const profile={id:'native-product',revision:'revision-7',geometry:{width:120,height:80}};
 const before=structuredClone(profile);
 const el={state:{selected:null,objects:[{id:'previous'}]},cfg:{productId:'old-preview',variants:[{id:'old-shop-variant'}],assignment:{schemaVersion:2,variantMap:{old:'wrong'}}},catalog:{product:{id:'old-preview',width_mm:160,height_mm:280,variants:[{}]}}};
 prepareNativeShellState(el,profile);
 assert.deepEqual(profile,before);
 assert.deepEqual([el.state.width,el.state.height],[120,80]);
 for(const key of ['fkFrame','fkMounting','acrylicColor'])assert.equal(Object.hasOwn(el.state,key),false,key);
 assert.deepEqual(el.state.objects,[]);assert.equal(el.state.designId,null);
 assert.equal(el.cfg.productId,profile.id);assert.deepEqual(el.cfg.variants,[]);assert.deepEqual(el.cfg.assignment.variantMap,{});
 assert.equal(el.catalog.product.id,profile.id);assert.equal(el.catalog.revision,profile.revision);
 assert.deepEqual([el.catalog.product.width_mm,el.catalog.product.height_mm],[120,80]);
 assert.equal(el.designCanOrder(),false);await el.order();
});
