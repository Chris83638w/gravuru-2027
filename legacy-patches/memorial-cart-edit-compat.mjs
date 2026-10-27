const once=(source,anchor,replacement)=>{if(source.split(anchor).length!==2)throw Error('Unbekannter Laufzeitstand: '+anchor.slice(0,80));return source.replace(anchor,replacement);};
export function patchMemorialCartUX(source){
 source="import {installLegacyCartRestore} from './legacy-cart-restore.mjs';\n"+source;
 return once(source,"  window.parent.postMessage({type:'gravuru-ux-ready'},location.origin);","  if(config)installLegacyCartRestore({el,config,files});\n  window.parent.postMessage({type:'gravuru-ux-ready'},location.origin);");
}
export function patchMemorialCartIndex(source){
 source=once(source,"window.addEventListener('message',event=>{","window.addEventListener('message',event=>{\n  if(window.GravuruCommerce&&event.origin===parentOrigin&&event.source===window.parent&&event.data?.session===session&&event.data.type==='gravuru-cart-restore'){frame.contentWindow.postMessage(event.data,location.origin);return;}");
 source=once(source,"if(event.data?.type==='gravuru-ux-ready')document.getElementById('status')?.remove();","if(event.data?.type==='gravuru-ux-ready'){document.getElementById('status')?.remove();if(window.GravuruCommerce)window.parent.postMessage({type:'gravuru-cart-editor-ready',session},parentOrigin);}");
 return once(source,"if(window.GravuruCommerce&&event.data?.type==='gravuru-cart-submit'&&event.data.session===session)","if(window.GravuruCommerce&&['gravuru-cart-submit','gravuru-cart-restored','gravuru-cart-restore-error'].includes(event.data?.type)&&event.data.session===session)");
}
