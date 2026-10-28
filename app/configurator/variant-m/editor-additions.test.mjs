import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyPixelPosition,placementScales,MOTIF_MIN_MM} from './motif-placement.mjs';
import {PLACEMENT_STEP,NO_FREE_SPACE_MESSAGE} from './workflow-model.mjs';
import fs from 'node:fs';
import vm from 'node:vm';
import {textPaths,measureText} from '../../platform/sources/app/shared/models/doorbell-preview.mjs';
import {cleanObject} from './contract.mjs';
import {rightForProperty} from './element-rights.mjs';
test('Free motif space respects ink, transparent holes and excluded base area',()=>{
 const a=new Uint8ClampedArray(80*100*4);for(let y=0;y<100;y++)for(let x=0;x<80;x++)a[(y*80+x)*4+3]=(x>=15&&x<50&&y>=15&&y<45)?0:255;
 const p=emptyPixelPosition(a,80,100,12,12,(_x,y)=>y<90);assert.ok(p);assert.ok(p.x>=23&&p.x<=42&&p.y>=23&&p.y<=37);
 assert.equal(emptyPixelPosition(a,80,100,60,60),null);assert.equal(emptyPixelPosition(a,80,100,12,12,()=>false),null);
});
// Chris 22./23.10.2026: Motivplatzsuche verkleinert schrittweise bis zur Mindestgröße (10 mm längste Seite),
// sucht innerhalb des Gestaltungsrands und meldet erst dann „Kein freier Platz“, wenn auch das nicht reicht.
test('Motivplatzsuche: Stufen 1 → 0,9ⁿ → Mindestgröße; Pixelsuche findet die Lücke erst verkleinert; Rand und Hinweis im Code',()=>{
 assert.equal(MOTIF_MIN_MM,10);
 assert.deepEqual(placementScales(1),[1]);assert.deepEqual(placementScales(1.5),[1]);assert.deepEqual(placementScales(undefined),[1]);
 const scales=placementScales(0.5);
 assert.equal(scales[0],1);assert.equal(scales.at(-1),0.5,'letzte Stufe genau die Mindestgröße');
 for(let i=1;i<scales.length-1;i++)assert.ok(Math.abs(scales[i]-PLACEMENT_STEP**i)<1e-9,'Stufe '+i);
 assert.ok(scales.every((s,i)=>!i||s<scales[i-1]),'streng fallend');assert.equal(scales.length,8);
 // 80 × 100 px, frei ist nur ein Fenster 20 × 20 px (x 50–70, y 40–60): ein 30-px-Kasten passt erst ab Stufe 0,9³ ≈ 21,9 → 0,9⁴ ≈ 19,7 px.
 const a=new Uint8ClampedArray(80*100*4);for(let y=0;y<100;y++)for(let x=0;x<80;x++)a[(y*80+x)*4+3]=(x>=50&&x<70&&y>=40&&y<60)?0:255;
 const found=placementScales(0.3).map(s=>[s,emptyPixelPosition(a,80,100,30*s,30*s)]).find(([,p])=>p);
 assert.ok(found,'verkleinert gefunden');assert.ok(found[0]<0.9**3+1e-9&&found[0]>=0.3,String(found[0]));
 assert.ok(found[1].x>=55&&found[1].x<=65&&found[1].y>=45&&found[1].y<=55,JSON.stringify(found[1]));
 assert.equal(placementScales(0.8).map(s=>emptyPixelPosition(a,80,100,30*s,30*s)).find(Boolean),undefined,'Mindestgröße zu groß → nichts frei');
 // placeNewMotif: Rand (safeMarginMm) als Innenabstand der Kontur, Stufen aus placementScales, mittig + Hinweis als letzter Ausweg.
 const code=fs.readFileSync(new URL('./motif-placement.mjs',import.meta.url),'utf8');
 assert.match(code,/insideContour\(g,x\/scale,y\/scale,-margin\)/);
 assert.match(code,/for\(const s of placementScales\(minScale\)\)/);
 assert.match(code,/if\(s<1\)\{object\.w\*=s;object\.h\*=s;\}/);
 // Execute the actual no-space fallback: normal plates use their centre;
 // layered doorbells use the centre of the permitted design area.
 const fallback=code.slice(code.lastIndexOf('\n object.x='),code.lastIndexOf('\n}'));
 assert.ok(fallback.startsWith('\n object.x='),'echter Fallback ist vorhanden');
 for(const [area,expected] of [[null,{x:60,y:40}],[{left:12,right:72,top:18,bottom:46},{x:42,y:32}]]){
  const object={id:'new',w:10,h:8},messages=[];let synced=0;
  const el={state:{selected:null},sync(){synced++;}};
  vm.runInNewContext(fallback,{area,object,el,config:{profile:{geometry:{width:120,height:80}}},say:message=>messages.push(message),NO_FREE_SPACE_MESSAGE});
  assert.deepEqual(object,{id:'new',w:10,h:8,...expected});assert.equal(el.state.selected,'new');assert.equal(synced,1);
  assert.deepEqual(messages,[NO_FREE_SPACE_MESSAGE]);
 }
 assert.equal(NO_FREE_SPACE_MESSAGE,'Kein freier Platz – Element liegt über anderen.');
});
test('Italic is retained, protected by content rights and rendered as vector geometry',()=>{
 const font={units:1000,glyphs:{A:{a:600,d:'M0 0L300 800L600 0Z'}}},fonts={Demo:{regular:font,bold:{...font,glyphs:{A:{a:650,d:'M0 0L320 800L650 0Z'}}}}};
 const o={id:'t',type:'text',font:'Demo',text:'A',size:10,bold:true,italic:true};
 assert.equal(cleanObject(o).italic,true);assert.equal(rightForProperty('italic'),'content');
 assert.match(textPaths(o,fonts),/skewX\(-12\)/);assert.match(textPaths(o,fonts),/L320 800/);assert.doesNotMatch(textPaths({...o,italic:false},fonts),/skewX/);
 assert.ok(measureText(o,fonts).w>6.5);
});
