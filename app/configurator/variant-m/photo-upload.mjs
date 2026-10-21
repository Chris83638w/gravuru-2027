// Foto-Upload über die Platte (Fehler 20.10.2026: Tipp auf Fotohinweis öffnete keine Dateiauswahl).
// Ursache: Der feste Fotorahmen („photo-frame“, Kontur ohne Füllung) liegt in der Zeichenreihenfolge
// über dem Fotobereich und fängt mit seiner unsichtbaren Trefferfläche jeden Tipp ab. Durchlässig war er
// nur über acrylic-scene.css, das erst am Ende der Oberflächeninstallation nachgeladen wird; bis dahin
// (bei 150 ms Latenz mehrere Sekunden, die Platte ist da schon sichtbar) lief der Tipp ins Leere.
// Jetzt: Der Treffer wird über die Ebenen unter dem Finger bestimmt (reine Rahmen sind durchlässig),
// und bis die Oberfläche bereit ist, öffnet ein früher Handler die Dateiauswahl und übergibt die Datei.
import {canEditElement} from './element-rights.mjs';

// Ohne HEIC: iOS Safari wandelt Fotos aus der Mediathek dann selbst in JPEG um (kein `capture`, Galerie bleibt wählbar).
export const PHOTO_ACCEPT='image/jpeg,image/png,image/webp';
const TAP_SLOP=6;

// Reine Rahmen/Konturen über einem Fotobereich nehmen keinen Fototipp an.
export function photoTapPassThrough(object){
  return !!object&&object.type==='graphic'&&(object.filled===false||object.acrylicFixed===true);
}
export const replaceablePhotoSlot=(slot,canReplace=()=>true)=>slot?.type==='photoSlot'&&!slot.uxUploadId&&!slot.uxHidden&&!slot.uxLocked&&canReplace(slot)!==false;

// Leerer, austauschbarer Fotobereich unter dem Tipp: direkt getroffen oder unter durchlässigen Rahmen.
// `root` ist der shadowRoot (elementsFromPoint), `point` die Client-Koordinaten des Tipps.
export function emptyPhotoSlotAt(root,objects,target,point,{canReplace}={}){
  const byId=id=>objects.find(o=>o.id===id);
  if(target?.closest?.('[data-resize]'))return null;
  // Chris 21.10.2026: Fotos hochladen nur auf der Tafel – nicht über Design-Miniaturen, Designvorschau oder Dialoge.
  if(target?.closest?.('[data-c-design],.c-gallery,dialog,.ux-design-reveal'))return null;
  const direct=target?.closest?.('[data-ux-empty-photo-slot]');
  if(direct){const slot=byId(direct.dataset.object);return replaceablePhotoSlot(slot,canReplace)?{slot,through:false}:null;}
  if(!point||typeof root?.elementsFromPoint!=='function')return null;
  for(const node of root.elementsFromPoint(point.x,point.y)){
    if(node.closest?.('[data-resize]'))return null;
    const group=node.closest?.('[data-object]');
    if(!group)return null;
    const object=byId(group.dataset.object);
    if(object?.type==='photoSlot')return replaceablePhotoSlot(object,canReplace)?{slot:object,through:true}:null;
    if(!photoTapPassThrough(object))return null;
  }
  return null;
}

// Tippen (kein Ziehen): Zeiger hat sich höchstens TAP_SLOP Pixel bewegt.
export function tapTracker(){
  let start=null;
  return {
    down(event,hit){start=hit?{id:hit.slot.id,pointerId:event.pointerId,x:event.clientX,y:event.clientY}:null;return start;},
    up(event){const s=start;start=null;if(!s||s.pointerId!==event.pointerId||Math.hypot(event.clientX-s.x,event.clientY-s.y)>TAP_SLOP)return null;return s.id;},
    cancel(){start=null;}
  };
}

// HEIC/HEIF (iPhone): Typ fehlt oft, dann zählt die Endung.
export function isHeicFile(file){
  const type=String(file?.type||'').toLowerCase(),name=String(file?.name||'').toLowerCase();
  return /^image\/hei[cf](-sequence)?$/.test(type)||(!type||type==='application/octet-stream')&&/\.hei[cf]$/.test(name);
}
export const HEIC_MESSAGE='Dieses Foto ist im HEIC-Format (iPhone) und kann hier nicht gelesen werden. Bitte als JPG wählen – z. B. am iPhone unter Einstellungen › Kamera › Formate „Maximale Kompatibilität“ oder das Foto als JPEG teilen.';
// Größte Fläche, die iOS-Canvas sicher zeichnet (16,7 MP).
export const CANVAS_MAX_PIXELS=16_000_000;
export function canvasSize(width,height,max=CANVAS_MAX_PIXELS){
  const scale=Math.min(1,Math.sqrt(max/(width*height)));
  return {width:Math.max(1,Math.floor(width*scale)),height:Math.max(1,Math.floor(height*scale))};
}

// Browser, die HEIC selbst lesen (Safari), wandeln es hier in JPEG; sonst klare Meldung. Andere Dateien unverändert.
export async function normalizePhotoFile(file,{decode=defaultDecode}={}){
  if(!isHeicFile(file))return file;
  let jpeg;
  try{jpeg=await decode(file);}catch{jpeg=null;}
  if(!jpeg)throw Error(HEIC_MESSAGE);
  const name=String(file.name||'Foto').replace(/\.hei[cf]$/i,'')+'.jpg';
  return new File([jpeg],name,{type:'image/jpeg',lastModified:file.lastModified});
}
async function defaultDecode(file){
  const url=URL.createObjectURL(file);
  try{
    const image=new Image();image.src=url;await image.decode();
    if(!(image.naturalWidth>0))return null;
    const size=canvasSize(image.naturalWidth,image.naturalHeight),canvas=document.createElement('canvas');
    Object.assign(canvas,size);canvas.getContext('2d').drawImage(image,0,0,size.width,size.height);
    return await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.92));
  }finally{URL.revokeObjectURL(url);}
}

// Früher Fototipp: zwischen dem ersten Zeichnen der Platte und der fertigen Oberfläche (installUX).
// Danach (el.uxPhotoTapReady) ist er still; ux.mjs übernimmt eine hier gewählte Datei (el.uxEarlyPhoto).
export function installEarlyPhotoTap(el,config){
  const r=el?.shadowRoot;
  if(!r||el.uxEarlyPhotoTap||config?.photo?.enabled===false)return;
  el.uxEarlyPhotoTap=true;
  const input=document.createElement('input');input.type='file';input.accept=PHOTO_ACCEPT;input.hidden=true;input.dataset.uxEarlyFile='';r.append(input);
  const tap=tapTracker();let slotId=null;
  const active=()=>!el.uxPhotoTapReady;
  const find=event=>emptyPhotoSlotAt(r,el.state?.objects||[],event.target,{x:event.clientX,y:event.clientY},{canReplace:o=>canEditElement(config,el.state.designId,o,'replace')});
  const open=(event,id)=>{event.preventDefault();event.stopImmediatePropagation();slotId=id;input.click();};
  r.addEventListener('pointerdown',event=>{
    if(!active()||event.button!==0)return tap.cancel();
    const hit=find(event);tap.down(event,hit);
    // Durch den Rahmen getroffen: der Rahmen wird nicht gezogen oder gewählt.
    if(hit?.through){event.preventDefault();event.stopImmediatePropagation();}
  },true);
  r.addEventListener('pointerup',event=>{if(!active())return tap.cancel();const id=tap.up(event);if(id)open(event,id);},true);
  r.addEventListener('pointercancel',()=>tap.cancel(),true);
  r.addEventListener('keydown',event=>{if(!active()||!['Enter',' '].includes(event.key))return;const hit=find(event);if(hit&&!hit.through)open(event,hit.slot.id);},true);
  input.addEventListener('change',()=>{
    const files=[...input.files];input.value='';if(!files.length)return;
    el.uxEarlyPhoto={files,slotId};el.dispatchEvent(new CustomEvent('gravuru-early-photo'));
  });
}
