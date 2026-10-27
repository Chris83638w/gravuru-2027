// The editor and manufacturing resolve the same pinned layered selection.
// Device photographs and the blue stock guide are never cutting data.
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {isLayeredDoorbell,selectedDoorbellProfile} from '../configurator/variant-m/doorbell-selection.mjs';
import {contourPathBounds,contourPathCommands,flattenContourPath} from './contour-path.mjs';
import {digest} from './review-package.mjs';
export const DOORBELL_ARTWORK_SCHEMA='gravuru-doorbell-separations/v1';
const fail=message=>{throw Object.assign(Error(message),{status:422,code:'doorbell_artwork'});};
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const finite=(v,min=0)=>Number.isFinite(v)&&v>=min;
const rectangle=a=>`M${a.x} ${a.y}H${a.x+a.width}V${a.y+a.height}H${a.x}Z`;
const circle=(x,y,r)=>`M${x-r} ${y}a${r} ${r} 0 1 0 ${2*r} 0a${r} ${r} 0 1 0 ${-2*r} 0Z`;
const within=(b,a,t=.0001)=>b[0]>=a.x-t&&b[1]>=a.y-t&&b[0]+b[2]<=a.x+a.width+t&&b[1]+b[3]<=a.y+a.height+t;
// Some source PDF paths end exactly at their start without a Z operator. Only
// the derived clipping contour receives Z; the original machine path is kept.
export function closedDoorbellCut(d){
 if(typeof d!=='string')fail('Der Geräteausschnitt ist kein Pfad.');
 // PDF extraction may repeat the close operator. Repeated Z draws no new edge.
 if(/z\s*$/i.test(d))return d.replace(/(?:[Zz]\s*){2,}$/,'Z');
 const closed=d+' Z',commands=contourPathCommands(closed),start=commands[0]?.values,end=commands.at(-2)?.values.slice(-2);
 if(!start||!end||start[0]!==end[0]||start[1]!==end[1])fail('Ein Geräteausschnitt ist offen; eine zusätzliche Schnittkante darf nicht erfunden werden.');
 return closed;
}
// Reverse winding without flattening the authoritative Bezier/arc shape.
function holeWinding(d){
 d=closedDoorbellCut(d);
 const points=flattenContourPath(d),area=points.reduce((s,p,i)=>{const q=points[(i+1)%points.length];return s+p[0]*q[1]-q[0]*p[1];},0);if(area<0)return d;
 const commands=contourPathCommands(d),start=commands[0].values,segments=[];let previous=start;
 for(const {command,values} of commands.slice(1)){if(command==='Z')break;const end=values.slice(-2);segments.push({command,values,start:previous});previous=end;}
 const result=['M'+start.join(' ')];if(previous[0]!==start[0]||previous[1]!==start[1])result.push('L'+previous.join(' '));
 for(const {command:c,values:v,start:s} of segments.reverse()){const values=c==='C'?[...v.slice(2,4),...v.slice(0,2),...s]:c==='Q'?[...v.slice(0,2),...s]:c==='A'?[...v.slice(0,4),1-v[4],...s]:s;result.push(c+values.join(' '));}
 result.push('Z');return result.join('');
}
// Pure and testable against the complete catalogue. No inferred device geometry.
export function doorbellLayers(profile,{frame,mounting}={}){
 const g=profile?.geometry,m=profile?.manufacturing;
 if(profile?.kind!=='layered-doorbell'||!g||!finite(g.width,.1)||!finite(g.height,.1)||g.width>500||g.height>500)fail('Das maßhaltige Funkklingelformat fehlt.');
 if(m?.outerContour?.operation!=='reference-only'||m?.innerCuts?.operation!=='cut'||m.innerCuts.color!=='#ff0000'||m.bellImage!==false||m.positionGuide!==false||m.mountingHoles?.steel!=='four-corners-for-B04S'||m.mountingHoles?.acrylic!=='only-where-full-hole-inside-acrylic')fail('Die getrennten Fertigungsregeln der Funkklingel fehlen.');
 if(!Array.isArray(g.cutPaths)||!g.cutPaths.length)fail('Die ursprünglichen Geräteausschnitte fehlen.');
 const chosen=profile.frames?.find(f=>f.key===frame),mount=profile.mounting?.options?.find(v=>v.key===mounting),a=chosen?.acrylic;
 if(!a||!mount||!['x','y','width','height'].every(k=>finite(a[k],(k==='width'||k==='height')?0.1:0)))fail('Rahmen oder Befestigung gehört nicht zum Funkklingelprodukt.');
 const stock={x:0,y:0,width:g.width,height:g.height};
 if(!within([a.x,a.y,a.width,a.height],stock)||!finite(profile.materials?.steel?.thicknessMm,.01)||!finite(profile.materials?.acrylic?.thicknessMm,.01))fail('Die beiden Materialkonturen oder Materialstärken fehlen.');
 const device=g.cutPaths.map((d,index)=>{let bounds;try{const closed=closedDoorbellCut(d);bounds=contourPathBounds(closed);flattenContourPath(closed);}catch(e){fail('Geräteausschnitt '+(index+1)+': '+e.message);}if(!within(bounds,stock)||!within(bounds,a))fail('Ein Geräteausschnitt liegt außerhalb der gewählten Materialkontur.');return {role:'device-cut',d,boundsMm:bounds};});
 let corners=[];
 if(mounting==='B04S'){
  const points=profile.mounting.holes,diameter=profile.mounting.holeDiameterMm,originals=g.optionalCornerPaths;
  if(!Array.isArray(points)||points.length!==4||!finite(diameter,.01))fail('Die vier originalen Montagebohrungen fehlen.');
  if(originals!==undefined&&(!Array.isArray(originals)||originals.length!==4))fail('Die originalen Montagekonturen sind unvollständig.');
  corners=points.map(p=>{
   if(!finite(p.x)||!finite(p.y))fail('Ungültige Montageposition.');const expected=[p.x-diameter/2,p.y-diameter/2,diameter,diameter];
   // PDF corner order need not match the mounting array order.
   const d=originals?.find(path=>contourPathBounds(path).every((n,i)=>Math.abs(n-expected[i])<.01))??(originals?null:circle(p.x,p.y,diameter/2));
   if(!d)fail('Montagekontur und gesicherte Bohrposition stimmen nicht überein.');const bounds=contourPathBounds(d);if(!within(bounds,stock))fail('Montagebohrung liegt außerhalb des Edelstahlträgers.');return {role:'mounting-hole',d,boundsMm:bounds};
  });
 }
 const steelPaths=[...device,...corners],acrylicPaths=[{role:'outer',d:rectangle(a),boundsMm:[a.x,a.y,a.width,a.height]},...device,...corners.filter(c=>within(c.boundsMm,a))];
 const svg=paths=>`<svg xmlns="http://www.w3.org/2000/svg" width="${g.width}mm" height="${g.height}mm" viewBox="0 0 ${g.width} ${g.height}"><g fill="none" stroke="#ff0000" stroke-width="0.05">${paths.map(p=>`<path d="${esc(p.d)}"/>`).join('')}</g></svg>`;
 const layer=(material,thicknessMm,paths)=>({material,thicknessMm,widthMm:g.width,heightMm:g.height,paths,svg:svg(paths)});
 const steel=layer('steel',profile.materials.steel.thicknessMm,steelPaths),acrylic=layer('acrylic',profile.materials.acrylic.thicknessMm,acrylicPaths);
 const geometry={schema:'gravuru-contour/v1',widthMm:g.width,heightMm:g.height,holeCount:acrylicPaths.length-1,contours:acrylicPaths.map(p=>({role:p.role==='outer'?'outer':'hole',d:p.role==='outer'?p.d:holeWinding(p.d)}))};
 return {schema:DOORBELL_ARTWORK_SCHEMA,selection:{frame,mounting},stock:{...stock,outerOperation:'reference-only'},acrylicBoundsMm:{...a},steel,acrylic,geometry,geometrySha256:digest(JSON.stringify(geometry)),orientation:'front-registration; device cuts translated upright; no cutting mirror',productionReady:false};
}
export function doorbellSeparations(config,options){
 if(!isLayeredDoorbell(config))fail('Dieses Funkklingelmuster besitzt noch keine validierte getrennte Fertigungsausgabe.');
 const profile=selectedDoorbellProfile(config,options),layers=doorbellLayers(profile,options);
 return {...layers,modelKey:config.doorbell.modelKey??config.profile.modelKey??null,profileId:profile.id,profileRevision:profile.revision,selection:{...options},...(config.doorbell.source===undefined?{}:{source:structuredClone(config.doorbell.source)})};
}
// Cutting is always in front registration, independently of engraving-side mirroring.
export async function renderDoorbellCutPdfs(layers){const {importEnvironment}=await import('./design-assets.mjs');return new Promise((resolve,reject)=>{
 const child=spawn(process.env.GRAVURU_PYTHON||(process.platform==='win32'?'python':'python3'),[fileURLToPath(new URL('./doorbell-cut-worker.py',import.meta.url))],{windowsHide:true,env:importEnvironment(),stdio:['pipe','pipe','pipe']});let done=false,size=0;const chunks=[];
 const finish=(error,value)=>{if(done)return;done=true;clearTimeout(timer);error?reject(Object.assign(Error(error),{status:422,code:'doorbell_cut_pdf'})):resolve(value);};
 const timer=setTimeout(()=>{child.kill();finish('Die getrennte Schnittausgabe hat das Zeitlimit überschritten.');},30000);
 child.on('error',()=>finish('Python ist für die getrennte Schnittausgabe nicht verfügbar.'));child.stdin.on('error',()=>{});child.stderr.on('data',()=>{});
 child.stdout.on('data',b=>{size+=b.length;if(size>16*1024*1024){child.kill();finish('Die getrennte Schnittausgabe ist zu groß.');}else chunks.push(b);});
 child.on('close',code=>{if(done)return;try{const result=JSON.parse(Buffer.concat(chunks));if(code||result.error)return finish(result.error||'Die Schnittausgabe konnte nicht erstellt werden.');const pdfs=Object.fromEntries(['steel','acrylic'].map(k=>[k,Buffer.from(result[k],'base64')]));if(Object.values(pdfs).some(b=>!b.subarray(0,5).equals(Buffer.from('%PDF-'))))return finish('Ungültige Schnitt-PDF.');finish(null,pdfs);}catch{finish('Die Schnittausgabe konnte nicht gelesen werden.');}});
 child.stdin.end(JSON.stringify({widthMm:layers.stock.width,heightMm:layers.stock.height,steel:layers.steel.svg,acrylic:layers.acrylic.svg}));
});}
