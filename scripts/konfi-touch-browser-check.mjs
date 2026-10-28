// Local browser regression probe. Import only from the dedicated test page,
// never from a customer entry point. Runs against the real built component.
export async function checkSimultaneousTextTouches(el){
 const r=el.shadowRoot,win=el.ownerDocument.defaultView,wait=()=>new Promise(resolve=>win.requestAnimationFrame(()=>win.requestAnimationFrame(resolve)));
 const object=el.state.objects.find(o=>o.type==='text'&&o.text==='Meyer');if(!object)throw Error('D8 text fixture missing');
 el.state.selected=object.id;el.sync();r.querySelector('[data-ux=mobile-step][data-step="text"]')?.click();r.querySelector('#ux-tab-text')?.click();el.uxFitView();await wait();
 const canonicalSvg=svg=>{const doc=new win.DOMParser().parseFromString(svg,'image/svg+xml'),ids=new Map([...doc.querySelectorAll('[id]')].map((n,i)=>[n.id,'stable-'+i]));for(const n of doc.querySelectorAll('*'))for(const a of [...n.attributes]){let value=a.value;for(const [id,stable] of ids){if(a.name==='id'&&value===id)value=stable;else{value=value.replaceAll('url(#'+id+')','url(#'+stable+')');if(value==='#'+id)value='#'+stable;}}if(value!==a.value)n.setAttribute(a.name,value);}return new win.XMLSerializer().serializeToString(doc);};
 const before=JSON.stringify(el.state.objects),size=object.size,displaySize=Number(r.querySelector('[data-direct-size]').value),svg=canonicalSvg(el.productionSVG('vector')),history=JSON.stringify(el.history);
 const g=r.querySelector('.scene [data-object="'+CSS.escape(object.id)+'"]'),b=g.getBoundingClientRect(),cx=b.left+b.width/2,cy=b.top+b.height/2;
 const contacts=distance=>[-1,1].map((side,i)=>new win.Touch({identifier:701+i,target:g,clientX:cx+side*distance/2,clientY:cy}));
 const emit=(type,touches,changed=touches)=>g.dispatchEvent(new win.TouchEvent(type,{bubbles:true,composed:true,cancelable:true,touches,targetTouches:touches,changedTouches:changed}));
 const initial=contacts(Math.min(40,b.width*.6));emit('touchstart',initial);el.render();await wait();const originalTouchTargetDetached=!g.isConnected;
 const end=contacts(Math.min(40,b.width*.6)*1.9);emit('touchmove',end);const zoom=el.uxViewZoom();emit('touchend',[],end);await wait();
 const result={originalTouchTargetDetached,case:'simultaneous touch batch over selected Meyer',input:'TouchEvent with two contacts in the same event',beforeMm:displaySize,afterMm:Number(r.querySelector('[data-direct-size]').value),internalSizeBefore:size,internalSizeAfter:el.state.objects.find(o=>o.id===object.id).size,viewZoom:zoom,allObjectsUnchanged:JSON.stringify(el.state.objects)===before,productionSvgUnchanged:canonicalSvg(el.productionSVG('vector'))===svg,undoUnchanged:JSON.stringify(el.history)===history};
 result.pass=result.originalTouchTargetDetached&&result.beforeMm===10&&result.afterMm===10&&result.internalSizeAfter===result.internalSizeBefore&&Math.abs(zoom-1.9)<1e-6&&result.allObjectsUnchanged&&result.productionSvgUnchanged&&result.undoUnchanged;
 return result;
}
