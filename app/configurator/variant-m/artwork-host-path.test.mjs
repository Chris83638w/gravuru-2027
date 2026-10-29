import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {artworkFragment,isArtworkResource} from './artwork-resource.mjs';
import {previewResourceMarkup} from './preview-resource.mjs';

// Exercise the real host transformer without starting either application or DB.
const host=fs.readFileSync(new URL('../../workshop/acryl-employee-host.mjs',import.meta.url),'utf8');
const declarations=host.split('\n').filter(line=>/^(?:const rewrites=|const nativeAssets=|export function acrylAssetText\()/.test(line));
assert.equal(declarations.length,3,'host rewrite fixture must follow the actual transformer');
const rewrite=vm.runInNewContext(declarations.join('\n').replace('export function','function')+'\nacrylAssetText;');
const source=fs.readFileSync(new URL('./artwork-resource.mjs',import.meta.url),'utf8');
const moduleFor=async code=>import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const assetId='a'.repeat(64),url='/api/workshop/design-assets/'+assetId+'/preview.svg';
function resource(unit=false){
 const widthMm=116.64999999999999,heightMm=150.64999999999998;
 return {key:'artwork-'+assetId,bounds:unit?[0,0,1,1]:[0,0,widthMm,heightMm],embeddedOnly:true,svgFragment:artworkFragment(assetId,...(unit?[]:[widthMm,heightMm])),artwork:{schema:'gravuru-imported-artwork/v1',assetId,sourceSha256:'b'.repeat(64),previewSha256:'c'.repeat(64),format:'svg',page:1,pageCount:1,widthMm,heightMm}};
}
for(const bundled of [false,true])test('immutable artwork survives real Acryl host rewrite: '+(bundled?'bundle':'single module'),async()=>{
 let output;
 if(bundled){
  const transformed=rewrite('const MODULES='+JSON.stringify([{url:'/configurator/variant-m/artwork-resource.mjs',code:source}])+';','/_bundle/editor-test.mjs');
  const modules=JSON.parse(transformed.slice('const MODULES='.length,-1));
  assert.equal(modules[0].url,'/acryl-configurator/variant-m/artwork-resource.mjs');
  output=modules[0].code;
 }else output=rewrite(source,'/configurator/variant-m/artwork-resource.mjs');
 const delivered=await moduleFor(output);
 for(const unit of [false,true]){
  const item=resource(unit),before=JSON.stringify(item);
  assert.ok(isArtworkResource(item));
  assert.ok(delivered.isArtworkResource(item));
  assert.equal(delivered.artworkFragment(assetId,...(unit?[]:[item.artwork.widthMm,item.artwork.heightMm])),item.svgFragment);
  assert.equal(JSON.stringify(item),before);
  for(const fragment of [item.svgFragment.replace('/api/workshop/','https://foreign.invalid/'),item.svgFragment.replace('/api/workshop/','/api/workshop/acryl/'),item.svgFragment.replace('/>',' onload="alert(1)"/>'),item.svgFragment.replace(assetId,'d'.repeat(64))]){
   assert.equal(delivered.isArtworkResource({...item,svgFragment:fragment}),false);
  }
  assert.equal(delivered.isArtworkResource({...item,bounds:[0,0,99,99]}),false);
  assert.equal(delivered.isArtworkResource({...item,embeddedOnly:false}),false);
 }
});
test('canonical imported image still resolves through authenticated parent without changing descriptor',t=>{
 const old=globalThis.window;t.after(()=>{if(old===undefined)delete globalThis.window;else globalThis.window=old;});
 const item=resource(),before=JSON.stringify(item),bytes='data:image/svg+xml;base64,PHN2Zy8+';
 globalThis.window={parent:{GravuruPreviewResources:{[url]:bytes}}};
 assert.ok(previewResourceMarkup(item.svgFragment).includes(bytes));
 assert.equal(JSON.stringify(item),before);assert.ok(isArtworkResource(item));
});
