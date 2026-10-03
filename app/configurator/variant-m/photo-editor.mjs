import {fittedSize} from './image-processing.mjs';

export function createPhotoEditor({el,r,dialog,button,files,selected,mutate,say}){
  const d=dialog('photo-edit','Foto / Logo bearbeiten',`
    <p>Verschiebe den Ausschnitt oder passe ihn mit den Reglern an. Das Original bleibt erhalten.</p>
    <canvas class="ux-photo-canvas" aria-label="Bild bearbeiten: Ausschnitt verschieben"></canvas>
    <div class="ux-photo-controls">
      <label>Ausschnitt <select data-photo-shape><option value="original">Originalformat</option><option value="square">Quadratisch</option><option value="portrait">Hochformat 3:4</option><option value="landscape">Querformat 4:3</option><option value="circle">Rund</option></select></label>
      <label>Zoom <input type="range" data-photo-zoom min="1" max="4" step=".05" value="1"></label>
      <label>Horizontal <input type="range" data-photo-x min="-1" max="1" step=".02" value="0"></label>
      <label>Vertikal <input type="range" data-photo-y min="-1" max="1" step=".02" value="0"></label>
    </div><div class="ux-actions">${button('photo-turn','↻ 90° drehen')}${button('photo-flip','Spiegeln')}</div>
    <div class="ux-actions">${button('photo-undo','Bearbeitung rückgängig')}${button('photo-reset','Original wiederherstellen')}</div>
    <p data-photo-status role="status"></p>${button('photo-apply','Bild übernehmen','class="ux-primary"')}`);
  const $=s=>d.querySelector(s),canvas=$('canvas'),ctx=canvas.getContext('2d'),working=document.createElement('canvas'),wc=working.getContext('2d',{willReadFrequently:true}),original=document.createElement('canvas');
  let baseline=document.createElement('canvas');
  const apply=$('[data-ux=photo-apply]');apply.textContent='Übernehmen';apply.classList.add('ux-photo-quick-apply');$('header h2').textContent='Bild bearbeiten';$('header').insertBefore(apply,$('header [data-ux=close]'));
  const workspace=document.createElement('div');workspace.className='ux-photo-workspace';canvas.before(workspace);workspace.append(canvas);
  const controls=document.createElement('div');controls.className='ux-photo-sidebar';controls.innerHTML='<h3>Zuschneiden</h3>';workspace.append(controls);
  const cropControls=document.createElement('div');cropControls.className='ux-photo-crop-tools';
  cropControls.append($('.ux-photo-controls'),$('[data-ux=photo-turn]').parentElement);controls.append(cropControls);
  let objectId,source,angle=0,flip=1,transform,drag=null,history=[],fixedAspect=null;
  const options=()=>({zoom:Number($('[data-photo-zoom]').value),x:Number($('[data-photo-x]').value),y:Number($('[data-photo-y]').value),shape:$('[data-photo-shape]').value});
  function snapshot(){history.push({pixels:wc.getImageData(0,0,working.width,working.height),baseline,angle,flip,options:options()});if(history.length>8)history.shift();}
  function restoreOptions(v){for(const [key,value]of Object.entries(v))$('[data-photo-'+key+']').value=value;}
  function draw(){
    const v=options(),rotated=Math.abs(angle%180)===90,sw=rotated?working.height:working.width,sh=rotated?working.width:working.height;
    const aspect=fixedAspect||({square:1,circle:1,portrait:3/4,landscape:4/3})[v.shape]||sw/sh;
    canvas.width=Math.round(aspect>=1?1200:1200*aspect);canvas.height=Math.round(aspect>=1?1200/aspect:1200);
    ctx.clearRect(0,0,canvas.width,canvas.height);ctx.save();
    if(!fixedAspect&&v.shape==='circle'){ctx.beginPath();ctx.ellipse(canvas.width/2,canvas.height/2,canvas.width/2,canvas.height/2,0,0,Math.PI*2);ctx.clip();}
    const scale=Math.max(canvas.width/sw,canvas.height/sh)*v.zoom,dx=Math.max(0,(sw*scale-canvas.width)/2),dy=Math.max(0,(sh*scale-canvas.height)/2);
    ctx.translate(canvas.width/2+v.x*dx,canvas.height/2+v.y*dy);ctx.rotate(angle*Math.PI/180);ctx.scale(scale*flip,scale);ctx.translate(-working.width/2,-working.height/2);transform=ctx.getTransform();ctx.drawImage(working,0,0);ctx.restore();
    canvas.style.aspectRatio=String(aspect);$('[data-ux=photo-undo]').disabled=!history.length;
  }
  canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();snapshot();drag={id:e.pointerId,x:e.clientX,y:e.clientY,options:options()};canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;e.preventDefault();const b=canvas.getBoundingClientRect();$('[data-photo-x]').value=Math.max(-1,Math.min(1,drag.options.x+(e.clientX-drag.x)/b.width*2));$('[data-photo-y]').value=Math.max(-1,Math.min(1,drag.options.y+(e.clientY-drag.y)/b.height*2));draw();});
  const end=e=>{if(drag?.id!==e.pointerId)return;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);drag=null;};canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
  d.addEventListener('input',e=>{if(e.target.matches('[data-photo-zoom],[data-photo-x],[data-photo-y],[data-photo-shape]'))draw();});
  d.addEventListener('click',async e=>{const key=e.target.closest('[data-ux]')?.dataset.ux;if(!key?.startsWith('photo-'))return;
    if(key==='photo-turn'){snapshot();angle=(angle+90)%360;draw();}
    if(key==='photo-flip'){snapshot();flip*=-1;draw();}
    if(key==='photo-reset'){snapshot();working.width=original.width;working.height=original.height;wc.drawImage(original,0,0);baseline=document.createElement('canvas');baseline.width=original.width;baseline.height=original.height;baseline.getContext('2d').drawImage(original,0,0);angle=0;flip=1;restoreOptions({zoom:1,x:0,y:0,shape:'original'});draw();}
    if(key==='photo-undo'){const old=history.pop();if(old){working.width=old.pixels.width;working.height=old.pixels.height;wc.putImageData(old.pixels,0,0);baseline=old.baseline;angle=old.angle;flip=old.flip;restoreOptions(old.options);draw();}}
    if(key==='photo-apply'){
      const o=selected();if(!o||o.id!==objectId||o.uxLocked||el.uxCanEdit?.(o,'replace')===false){$('[data-photo-status]').textContent='Bitte ein zum Bearbeiten freigegebenes Bild auswählen.';return;}
      const b=e.target.closest('button');b.disabled=true;
      try{const blob=await new Promise((resolve,reject)=>canvas.toBlob(v=>v?resolve(v):reject(Error('Bild konnte nicht erstellt werden.')),'image/png'));
        const id=crypto.randomUUID(),url=URL.createObjectURL(blob);files.set(id,{file:source.file,url,originalUrl:source.originalUrl||source.url,blob,edited:true});
        mutate(()=>{o.uxUploadId=id;if(!o.acrylicFixed){o.h=o.w*canvas.height/canvas.width;if(o.type==='photoSlot')o.photoShape=options().shape==='circle'?'circle':'rect';}});d.close();say('Bild übernommen. Das Original bleibt erhalten; Rückgängig stellt die vorige Version wieder her.');
      }catch(error){$('[data-photo-status]').textContent=error.message;}finally{b.disabled=false;}
    }
  });
  return async function open(o){
    if(!o||o.uxLocked)return say('Bitte das Bild zuerst entsperren.');if(el.uxCanEdit?.(o,'replace')===false)return say('Dieses Bild ist fest vorgegeben.');source=files.get(o.uxUploadId);if(!source)return say('Bitte die Datei erneut auswählen.');
    try{objectId=o.id;fixedAspect=o.acrylicFixed?o.w/o.h:null;$('[data-photo-shape]').closest('label').hidden=!!fixedAspect;$('[data-photo-shape]').disabled=!!fixedAspect;const image=new Image();image.src=source.url;await image.decode();const size=fittedSize(image.naturalWidth,image.naturalHeight);working.width=size.width;working.height=size.height;wc.drawImage(image,0,0,size.width,size.height);
      baseline=document.createElement('canvas');baseline.width=size.width;baseline.height=size.height;baseline.getContext('2d').drawImage(working,0,0);
      const origImage=new Image();origImage.src=source.originalUrl||source.url;await origImage.decode();const origSize=fittedSize(origImage.naturalWidth,origImage.naturalHeight);original.width=origSize.width;original.height=origSize.height;original.getContext('2d').drawImage(origImage,0,0,origSize.width,origSize.height);
      angle=0;flip=1;history=[];restoreOptions({zoom:1,x:0,y:0,shape:o.photoShape==='circle'?'circle':'original'});$('[data-photo-status]').textContent='';draw();d.showModal();
    }catch(error){say('Bild konnte nicht geöffnet werden: '+error.message);}
  };
}
