import {photoColorMode} from '../../platform/sources/app/shared/models/photo-color.mjs';
import {fittedSize,editedPhotoSize,retainedPhotoUrls} from './image-processing.mjs';

export function createPhotoEditor({el,r,config,dialog,button,files,selected,mutate,say}){
  const d=dialog('photo-edit','Foto / Logo bearbeiten',`
    <p>Ziehe das Foto im Zuschnittfenster und vergrößere es mit Zoom. Nur der sichtbare Ausschnitt wird übernommen. Das Original bleibt erhalten.</p>
    <canvas class="ux-photo-canvas" aria-label="Bild bearbeiten: Ausschnitt verschieben"></canvas>
    <div class="ux-photo-controls">
      <label>Zuschnittformat <select data-photo-shape><option value="original">Originalformat</option><option value="square">Quadratisch</option><option value="portrait">Hochformat 3:4</option><option value="landscape">Querformat 4:3</option><option value="circle">Rund</option></select></label>
      <label>Zoom <input type="range" data-photo-zoom min="1" max="4" step=".05" value="1"></label>
      <label>Horizontal <input type="range" data-photo-x min="-1" max="1" step=".02" value="0"></label>
      <label>Vertikal <input type="range" data-photo-y min="-1" max="1" step=".02" value="0"></label>
      <label>Farbe <select data-photo-color><option value="original">Originalfarbe</option><option value="grayscale">Graustufen</option><option value="sepia">Sepia</option></select></label>
    </div><p data-photo-fixed class="ux-small" hidden>Zuschnitt im festen Fotorahmen: Foto ziehen oder zoomen. Das Design bleibt unverändert.</p><div class="ux-actions">${button('photo-turn','↻ 90° drehen')}${button('photo-flip','Spiegeln')}</div>
    <div class="ux-actions">${button('photo-undo','Bearbeitung rückgängig')}${button('photo-reset','Original wiederherstellen')}</div>
    <p data-photo-status role="status"></p>${button('photo-apply','Bild übernehmen','class="ux-primary"')}`);
  const $=s=>d.querySelector(s),canvas=$('canvas'),working=document.createElement('canvas'),wc=working.getContext('2d',{willReadFrequently:true}),original=document.createElement('canvas');
  let baseline=document.createElement('canvas');
  const apply=$('[data-ux=photo-apply]');apply.textContent='Übernehmen';apply.classList.add('ux-photo-quick-apply');$('header h2').textContent='Bild bearbeiten';$('header').insertBefore(apply,$('header [data-ux=close]'));
  const workspace=document.createElement('div');workspace.className='ux-photo-workspace';canvas.before(workspace);workspace.append(canvas);
  const controls=document.createElement('div');controls.className='ux-photo-sidebar';controls.innerHTML='<h3>Zuschneiden</h3>';workspace.append(controls);
  const cropControls=document.createElement('div');cropControls.className='ux-photo-crop-tools';
  cropControls.append($('.ux-photo-controls'),$('[data-photo-fixed]'),$('[data-ux=photo-turn]').parentElement);controls.append(cropControls);
  let lastOptions,objectId,source,fullSource,originalSource,inputColor='original',angle=0,flip=1,drag=null,history=[],fixedAspect=null;
  const options=()=>({zoom:Number($('[data-photo-zoom]').value),x:Number($('[data-photo-x]').value),y:Number($('[data-photo-y]').value),shape:$('[data-photo-shape]').value,color:$('[data-photo-color]').value});
  function snapshot(settings=options()){history.push({pixels:wc.getImageData(0,0,working.width,working.height),baseline,fullSource,angle,flip,editSourceUrl:source.editSourceUrl,inputColor,options:settings});if(history.length>8)history.shift();}
  function restoreOptions(v){for(const [key,value]of Object.entries(v))$('[data-photo-'+key+']').value=value;}
  function paint(target,image,v,turn,reflection){
    const c=target.getContext('2d'),iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height,rotated=Math.abs(turn%180)===90,sw=rotated?ih:iw,sh=rotated?iw:ih;
    c.clearRect(0,0,target.width,target.height);c.save();
    if(!fixedAspect&&v.shape==='circle'){c.beginPath();c.ellipse(target.width/2,target.height/2,target.width/2,target.height/2,0,0,Math.PI*2);c.clip();}
    const scale=Math.max(target.width/sw,target.height/sh)*v.zoom,dx=Math.max(0,(sw*scale-target.width)/2),dy=Math.max(0,(sh*scale-target.height)/2);
    c.translate(target.width/2+v.x*dx,target.height/2+v.y*dy);c.rotate(turn*Math.PI/180);c.scale(scale*reflection,scale);c.translate(-iw/2,-ih/2);c.filter=v.color===inputColor?'none':v.color==='grayscale'?'grayscale(1)':v.color==='sepia'?'sepia(1)':'none';c.drawImage(image,0,0);c.restore();
  }
  function productionImage(){
    const v=options(),rotated=Math.abs(angle%180)===90,iw=fullSource.naturalWidth,ih=fullSource.naturalHeight;
    const aspect=fixedAspect||({square:1,circle:1,portrait:3/4,landscape:4/3})[v.shape]||(rotated?ih/iw:iw/ih);
    const size=editedPhotoSize(iw,ih,{aspect,zoom:v.zoom,angle}),output=document.createElement('canvas');output.width=size.width;output.height=size.height;paint(output,fullSource,v,angle,flip);
    return {canvas:output,limited:size.limited};
  }
  function draw(){
    const v=options(),rotated=Math.abs(angle%180)===90,sw=rotated?working.height:working.width,sh=rotated?working.width:working.height;
    const aspect=fixedAspect||({square:1,circle:1,portrait:3/4,landscape:4/3})[v.shape]||sw/sh;
    canvas.width=Math.round(aspect>=1?1200:1200*aspect);canvas.height=Math.round(aspect>=1?1200/aspect:1200);
    paint(canvas,working,v,angle,flip);
    lastOptions=v;canvas.style.aspectRatio=String(aspect);$('[data-ux=photo-undo]').disabled=!history.length;
  }
  canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();snapshot();drag={id:e.pointerId,x:e.clientX,y:e.clientY,options:options()};canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;e.preventDefault();const b=canvas.getBoundingClientRect();$('[data-photo-x]').value=Math.max(-1,Math.min(1,drag.options.x+(e.clientX-drag.x)/b.width*2));$('[data-photo-y]').value=Math.max(-1,Math.min(1,drag.options.y+(e.clientY-drag.y)/b.height*2));draw();});
  const end=e=>{if(drag?.id!==e.pointerId)return;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);drag=null;};canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
  d.addEventListener('input',e=>{if(e.target.matches('[data-photo-zoom],[data-photo-x],[data-photo-y],[data-photo-shape],[data-photo-color]')){snapshot(lastOptions);draw();}});
  d.addEventListener('click',async e=>{const key=e.target.closest('[data-ux]')?.dataset.ux;if(!key?.startsWith('photo-'))return;
    if(key==='photo-turn'){snapshot();angle=(angle+90)%360;draw();}
    if(key==='photo-flip'){snapshot();flip*=-1;draw();}
    if(key==='photo-reset'){snapshot();fullSource=originalSource;inputColor='original';source={...source,editSourceUrl:source.originalUrl||source.url};working.width=original.width;working.height=original.height;wc.drawImage(original,0,0);baseline=document.createElement('canvas');baseline.width=original.width;baseline.height=original.height;baseline.getContext('2d').drawImage(original,0,0);angle=0;flip=1;restoreOptions({zoom:1,x:0,y:0,shape:'original',color:'original'});draw();}
    if(key==='photo-undo'){const old=history.pop();if(old){working.width=old.pixels.width;working.height=old.pixels.height;wc.putImageData(old.pixels,0,0);baseline=old.baseline;fullSource=old.fullSource;inputColor=old.inputColor;source={...source,editSourceUrl:old.editSourceUrl};angle=old.angle;flip=old.flip;restoreOptions(old.options);draw();}}
    if(key==='photo-apply'){
      const o=selected();if(!o||o.id!==objectId||o.uxLocked||el.uxCanEdit?.(o,'replace')===false){$('[data-photo-status]').textContent='Bitte ein zum Bearbeiten freigegebenes Bild auswählen.';return;}
      const b=e.target.closest('button');b.disabled=true;
      try{const output=productionImage();const blob=await new Promise((resolve,reject)=>output.canvas.toBlob(v=>v?resolve(v):reject(Error('Bild konnte nicht erstellt werden.')),'image/png'));
        if(blob.size>15*1024*1024)throw Error('Die bearbeitete Bilddatei überschreitet 15 MB. Bitte einen kleineren Ausschnitt wählen; das Original bleibt erhalten.');
        const id=crypto.randomUUID(),url=URL.createObjectURL(blob);files.set(id,{file:source.file,url,originalUrl:source.originalUrl||source.url,blob,edited:true,editSourceUrl:source.editSourceUrl||source.url,editSourceColor:inputColor,photoEdit:{angle,flip,...options()},width:output.canvas.width,height:output.canvas.height});
        mutate(()=>{o.uxUploadId=id;if(o.uxUploadKind==='photo')o.uxPhotoColor=options().color;delete o.uxPhotoCrop;if(!o.acrylicFixed&&o.photoShape!=='template'){o.h=o.w*canvas.height/canvas.width;if(o.type==='photoSlot')o.photoShape=options().shape==='circle'?'circle':'rect';}});d.close();say('Bild mit '+output.canvas.width+' × '+output.canvas.height+' Pixeln übernommen.'+(output.limited?' Sehr große Bildausgabe auf höchstens 20 Megapixel / 8192 Pixel Kantenlänge begrenzt.':'')+' Das Original bleibt erhalten; Rückgängig stellt die vorige Version wieder her.');
      }catch(error){$('[data-photo-status]').textContent=error.message;}finally{b.disabled=false;}
    }
  });
  return async function open(o){
    if(!o||o.uxLocked)return say('Bitte das Bild zuerst entsperren.');if(el.uxCanEdit?.(o,'replace')===false)return say('Dieses Bild ist fest vorgegeben.');source=files.get(o.uxUploadId);if(!source)return say('Bitte die Datei erneut auswählen.');
    try{inputColor=source.editSourceColor||(source.edited&&!source.photoEdit&&o.uxUploadKind==='photo'&&['original','grayscale','sepia'].includes(o.uxPhotoColor)?o.uxPhotoColor:'original');const urls=retainedPhotoUrls(source);source={...source,...urls};files.set(o.uxUploadId,source);objectId=o.id;fixedAspect=o.acrylicFixed?o.w/o.h:null;$('[data-photo-fixed]').hidden=!fixedAspect;$('[data-photo-shape]').closest('label').hidden=!!fixedAspect;$('[data-photo-shape]').disabled=!!fixedAspect;const image=new Image();image.src=source.editSourceUrl||source.url;await image.decode();fullSource=image;const size=fittedSize(image.naturalWidth,image.naturalHeight);working.width=size.width;working.height=size.height;wc.drawImage(image,0,0,size.width,size.height);
      baseline=document.createElement('canvas');baseline.width=size.width;baseline.height=size.height;baseline.getContext('2d').drawImage(working,0,0);
      const origImage=new Image();origImage.src=source.originalUrl||source.url;await origImage.decode();originalSource=origImage;const origSize=fittedSize(origImage.naturalWidth,origImage.naturalHeight);original.width=origSize.width;original.height=origSize.height;original.getContext('2d').drawImage(origImage,0,0,origSize.width,origSize.height);
      angle=source.photoEdit?.angle||0;flip=source.photoEdit?.flip||1;history=[];const saved=source.photoEdit||{};restoreOptions({zoom:saved.zoom||1,x:saved.x||0,y:saved.y||0,shape:saved.shape||(o.photoShape==='circle'?'circle':'original'),color:saved.color||(o.uxUploadKind==='photo'?photoColorMode(config?.profile,o):'original')});$('[data-photo-status]').textContent='';draw();d.showModal();
    }catch(error){say('Bild konnte nicht geöffnet werden: '+error.message);}
  };
}
