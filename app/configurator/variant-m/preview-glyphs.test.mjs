import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import os from 'node:os';
import path from 'node:path';
import {previewGlyphPack,readPreviewGlyphPack,writePreviewGlyphPack} from './preview-glyphs.mjs';
import {designResourcesReady} from './doorbell-lazy-designs.mjs';
import {studioSvg} from '../../platform/sources/app/shared/models/studio-svg.mjs';
import {textPaths} from '../../platform/sources/app/shared/models/text-paths.mjs';
import {doorbellFixture} from '../../workshop/test-fixtures/doorbell-config.mjs';
import {createModelSlimmer} from '../../workshop/shop-model-slim.mjs';
import {acrylCacheControl} from '../../workshop/acryl-employee-host.mjs';
import {attach} from './lazy-resources.mjs';
import {shopWarmManifest} from '../../workshop/shop-warm-manifest.mjs';
import {validWarmManifest,warmShopAssets} from '../../workshop/ui/shop-warm.mjs';

const alphabet='Familie?';
function face(mark){
 const glyphs={};
 for(const char of alphabet+'Q')glyphs[char]={a:400,d:'M0 0H'+char.codePointAt(0)+mark+'V8H0Z'};
 for(let index=0;index<80;index++)glyphs[String.fromCodePoint(0x100+index)]={a:100,d:('M0 0H'+index+'V9H0Z').repeat(30)};
 return {units:1000,glyphs};
}
function model(){
 const config=doorbellFixture();
 for(const format of config.doorbell.formats)format.profile.designs=Array.from({length:16},(_,index)=>({id:format.key+'-'+index,name:'V'+index,marks:[],objects:[{id:'t',type:'text',text:'Familie',font:'Probe',x:30,y:30,w:40,h:8,size:8,rotation:0,color:'#fff'}]}));
 config.localResources.fonts={Probe:{regular:face('A'),bold:face('B')}};
 return config;
}
test('card markup with the preview pack matches the full font, and the export font is untouched',()=>{
 const config=model();
 const pack=previewGlyphPack(config);
 assert.equal(pack.body.length<JSON.stringify(config.localResources.fonts).length/2,true);
 const parsed=JSON.parse(pack.body);
 assert.deepEqual(parsed.fonts.Probe.regular.glyphs.F,config.localResources.fonts.Probe.regular.glyphs.F);
 assert.equal(parsed.fonts.Probe.regular.glyphs.Q,undefined);
 const full=config.localResources.fonts;
 const subset={Probe:{...parsed.fonts.Probe,previewSubset:true}};
 let cards=0;
 for(const format of config.doorbell.formats)for(const design of format.profile.designs){
  const profile={...config.profile,...format.profile,material:config.profile.material};
  assert.equal(studioSvg(profile,design,subset,{id:'karte',handles:false,guides:false}),studioSvg(profile,design,full,{id:'karte',handles:false,guides:false}));
  cards++;
 }
 assert.equal(cards,48);
 const text={type:'text',text:'Familie',font:'Probe',size:8,x:0,y:0,w:40,h:8};
 assert.equal(textPaths(text,full),textPaths(text,subset));
 assert.equal(designResourcesReady(config.doorbell.formats[0].profile.designs[0],subset,{}),true);
 const outside={objects:[{type:'text',text:'Q',font:'Probe'}]};
 assert.equal(designResourcesReady(outside,subset,{}),false);
 assert.equal(designResourcesReady(outside,full,{}),true);
 const changed=previewGlyphPack({...config,localResources:{fonts:{Probe:{regular:face('Z')}}}});
 assert.notEqual(changed.hash,pack.hash);
 assert.equal(acrylCacheControl(pack.url,200),'public, max-age=31536000, immutable');
 assert.ok(zlib.gzipSync(pack.body).length<pack.body.length);
});
test('the loader stores the pack beside the stage font and data saving does not warm it',async()=>{
 const config=model();
 const slimmer=createModelSlimmer();
 const pack=slimmer.attachPreviewGlyphs(config);
 const body=slimmer.previewGlyphFile(pack.hash);
 assert.equal(body.toString(),pack.body.toString());
 const el={fontData:{Probe:config.localResources.fonts.Probe},motifs:{},catalog:{motifs:{},motif_bounds:{}},shadowRoot:{querySelectorAll:()=>[]},dataset:{},dispatchEvent(){}};
 let asked=0;
 attach(el,{catalog:{font_index:[],motif_index:[]},entries:[],prepare(){},previewGlyphs:pack.url,get:async()=>{asked++;return JSON.parse(pack.body);}});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(asked,1);
 assert.equal(el.fontData.Probe,config.localResources.fonts.Probe);
 assert.equal(el.uxPreviewFonts.Probe.previewSubset,true);
 assert.equal(Object.hasOwn(el.fontData.Probe,'previewSubset'),false);
 const manifest=shopWarmManifest(config,{editorPath:'/_merchant-acryl-editor.html'});
 assert.equal(manifest.previewGlyphs,pack.url);
 assert.equal(validWarmManifest(manifest),true);
 const cold=await warmShopAssets(manifest,{connection:{saveData:true},fetchImpl:async()=>{throw Error('darf nicht laden');}});
 assert.equal(cold.skipped,true);
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'glyphen-'));
 writePreviewGlyphPack(directory,pack);
 const again=createModelSlimmer({previewGlyphDirectory:directory});
 assert.equal(again.previewGlyphFile(pack.hash).toString(),pack.body.toString());
 assert.equal(readPreviewGlyphPack(directory,pack.hash).toString(),pack.body.toString());
 fs.rmSync(directory,{recursive:true,force:true});
});
