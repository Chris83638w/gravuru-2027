import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {once} from 'node:events';
import {makeAcrylicConfig} from '../configurator/variant-m/acrylic-product.mjs';
import {measureText,textPaths} from '../platform/sources/app/shared/models/doorbell-preview.mjs';
import {photoShape} from '../platform/sources/app/shared/models/photo-shape.mjs';
import {createWorkshop} from './http.mjs';
import {createPreviewServer} from '../configurator/variant-m/server.mjs';
import {planPreparedDesign,applyPreparedDesign} from './prepared-design.mjs';
import {planCustomerFields,applyCustomerFields} from './customer-fields.mjs';
import {validateProductDesign,resolveProduct} from './product-model.mjs';
const resources=JSON.parse(fs.readFileSync(new URL('../designs/acrylic-unser-anfang/resources.json',import.meta.url)));
const artwork=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="150mm" height="200mm" viewBox="0 0 150 200"><path d="M10 140V65C10 30 40 5 75 5" fill="none" stroke="#b76a45"/></svg>').toString('base64');
const pkg=()=>({schema:'gravuru-prepared-design/v1',designId:'uv-test',name:'Synthetischer Ebenentest',widthMm:150,heightMm:200,sourceSha256:'a'.repeat(64),layers:[
 {id:'customer-photo',type:'photoSlot',fieldKey:'photo-main',label:'Dein Foto',x:75,y:75,widthMm:120,heightMm:140,shape:'arch',required:true},
 {id:'decoration',type:'artwork',name:'Rahmen.svg',bytes:artwork},
 {id:'customer-names',type:'text',fieldKey:'names',label:'Namen',x:75,y:160,text:'Änne & Jörg',font:'Garamond Acryl',size:5,letterSpacing:.4,color:'#b76a45',allowColor:true,allowMove:false}
]});
function setup(t){
 const config=makeAcrylicConfig({profile:{kind:'universal-product',schemaVersion:2}},resources,'b'.repeat(64));
 for(const o of config.profile.designs[0].objects.filter(o=>o.type==='text')){measureText(o,resources.fonts);if(o.id==='names'){o.size*=118/o.w;measureText(o,resources.fonts);}}
 const ws=createWorkshop({filename:':memory:',seedConfig:config,legacy:{purchasing:{},features:{}}});t.after(()=>ws.close());return ws;
}
test('prepared import adds reviewed design, retains history, layers, all 28 prices and rejects duplicate import',async t=>{
 const ws=setup(t),before=ws.repository.get(ws.defaultId),input={expectedRevision:1,package:pkg(),makeDefault:true};
 const plan=await planPreparedDesign(ws.repository,ws.assets,ws.defaultId,input);
 assert.deepEqual(ws.repository.get(ws.defaultId),before);assert.equal(plan.fields,2);assert.equal(plan.layers,3);
 const saved=await applyPreparedDesign(ws.repository,ws.assets,ws.defaultId,{...input,token:plan.token});
 assert.deepEqual(saved.document.config.profile.designs[0],before.document.config.profile.designs[0]);
 assert.deepEqual(saved.document.config.profile.designs[1].objects.map(o=>o.id),['customer-photo','decoration','customer-names']);
 assert.equal(saved.document.config.profile.defaultDesignId,'uv-test');assert.equal(saved.revision,2);
 assert.deepEqual(ws.repository.get(ws.defaultId,{revision:1}),before);
 for(const size of ['small','large'])for(const base of ['none','buche','eiche','nussbaum','klar','satiniert','holz-flach'])for(const wall of ['none','wall'])assert.deepEqual(resolveProduct(saved.document,{options:{size,base,wall}}).price,resolveProduct(before.document,{options:{size,base,wall}}).price);
 await assert.rejects(planPreparedDesign(ws.repository,ws.assets,ws.defaultId,{...input,expectedRevision:2}),/bereits vorhanden/);
});
test('preview token binds package and revision; malformed masks/fonts/active SVG cannot save',async t=>{
 const ws=setup(t),input={expectedRevision:1,package:pkg()},plan=await planPreparedDesign(ws.repository,ws.assets,ws.defaultId,input);
 const changed=structuredClone(input);changed.package.layers[2].text='Geändert';
 await assert.rejects(applyPreparedDesign(ws.repository,ws.assets,ws.defaultId,{...changed,token:plan.token}),/seit der Vorschau/);
 for(const change of [p=>p.layers[0].shape='anything',p=>p.layers[0].heightMm=10,p=>p.layers[2].font='Invented',p=>p.layers[2].letterSpacing=-1,p=>p.layers[1].bytes=Buffer.from('<svg width="150mm" height="200mm"><script>alert(1)</script></svg>').toString('base64')]){
  const p=pkg();change(p);await assert.rejects(planPreparedDesign(ws.repository,ws.assets,ws.defaultId,{...input,package:p}));
 }
 assert.equal(ws.repository.get(ws.defaultId).revision,1);
 await assert.rejects(planPreparedDesign(ws.repository,ws.assets,ws.defaultId,{...input,expectedRevision:8}),/geändert/);
});
test('customer replacement keeps arch and spacing, forbids mask/spacing tampering',async t=>{
 const ws=setup(t),input={expectedRevision:1,package:pkg()},p=await planPreparedDesign(ws.repository,ws.assets,ws.defaultId,input);
 const d=structuredClone(p.document.config.profile.designs[1]);d.objects[0].uxUploadId='local-photo';d.objects[0].uxUploadKind='photo';d.objects[0].uxPhotoBackground='keep';d.objects[2].text='Änne & Jörg – Grüße';
 assert.throws(()=>validateProductDesign(p.document,d),/Zeichen.*–.*nicht/);d.objects[2].text='Änne & Jörg: Grüße';
 const checked=validateProductDesign(p.document,d);assert.equal(checked.objects[0].photoShape,'arch');assert.equal(checked.objects[2].letterSpacing,.4*.93);
 for(const change of [d=>d.objects[0].photoShape='rect',d=>d.objects[2].letterSpacing=0]){const v=structuredClone(d);change(v);assert.throws(()=>validateProductDesign(p.document,v));}
 assert.match(photoShape(d.objects[0]),/^<path d="M/);assert.match(p.svg,/<path d="M-55/);
 const o={font:'Garamond Acryl',text:'AA',size:5},a=measureText({...o},resources.fonts),b=measureText({...o,letterSpacing:.4},resources.fonts);assert.ok(Math.abs(b.w-a.w-.4)<1e-9);assert.notEqual(textPaths(a,resources.fonts),textPaths(b,resources.fonts));
});
test('re-editing customer fields retains artwork overlay order and tracking',async t=>{
 const ws=setup(t),input={expectedRevision:1,package:pkg()},p=await planPreparedDesign(ws.repository,ws.assets,ws.defaultId,input);
 const saved=await applyPreparedDesign(ws.repository,ws.assets,ws.defaultId,{...input,token:p.token}),d=saved.document.config.profile.designs[1];
 const fields=d.customerFields.map(f=>{const o=d.objects.find(o=>o.id===f.id);return {...o,label:f.label,allowColor:true,allowMove:false,widthMm:o.w,heightMm:o.h,shape:o.photoShape};});
 const req={expectedRevision:2,designId:d.id,fields,sourcePrepared:true};const review=planCustomerFields(ws.repository,ws.assets,ws.defaultId,req);
 const next=applyCustomerFields(ws.repository,ws.assets,ws.defaultId,{...req,token:review.token});
 assert.deepEqual(next.document.config.profile.designs[1].objects.map(o=>o.id),d.objects.map(o=>o.id));
 assert.equal(next.document.config.profile.designs[1].objects[2].letterSpacing,d.objects[2].letterSpacing);
});
test('prepared HTTP route enforces CSRF, reviews and persists a new design',async t=>{
 const ws=setup(t),server=createPreviewServer({workshop:ws});server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(r=>server.close(r)));
 const url='http://127.0.0.1:'+server.address().port,route=url+'/api/workshop/products/'+ws.defaultId+'/prepared-design/';
 const session=await (await fetch(url+'/api/workshop/session')).json();
 const send=(action,data,token=session.csrfToken)=>fetch(route+action,{method:'POST',headers:{'Content-Type':'application/json','X-Gravuru-CSRF':token},body:JSON.stringify(data)});
 const data={expectedRevision:1,package:pkg()};assert.equal((await send('preview',data,'bad')).status,403);
 const response=await send('preview',data);assert.equal(response.status,200);const plan=await response.json();assert.equal(plan.document,undefined);
 assert.equal((await send('apply',{...data,token:plan.token})).status,200);assert.equal(ws.repository.get(ws.defaultId).revision,2);
});

test('layer preparer preserves sample in a separate preview and rejects an unassigned text or altered arch',async()=>{
 const {spawnSync}=await import('node:child_process');
 const script=String.raw`
import importlib.util,tempfile,json,base64,struct,zlib
from pathlib import Path
s=importlib.util.spec_from_file_location('prepare','scripts/prepare-layered-design.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
def chunk(t,d):return struct.pack('>I',len(d))+t+d+struct.pack('>I',zlib.crc32(t+d)&0xffffffff)
png=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',1,1,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(b'\0\xff\0\0'))+chunk(b'IEND',b'')
photo=base64.b64encode(png).decode()
svg='<svg xmlns="http://www.w3.org/2000/svg" width="150mm" height="200mm" viewBox="0 0 150 200"><defs><clipPath id="mask"><path d="M14 144 V69.5 C14 33.877 42.877 5 78.5 5 C114.123 5 143 33.877 143 69.5 V144 Z"/></clipPath></defs><g id="photo"><g clip-path="url(#mask)"><image href="data:image/png;base64,'+photo+'"/></g></g><g id="art"><path d="M1 1H10"/></g><g id="names"><text x="75" y="170" text-anchor="middle" font-family="Garamond" font-size="5" fill="#000000">Test</text></g></svg>'
mapping={'designId':'test','name':'Test','fonts':{'Garamond':'Garamond Acryl'},'photo':{'layerId':'photo','fieldKey':'photo-main','label':'Foto','x':14,'y':5,'width':129,'height':139},'textLayers':{'names':{'fieldKey':'names','label':'Namen'}}}
with tempfile.TemporaryDirectory() as tmp:
 p=Path(tmp)/'source.svg';p.write_text(svg);result=m.prepare(p,mapping)
 assert len(result['layers'])==3 and result['layers'][0]['shape']=='arch'
 example=result['layers'][0].pop('example')
 assert photo in base64.b64decode(example['bytes']).decode()
 assert photo not in json.dumps(result)
 assert 'uxUploadId' not in json.dumps(result)
 for invalid in [svg.replace('33.877','30'),svg.replace('id="names"','id="unmapped"'),svg.replace('<g id="art">','<g id="art" transform="rotate(10)">')]:
  p.write_text(invalid)
  try:m.prepare(p,mapping)
  except m.c.ImportFailure:pass
  else:raise AssertionError('unsupported source accepted')
`;
 const result=spawnSync(process.env.GRAVURU_PYTHON||'python3',['-c',script],{cwd:new URL('../../',import.meta.url),encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
});

test('example is a separate checked resource, not a customer upload; original text stays intact',async t=>{
 const ws=setup(t),p=pkg();
 p.layers[0].example={name:'example.svg',bytes:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="120mm" height="140mm"><path d="M10 10H100V120Z" fill="#123456"/></svg>').toString('base64')};
 p.layers[2].text='Pia & Rafael';
 const req={expectedRevision:1,package:p},plan=await planPreparedDesign(ws.repository,ws.assets,ws.defaultId,req);
 const saved=await applyPreparedDesign(ws.repository,ws.assets,ws.defaultId,{...req,token:plan.token});
 const d=saved.document.config.profile.designs[1],example=saved.document.config.localResources.photoExamples[0];
 assert.equal(d.objects[2].text,'Pia & Rafael');assert.equal(d.objects[0].uxUploadId,undefined);
 assert.equal(example.slotId,d.objects[0].id);assert.equal(ws.assets.get(example.assetId).widthMm,120);
 assert.equal(saved.document.elementRights[d.id][d.objects[2].id].content,true);
 const bad=structuredClone(saved.document);bad.config.localResources.photoExamples[0].assetId='e'.repeat(64);
 assert.throws(()=>ws.assets.validateDocument(bad),/nicht gefunden/);
 const {replaceDesignArtwork}=await import('./design-import.mjs');
 const replaced=replaceDesignArtwork(saved.document,ws.assets,{designId:d.id,assetId:d.importedSource.assetId,fit:'visible',originalName:'Test.svg'});
 assert.deepEqual(replaced.document.config.localResources.photoExamples,[]);
});
