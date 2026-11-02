import test from 'node:test';
import assert from 'node:assert/strict';
import {doorbellFixture} from '../../workshop/test-fixtures/doorbell-config.mjs';
import {validateDoorbellDefinition,doorbellPriceBase,doorbellSelection,selectedDoorbellProfile,selectedDoorbellDesign,switchDoorbellDesign,translateDoorbellPath,doorbellLayoutIssue} from './doorbell-selection.mjs';

test('three format sources stay unchanged; 240 price/position choices resolve native mm',()=>{
 const c=doorbellFixture(),before=structuredClone(c);validateDoorbellDefinition(c);let count=0;
 for(const f of c.doorbell.formats)for(const position of ['standard','opposite'])for(const frame of c.profile.frames)for(const color of ['schwarz','anthrazit'])for(const mounting of c.profile.mounting.options){
  const options={format:f.key,position,frame:frame.key,color,mounting:mounting.key},p=selectedDoorbellProfile(c,options);
  assert.equal(p.geometry.width,f.profile.geometry.width);assert.equal(p.geometry.height,f.profile.geometry.height);
  assert.equal(p.geometry.bell.width,f.profile.geometry.bell.width);assert.equal(p.geometry.bell.height,f.profile.geometry.bell.height);
  assert.equal(p.material.color,color==='anthrazit'?'#33383e':'#111214');
  assert.equal(doorbellPriceBase(c,options),f.basePriceCents);assert.equal(p.geometry.holes.length,mounting.key==='B04S'?4:0);
  assert.equal(p.geometry.holes.every(h=>h.diameter===4),true);
  for(const d of p.designs)for(const o of d.objects)assert.equal(doorbellLayoutIssue(o,p),'');
  count++;
 }
 assert.equal(count,240);assert.deepEqual(c,before);
});

test('single selected template matches the full profile in every format, position, frame, colour and mounting',()=>{
 const c=doorbellFixture(),before=structuredClone(c);let checked=0;
 for(const f of c.doorbell.formats)for(const position of ['standard','opposite'])for(const frame of c.profile.frames)for(const color of ['schwarz','anthrazit'])for(const mounting of c.profile.mounting.options){
  const options={format:f.key,position,frame:frame.key,color,mounting:mounting.key};
  for(const expected of selectedDoorbellProfile(c,options).designs){const actual=selectedDoorbellDesign(c,expected.id,options);assert.deepEqual(actual,expected);actual.objects[0].x+=100;assert.deepEqual(selectedDoorbellDesign(c,expected.id,options),expected);checked++;}
 }
 assert.equal(checked,240);assert.deepEqual(c,before);
 for(const options of [{frame:'missing'},{color:'missing'},{mounting:'missing'},{format:'missing'},{position:'missing'}])assert.throws(()=>selectedDoorbellDesign(c,'example',options));
 assert.throws(()=>selectedDoorbellDesign(c,'missing'),/Design gehört nicht zum Modell/);
});
test('opposite translates asymmetric device holes without rotating their local coordinates',()=>{
 const c=doorbellFixture();
 for(const f of c.doorbell.formats){
  const a=selectedDoorbellProfile(c,{format:f.key}),b=selectedDoorbellProfile(c,{format:f.key,position:'opposite'}),g=a.geometry,h=b.geometry;
  const dx=g.width-2*g.bell.x-g.bell.width,dy=g.height-2*g.bell.y-g.bell.height;
  assert.equal(h.bell.x,g.width-g.bell.x-g.bell.width);assert.equal(h.bell.y,g.height-g.bell.y-g.bell.height);
  assert.equal(h.bellImageBounds.x-g.bellImageBounds.x,dx);
  for(let i=0;i<g.cutBoundsMm.length;i++){
   assert.equal(h.cutBoundsMm[i].x-h.bell.x,g.cutBoundsMm[i].x-g.bell.x);
   assert.equal(h.cutBoundsMm[i].y-h.bell.y,g.cutBoundsMm[i].y-g.bell.y);
   assert.equal(h.cutBoundsMm[i].width,g.cutBoundsMm[i].width);
   assert.equal(h.cutPaths[i],translateDoorbellPath(g.cutPaths[i],dx,dy));
  }
  assert.deepEqual(h.optionalCornerPaths,g.optionalCornerPaths);assert.deepEqual(b.mounting.holes,a.mounting.holes);
 }
});
test('template identity and edits roundtrip through both positions and formats',()=>{
 const c=doorbellFixture(),a={format:'16x28'},b={format:'24x20'},op={format:'16x28',position:'opposite'};
 const d=selectedDoorbellDesign(c,'example',a);d.objects[0].x+=3;d.objects[0].w=25;d.objects[0].rotation=7;d.objects[0].customTest='kept';
 d.objects.push({id:'own',type:'motif',motif:'example',x:60,y:80,w:5,h:5,rotation:0});
 const once=switchDoorbellDesign(c,d,a,op),twice=switchDoorbellDesign(c,once,op,a);
 assert.deepEqual(twice,d);assert.equal(once.objects[0].rotation,7);assert.equal(once.objects[1].rotation,180);
 assert.deepEqual(switchDoorbellDesign(c,once,op,op),once);
 const cross=switchDoorbellDesign(c,d,a,b);
 assert.equal(cross.objects[0].w,25);assert.equal(cross.objects[0].rotation,7);assert.equal(cross.objects[0].customTest,'kept');
 const returned=switchDoorbellDesign(c,cross,b,a);
 for(let i=0;i<d.objects.length;i++){assert.ok(Math.abs(returned.objects[i].x-d.objects[i].x)<1e-9);assert.ok(Math.abs(returned.objects[i].y-d.objects[i].y)<1e-9);}
 const deleted={...d,objects:d.objects.slice(1)};assert.equal(switchDoorbellDesign(c,deleted,a,b).objects.some(o=>o.id==='name'),false);
});
test('native frame edges and actual device keepout, not portrait constants',()=>{
 const c=doorbellFixture(),p=selectedDoorbellProfile(c,{format:'35x18'});
 const obj={x:260,y:50,w:10,h:10,rotation:0};
 assert.equal(doorbellLayoutIssue(obj,p),'');assert.match(doorbellLayoutIssue({...obj,x:4},p),/Gestaltungsfläche/);
 assert.match(doorbellLayoutIssue({...obj,x:p.geometry.bell.x+10,y:p.geometry.bell.y+10},p),/Klingel/);
});

test('format-specific fixed decoration sets are replaced exactly while custom objects survive',()=>{
 const c=doorbellFixture(),extra={...c.profile.designs[0].objects[1],id:'mark-1',x:80};
 c.doorbell.formats[0].profile.designs[0].objects.push(structuredClone(extra));c.profile.designs[0].objects.push(structuredClone(extra));
 assert.doesNotThrow(()=>validateDoorbellDefinition(c));
 const from={format:'16x28'},to={format:'24x20'},source=selectedDoorbellDesign(c,'example',from);
 source.objects[0].x+=2;source.objects.push({id:'own',type:'motif',motif:'example',x:60,y:80,w:5,h:5,rotation:0});
 const changed=switchDoorbellDesign(c,source,from,to);
 assert.deepEqual(changed.objects.filter(o=>o.uxDecoration).map(o=>o.id),['mark-0']);
 assert.equal(changed.objects.at(-1).id,'own');
 const back=switchDoorbellDesign(c,changed,to,from);
 assert.deepEqual(back.objects.filter(o=>o.uxDecoration),source.objects.filter(o=>o.uxDecoration));
 assert.equal(back.objects[0].x,source.objects[0].x);assert.equal(back.objects.at(-1).id,'own');
 c.doorbell.formats[0].profile.designs[0].objects.at(-1).customerEditable=true;
 assert.throws(()=>validateDoorbellDefinition(c),/Native Elementidentität weicht zwischen Formaten ab/);
});

test('released editable template decorations remain valid only with matching native identities',()=>{
 const c=doorbellFixture();
 c.profile.designs[0].objects[1].customerEditable=true;
 for(const format of c.doorbell.formats)format.profile.designs[0].objects[1].customerEditable=true;
 assert.doesNotThrow(()=>validateDoorbellDefinition(c));
 const p=selectedDoorbellProfile(c),original=p.designs[0].objects[1];
 assert.equal(doorbellLayoutIssue(original,p),'');
 const moved={...original,x:p.geometry.bell.x+10,y:p.geometry.bell.y+10};
 assert.match(doorbellLayoutIssue(moved,p),/Klingel/);
 c.doorbell.formats[0].profile.designs[0].objects[1].templateOrigin=false;
 assert.throws(()=>validateDoorbellDefinition(c),/native Vorlagenmotive/);
});
test('absolute curves translate exactly while radii and winding remain intact',()=>{
 assert.equal(translateDoorbellPath('M 1 2 C 3 4 5 6 7 8 A 2 3 45 0 1 9 10 Z',10,-2),'M 11 0 C 13 2 15 4 17 6 A 2 3 45 0 1 19 8 Z');
 for(const path of ['m0 0 l2 2z','M 0','M 0 NaN Z','M0 0 A -1 2 0 0 1 2 3 Z','M0 0<script>'])assert.throws(()=>translateDoorbellPath(path));
});
test('incomplete geometry, fabricated prices, unknown position and source schema fail closed',()=>{
 for(const mutate of [
  c=>c.doorbell.schema='gravuru-aosu-specimen/v1',c=>c.doorbell.formats.pop(),
  c=>c.doorbell.formats[0].profile.geometry.cutPaths=[],
  c=>c.doorbell.formats[0].profile.geometry.bell.width=999,
  c=>c.doorbell.formats[0].profile.geometry.steelThicknessMm=2,
  c=>c.profile.optionGroups[0].values[0].priceCents=1,
  c=>c.profile.optionFields[0].choices[1].priceCents=1,
  c=>c.doorbell.formats[1].profile.designs[0].objects[0].id='changed'
 ]){const c=doorbellFixture();mutate(c);assert.throws(()=>validateDoorbellDefinition(c));}
 const c=doorbellFixture();assert.throws(()=>doorbellSelection(c,{position:'upside-down'}));assert.throws(()=>doorbellSelection(c,{format:'42x24'}));
});

