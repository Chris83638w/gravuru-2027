// Local, synthetic browser proof. No product, account, database or remote access.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {studioSvg} from '../app/platform/sources/app/shared/models/studio-svg.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=fs.readFileSync(path.join(root,'app/configurator/variant-m/refinements.mjs'),'utf8');
const gestures=source.slice(source.indexOf('  let resize=null;'),source.indexOf("  r.addEventListener('click',async e=>{"));
const profile={kind:'universal-product',geometry:{width:120,height:80,shape:'rectangle'},material:{kind:'steel',color:'#c5cdce'}};
const objects=[{id:'text',type:'text',text:'F',font:'probe',size:10,x:50,y:40,w:60,h:40},{id:'house',type:'motif',motif:'house',x:50,y:28,w:20,h:20}];
const fonts={probe:{regular:{units:1000,glyphs:{F:{a:600,d:'M0 0H150V280H450V430H150V550H600V700H0Z'}}}}};
const motifs=[{key:'house',bounds:[0,0,100,100],svgFragment:'<path d="M10 45L50 10L90 45M20 38V90H80V38" fill="none" stroke="#000000" stroke-width="8"/>'}];
const svg=studioSvg(profile,{id:'proof',name:'Synthetic overlap probe',textOnTop:true,objects},fonts,{motifs,handles:false}).replace('<svg ','<svg class="scene" ');
let report=null;
const page=`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Gravuru · lokale Trefferprüfung</title>
<style>body{font:16px system-ui;margin:14px;color:#193d42}h1{font-size:22px}button{padding:12px;margin:4px;border:1px solid #85a5aa;border-radius:8px;background:#e8f3f1}pre{white-space:pre-wrap;font-size:12px}#result{font-weight:bold}#mount{max-width:700px;margin:auto}small{display:block}</style>
<h1>Lokale Motiv-/Textprüfung</h1><p>Nur synthetisches Haus und F. Echtes SVG, ShadowRoot und unveränderte Gestenhandler.</p><button id="run">Gegenproben ausführen</button><button id="reset">Zurücksetzen</button><div id="result">Prüfung läuft …</div><div id="mount"></div><p id="interaction"></p><pre id="details"></pre>
<script type="module">
const markup=${JSON.stringify(svg)},original=${JSON.stringify(objects)};
const host=document.querySelector('#mount'),r=host.attachShadow({mode:'open'});
r.innerHTML='<style>:host{display:block}.plate-holder{touch-action:none;margin:24px 0}.scene{display:block;width:100%;max-height:420px;overflow:visible}.scene [data-object]{cursor:move}.ux-hint{font:14px system-ui}</style><div class="plate-holder"></div>';
const holder=r.querySelector('.plate-holder'),captures=new Set();
// Synthetic regression events have no active native pointer. Real input uses
// native capture; the wrapper simply records both through the same code path.
const nativeSet=holder.setPointerCapture.bind(holder),nativeRelease=holder.releasePointerCapture.bind(holder);
holder.setPointerCapture=id=>{captures.add(id);try{nativeSet(id);}catch{}};
holder.hasPointerCapture=id=>captures.has(id);
holder.releasePointerCapture=id=>{captures.delete(id);try{nativeRelease(id);}catch{}};
let rotation=0,zoom=1,denied=false;const undo=[],events=[];
const el={state:{designId:'proof',selected:'house',objects:structuredClone(original)},uxCanEdit:()=>!denied,normalize(){},record:old=>undo.push(old),point(e){const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(r.querySelector('.scene').getScreenCTM().inverse());return {x:p.x,y:p.y};},render(){for(const o of this.state.objects){const g=r.querySelector('[data-object="'+o.id+'"]');g.setAttribute('transform','translate('+o.x+' '+o.y+') rotate('+rotation+')');}document.querySelector('#interaction').textContent='Ausgewählt: '+this.state.selected+' · Text x='+this.state.objects[0].x.toFixed(2)+' · Haus x='+this.state.objects[1].x.toFixed(2);},sync(){this.render();}};
const selected=()=>el.state.objects.find(o=>o.id===el.state.selected),showTab=()=>{},scaleObject=(o,f)=>({...o,w:o.w*f,h:o.h*f}),selectionScaleFactor=()=>1;
function install(){${gestures}}
install();
function reset({turn=0,scale=1,locked=false,deny=false}={}){rotation=turn;zoom=scale;denied=deny;el.state={designId:'proof',selected:'house',objects:structuredClone(original)};el.state.objects[1].uxLocked=locked;holder.innerHTML=markup;holder.style.transform='scale('+zoom+')';holder.style.transformOrigin='50% 50%';el.sync();}
function point(node,x,y){return new DOMPoint(x,y).matrixTransform(node.getScreenCTM());}
function dragAt(p,id=71){const target=r.elementFromPoint(p.x,p.y);const raw={tag:target.localName,object:target.closest('[data-object]')?.dataset.object,fill:target.getAttribute('fill')};for(const [type,dx,dy] of [['pointerdown',0,0],['pointermove',12,5],['pointerup',12,5]])(type==='pointerdown'?target:r).dispatchEvent(new PointerEvent(type,{bubbles:true,composed:true,pointerId:id,pointerType:'touch',button:0,buttons:type==='pointerup'?0:1,clientX:p.x+dx,clientY:p.y+dy}));return raw;}
async function run(){const checks=[];function check(name,pointFn,expected,options={}){reset(options);const p=pointFn(),before=structuredClone(el.state),raw=dragAt(p),actual=el.state.selected;const moved=el.state.objects.find(o=>o.id===expected);checks.push({name,pass:actual===expected&&moved.x!==before.objects.find(o=>o.id===expected).x&&el.state.objects.filter(o=>o.id!==expected).every(o=>o.x===before.objects.find(x=>x.id===o.id).x)&&el.state.objects.every(o=>o.w===before.objects.find(x=>x.id===o.id).w&&o.h===before.objects.find(x=>x.id===o.id).h),expected,actual,raw,x:p.x,y:p.y});}
const roof=()=>point(r.querySelector('[data-object="house"] path'),50,10),margin=()=>point(r.querySelector('[data-object="house"] svg'),3,40),glyph=()=>point(r.querySelector('[data-object="text"] path'),75,350);
check('Dach unter leerem Textrahmen',roof,'house');
check('Sichtbare Textkontur',glyph,'text');
check('Transparenter Motivrand',margin,'text');
check('Gesperrtes Motiv',roof,'text',{locked:true});
check('Fehlende Verschiebefreigabe',roof,'text',{deny:true});
check('Drehung 25 Grad / Zoom 125 Prozent',roof,'house',{turn:25,scale:1.25});
check('Gedrehte sichtbare Textkontur',glyph,'text',{turn:25,scale:1.25});
check('Gedrehter transparenter Motivrand',margin,'text',{turn:25,scale:1.25});
reset();el.state.selected=null;const p=roof(),raw=dragAt(p,72);checks.push({name:'Erneute Auswahl nach Abwählen',pass:el.state.selected==='house',actual:el.state.selected,raw,x:p.x,y:p.y});
reset();const result={schema:'gravuru-overlap-browser-proof/v1',userAgent:navigator.userAgent,viewport:{width:innerWidth,height:innerHeight},checks,passed:checks.every(c=>c.pass),renderedOrder:[...r.querySelectorAll('[data-object]')].map(n=>n.dataset.object),probeCoordinates:{roof:roof().toJSON(),glyph:glyph().toJSON()}};
document.querySelector('#result').textContent=(result.passed?'BESTANDEN':'FEHLER')+': '+checks.filter(c=>c.pass).length+'/'+checks.length;document.querySelector('#details').textContent=JSON.stringify(result,null,2);await fetch('/report',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(result)});}
document.querySelector('#run').onclick=run;document.querySelector('#reset').onclick=()=>reset();r.addEventListener('pointerup',()=>{document.querySelector('#interaction').textContent+=' · Eingabe beendet';});await run();
</script>`;
const port=Number(process.argv[2]||8233);
http.createServer(async(req,res)=>{
  if(req.method==='GET'&&req.url==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(page);return;}
  if(req.method==='POST'&&req.url==='/report'){const chunks=[];let length=0;for await(const c of req){length+=c.length;if(length>100000){res.writeHead(413).end();return;}chunks.push(c);}report=JSON.parse(Buffer.concat(chunks).toString());res.writeHead(204).end();return;}
  if(req.method==='GET'&&req.url==='/report'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(report,null,2));return;}
  res.writeHead(404).end();
}).listen(port,'127.0.0.1',()=>console.log('Synthetic browser proof: http://127.0.0.1:'+port));
