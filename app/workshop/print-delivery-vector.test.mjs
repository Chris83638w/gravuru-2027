import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {printDelivery} from './print-delivery.mjs';
import {importEnvironment} from './design-assets.mjs';
import {exportSettings} from '../configurator/variant-m/print-export-model.mjs';
const contour='0 0 m 20 0 l 20 30 l 0 30 l h\n4 4 m 6 4 l 6 6 l 4 6 l h';
const rectangle=(x,y)=>`${x} ${y} m ${x+2} ${y} l ${x+2} ${y+3} l ${x} ${y+3} l h`;
function input(options){
 const width=20,height=30,alpha=new Uint8Array(width*height),rgb=new Uint8Array(width*height*3);
 return {settings:exportSettings({width,height},options),pixels:{width,height,rgb,alpha,whiteAlpha:alpha,whiteAllowed:new Uint8Array(width*height).fill(255)},paths:{cut:contour,color:contour,white:contour},artwork:[{type:'text',paths:[{path:rectangle(2,10),rgb:[0,0,0]},{path:rectangle(5,10),rgb:[0,0,0]}]},{type:'text',paths:[{path:rectangle(10,20),rgb:[120,50,30]}]}]};
}
function inspect(bytes){return JSON.parse(execFileSync('python3',['-c',`import sys,json,pymupdf as f
p=f.open(stream=sys.stdin.buffer.read(),filetype='pdf');page=p[0];objects='\\n'.join(p.xref_object(i) for i in range(1,p.xref_length()));drawings=page.get_drawings()
def paths(layer):return [repr(d['items']) for d in drawings if d.get('layer')==layer]
print(json.dumps({'repaired':p.is_repaired,'images':len(page.get_images()),'fonts':len(page.get_fonts()),'nestedTextForms':len([x for x in page.get_xobjects() if x[1].startswith('TextEntry')]),'colorPaths':paths('Farbmotiv'),'whitePaths':paths('RDG_WHITE'),'cutPaths':paths('CutContour'),'spotWhite':'/RDG_WHITE' in objects,'pageBox':list(page.rect)}))`],{input:bytes,env:importEnvironment()}).toString());}
test('grouped text entries stay two compound vector paths and never become bitmap images in Roland or Mimaki',async()=>{
 for(const profile of ['roland','mimaki']){
  const result=await printDelivery(input({profile})),color=inspect(result.pdf);
  assert.equal(color.repaired,false);assert.equal(color.images,0);assert.equal(color.fonts,0);assert.equal(color.nestedTextForms,0);assert.equal(color.colorPaths.length,2);
  if(profile==='mimaki'){
   const white=inspect(Buffer.from(await result.extras[0].blob.arrayBuffer()));assert.equal(white.images,0);assert.equal(white.spotWhite,true);assert.equal(color.spotWhite,false);
   for(const path of color.colorPaths)assert.ok(white.whitePaths.includes(path));
  }else{for(const path of color.colorPaths)assert.ok(color.whitePaths.includes(path));}
 }
});
test('Mimaki white carries identical vector outer and hole cut paths, page origin and mirror at both bleed sizes',async()=>{
 for(const bleedMm of [0,1])for(const mirror of [false,true]){
  const result=await printDelivery(input({profile:'mimaki',bleedMm,mirror})),color=inspect(result.pdf),white=inspect(Buffer.from(await result.extras[0].blob.arrayBuffer()));
  assert.equal(white.cutPaths.length,1);assert.deepEqual(white.cutPaths,color.cutPaths);assert.deepEqual(white.pageBox,color.pageBox);assert.equal(white.images,0);assert.equal(white.colorPaths.length,0);
 }
});
