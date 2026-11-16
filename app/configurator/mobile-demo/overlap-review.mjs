import {createOverlapConsentController} from './overlap-consent.mjs';
import {planContourPlacement} from './contour-placement.mjs';

const pairKey=(a,b)=>JSON.stringify([a,b].sort());
export function masksTouch(a,b){
 if(!(a instanceof Uint8Array)||!(b instanceof Uint8Array)||!a.length||a.length!==b.length)return true;
 for(let i=0;i<a.length;i++)if(a[i]&&b[i])return true;
 return false;
}
// Selection/focus/zoom are presentation state, not a new design. Rendered paths
// bind consent to the actual font, motif, upload and crop, including lazy data.
export function layoutFingerprint(state,rendered,profile){
 const stableSVG=svg=>{
  const ids=new Map([...svg.matchAll(/\bid="([^"]+)"/g)].map((match,index)=>[match[1],'contour-'+index]));
  return svg.replace(/\bid="([^"]+)"/g,(_,id)=>'id="'+ids.get(id)+'"')
   .replace(/url\(#([^)]*)\)/g,(_,id)=>'url(#'+(ids.get(id)||id)+')')
   .replace(/(\b(?:xlink:)?href=")#([^"]+)"/g,(_,prefix,id)=>prefix+'#'+(ids.get(id)||id)+'"');
 };
 return JSON.stringify([state.designId,state.width,state.height,state.fkFrame,state.mOptions,
  state.objects,profile?.id,profile?.revision,profile?.geometry,rendered.map(([id,svg])=>[id,stableSVG(svg)])]);
}
export function refineOverlapIssues(issues,masks){
 const byId=new Map(masks.map(m=>[m.id,m.data]));
 return issues.filter(issue=>issue.code!=='overlap'||issue.ids.length!==2||
  !byId.has(issue.ids[0])||!byId.has(issue.ids[1])||masksTouch(byId.get(issue.ids[0]),byId.get(issue.ids[1])));
}
export async function rasterizeContours({rendered,width,height,pixelWidth,pixelHeight,doc=document,inkMask=window.GravuruEditorRefinement?.inkMask}){
 if(typeof inkMask!=='function')throw Error('Konturprüfung ist noch nicht bereit.');
 const canvas=doc.createElement('canvas');canvas.width=pixelWidth;canvas.height=pixelHeight;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw Error('Konturprüfung fehlt.');
 const masks=[];
 for(const [id,svg]of rendered){
  const url=URL.createObjectURL(new Blob([`<svg xmlns="http://www.w3.org/2000/svg" width="${pixelWidth}" height="${pixelHeight}" viewBox="0 0 ${width} ${height}">${svg}</svg>`],{type:'image/svg+xml'}));
  try{const image=new Image();image.src=url;await image.decode();ctx.clearRect(0,0,pixelWidth,pixelHeight);ctx.drawImage(image,0,0);
   const data=inkMask(ctx.getImageData(0,0,pixelWidth,pixelHeight).data);
   if(!data?.some(v=>v))throw Error('Eine sichtbare Kontur konnte nicht geprüft werden.');
   masks.push({id,data});
  }finally{URL.revokeObjectURL(url);}
 }
 return masks;
}

export function installDemoOverlapReview(el,{rasterize=rasterizeContours,plan=planContourPlacement}={}){
 const r=el.shadowRoot,dialog=r?.querySelector('.ux-layout-check-dialog');
 if(!dialog)return null;
 const oldResolve=el.uxResolveLayoutReview,oldFit=el.uxFitLayoutReview;
 let context=null,cache=null,disposed=false,busy=false,operation=0;
 const current=()=>{
  const state=el.state,objects=structuredClone(state.objects.filter(o=>!o.uxHidden&&!o.uxDecoration&&o.role!=='guide'&&!(o.type==='text'&&!o.text?.trim())));
  const rendered=objects.map(o=>[o.id,el.uxCollisionSVG(o)]).filter(([,svg])=>svg);
  return {objects,rendered,width:state.width,height:state.height,
   fingerprint:layoutFingerprint(state,rendered,el.uxSelectedProfile?.())};
 };
 const completeMasks=(masks,snapshot)=>Array.isArray(masks)&&masks.length===snapshot.rendered.length&&
  new Set(masks.map(m=>m.id)).size===masks.length&&snapshot.rendered.every(([id])=>masks.some(m=>m.id===id&&m.data instanceof Uint8Array&&m.data.length===snapshot.pixelWidth*snapshot.pixelHeight&&m.data.some(v=>v)));
 async function inspect(){
  const before=current().fingerprint,nativeIssues=await context.inspect(),snapshot=current();
  if(before!==snapshot.fingerprint)throw Error('Gestaltung wurde während der Prüfung geändert.');
  if(disposed)throw Error('Prüfung geschlossen.');
  if(cache?.fingerprint!==snapshot.fingerprint){
   const scale=Math.min(12,1400/Math.max(snapshot.width,snapshot.height));
   const pixelWidth=Math.ceil(snapshot.width*scale),pixelHeight=Math.ceil(snapshot.height*scale);
   let masks=null;
   // Failed decoding never turns an overlap into an unverified free pass.
   try{masks=await rasterize({...snapshot,pixelWidth,pixelHeight});if(!completeMasks(masks,{...snapshot,pixelWidth,pixelHeight}))masks=null;}catch{}
   if(disposed||current().fingerprint!==snapshot.fingerprint)throw Error('Gestaltung wurde geändert.');
   cache={...snapshot,masks,pixelWidth,pixelHeight,scaleX:pixelWidth/snapshot.width,scaleY:pixelHeight/snapshot.height};
  }
  return {...cache,issues:cache.masks?refineOverlapIssues(nativeIssues,cache.masks):nativeIssues};
 }
 const consent=createOverlapConsentController({dialog,inspect,onFailure:message=>context?.say(message)});
 async function resolve(next){
  context=next;
  try{return await consent.resolve(await inspect());}
  catch{context.say('Die Gestaltung konnte noch nicht geprüft werden. Bitte erneut versuchen.');return false;}
 }
 const cancelled=()=>{operation++;};
 const closeClick=event=>{if(event.target?.closest?.('[data-ux=close]'))cancelled();};
 dialog.addEventListener('close',cancelled);dialog.addEventListener('cancel',cancelled);
 dialog.addEventListener('click',closeClick,true);
 async function fit(next){
  if(busy||disposed)return;
  context=next;busy=true;const token=++operation,button=dialog.querySelector('[data-ux=layout-fit]');
  const accept=dialog.querySelector('[data-demo-overlap-accept]');
  if(button){button.disabled=true;button.setAttribute('aria-busy','true');}
  if(accept)accept.disabled=true;
  try{
   const snapshot=await inspect();
   if(disposed||token!==operation||!dialog.open)return;
   if(snapshot.issues.some(i=>i.code!=='overlap')){context.fitOriginal();return;}
   if(!snapshot.issues.length){dialog.close();return;}
   if(!snapshot.masks||snapshot.objects.some(o=>context.boundaryIssue(o)))throw Error('Kontur oder Rand ist noch nicht sicher geprüft.');
   const visibleIds=new Set(snapshot.masks.map(m=>m.id)),objects=snapshot.objects.filter(o=>visibleIds.has(o.id));
   const activePairs=new Set(snapshot.issues.map(i=>pairKey(...i.ids)));
   const ignorePair=(a,b)=>!activePairs.has(pairKey(a.id,b.id))&&masksTouch(snapshot.masks.find(m=>m.id===a.id)?.data,snapshot.masks.find(m=>m.id===b.id)?.data);
   // Only reported objects may move. Existing intentional template/photo pairs
   // stay intact; they must not silently become new editing restrictions.
   const movableIds=[...new Set(snapshot.issues.flatMap(i=>i.ids))].sort((a,b)=>(objects.find(o=>a===o.id)?.type==='text'?0:1)-(objects.find(o=>b===o.id)?.type==='text'?0:1));
   context.say('Überlagerung wird entlang der sichtbaren Konturen angepasst …');
   const clearancePixels=Math.ceil(0.5*Math.max(snapshot.scaleX,snapshot.scaleY));
   const result=await plan({objects,masks:snapshot.masks,width:snapshot.pixelWidth,height:snapshot.pixelHeight,clearancePixels,
    scaleX:snapshot.scaleX,scaleY:snapshot.scaleY,movableIds,canMove:context.canMove,
    accepts:o=>!context.boundaryIssue(o),ignorePair,
    yieldControl:()=>new Promise(resolve=>setTimeout(resolve,0))});
   if(disposed||token!==operation||!dialog.open)return;
   if(current().fingerprint!==snapshot.fingerprint)throw Error('Gestaltung wurde während der Prüfung geändert.');
   if(!result.ok)throw Error('Kein passender Platz gefunden.');
   // Verify with the native SVG renderer again before the single undoable edit.
   const copies=objects.map(o=>{const move=result.moves.find(m=>m.id===o.id);return move?{...o,x:move.x,y:move.y}:o;});
   const masks=await rasterize({...snapshot,rendered:copies.map(o=>[o.id,el.uxCollisionSVG(o)])});
   if(!completeMasks(masks,snapshot))throw Error('Konturprüfung ist unvollständig.');
   const byId=new Map(masks.map(m=>[m.id,m.data]));
   for(let i=0;i<copies.length;i++)for(let j=i+1;j<copies.length;j++){
    const a=copies[i],b=copies[j];if((a.surfaceId||'front')!==(b.surfaceId||'front')||ignorePair(a,b))continue;
    if(masksTouch(byId.get(a.id),byId.get(b.id)))throw Error('Konturen liegen noch übereinander.');
   }
   const spacing=await plan({objects:copies,masks,width:snapshot.pixelWidth,height:snapshot.pixelHeight,clearancePixels,
    scaleX:snapshot.scaleX,scaleY:snapshot.scaleY,movableIds,canMove:()=>false,
    accepts:o=>!context.boundaryIssue(o),ignorePair,yieldControl:()=>new Promise(resolve=>setTimeout(resolve,0))});
   if(!spacing.ok)throw Error('Der kleine Abstand konnte noch nicht sicher eingehalten werden.');
   if(disposed||token!==operation||!dialog.open)return;
   if(current().fingerprint!==snapshot.fingerprint||copies.some(o=>context.boundaryIssue(o)))throw Error('Gestaltung wurde geändert.');
   context.mutate(()=>{for(const move of result.moves){const object=el.state.objects.find(o=>o.id===move.id);object.x=move.x;object.y=move.y;}});
   cache=null;dialog.close();context.say('Überlagerung angepasst. Größe und Inhalt bleiben erhalten. Bitte noch einmal prüfen.');
  }catch{if(!disposed&&token===operation){const message='Ohne Verkleinern passt es noch nicht sicher. Bitte verschieben oder die Gestaltung bewusst so übernehmen.';context.say(message);
   let feedback=dialog.querySelector('[data-demo-fit-feedback]');if(!feedback){feedback=dialog.ownerDocument.createElement('p');feedback.dataset.demoFitFeedback='';feedback.setAttribute('role','status');dialog.querySelector('[data-layout-problems]').append(feedback);}feedback.textContent=message;
  }}
  finally{busy=false;if(button){button.disabled=false;button.removeAttribute('aria-busy');}if(accept&&!accept.hidden&&dialog.open)accept.disabled=false;}
 }
 el.uxResolveLayoutReview=resolve;el.uxFitLayoutReview=fit;
 return {dispose(){if(disposed)return;disposed=true;operation++;consent.dispose();cache=null;
  dialog.removeEventListener('close',cancelled);dialog.removeEventListener('cancel',cancelled);
  dialog.removeEventListener('click',closeClick,true);
  if(el.uxResolveLayoutReview===resolve)oldResolve?el.uxResolveLayoutReview=oldResolve:delete el.uxResolveLayoutReview;
  if(el.uxFitLayoutReview===fit)oldFit?el.uxFitLayoutReview=oldFit:delete el.uxFitLayoutReview;
 }};
}
