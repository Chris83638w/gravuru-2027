// Keep the dashboard alive while a catalogue design is edited in the same-origin
// editor. The child delegates authenticated requests to this page, never via URLs.
import {merchantNavigation} from './merchant-navigation.mjs';

const channelPattern=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const overlayPath=path=>/^\/werkstatt\/designs\/bearbeiten\/?$/.test(path);
const marker='gravuruKatalogOverlay';
export function catalogueOverlayIdentity(href){
 const url=new URL(href),channel=url.searchParams.get('katalogOverlay'),reihe=url.searchParams.get('katalogReihe'),id=url.searchParams.get('katalogDesign');
 return overlayPath(url.pathname)&&channelPattern.test(channel||'')&&reihe&&id?{channel,reihe,id}:null;
}
export function catalogueEditorMessage(event,peer,identity,origin){
 const data=event.data;
 return !!identity&&event.origin===origin&&event.source===peer&&data?.channel===identity.channel&&data.reihe===identity.reihe&&data.id===identity.id;
}

export function installDashboardEditor({request,onSaved=()=>{},onClosed=()=>{},windowImpl=globalThis.window,documentImpl=globalThis.document}={}){
 let active=null,dialog,frame,closeButton,title,previousRequest;
 const send=type=>active&&frame.contentWindow?.postMessage({type,...active.identity},windowImpl.location.origin);
 function finish(){
  if(!active)return;
  const previous=active;active=null;
  frame.remove();frame=null;dialog.close();
  windowImpl.GravuruMerchantRequest=previousRequest;
  documentImpl.body.style.overflow=previous.overflow;
  if(previous.hasHistory&&windowImpl.history.state?.[marker]===previous.identity.channel)windowImpl.history.back();
  windowImpl.scrollTo(previous.x,previous.y);
  previous.trigger?.focus?.({preventScroll:true});onClosed(previous.identity);
 }
 function requestClose(){
  if(!active)return;
  if(!active.ready){finish();return;}
  send('gravuru-katalog-editor-request-close');
 }
 function create(){
  dialog=documentImpl.createElement('dialog');dialog.id='catalog-editor-dialog';dialog.className='catalog-editor-overlay';dialog.setAttribute('aria-labelledby','catalog-editor-title');
  const toolbar=documentImpl.createElement('div');toolbar.className='catalog-editor-toolbar';
  title=documentImpl.createElement('strong');title.id='catalog-editor-title';
  closeButton=documentImpl.createElement('button');closeButton.type='button';closeButton.textContent='← Designs';closeButton.addEventListener('click',requestClose);
  toolbar.append(closeButton,title);dialog.append(toolbar);documentImpl.body.append(dialog);
  dialog.addEventListener('cancel',event=>{event.preventDefault();requestClose();});
  windowImpl.addEventListener('message',event=>{
   if(!active||!catalogueEditorMessage(event,frame?.contentWindow,active.identity,windowImpl.location.origin))return;
   const data=event.data;
   if(data.type==='gravuru-katalog-editor-ready'){active.ready=true;return;}
   if(data.type==='gravuru-katalog-editor-state'){active.dirty=data.dirty===true;closeButton.disabled=data.busy===true;return;}
   if(data.type==='gravuru-katalog-editor-saved'){
    if(typeof data.checksum==='string'&&data.checksum&&data.changed===true)onSaved({reihe:data.reihe,id:data.id,checksum:data.checksum});
    return;
   }
   if(data.type==='gravuru-katalog-editor-closed'){finish();return;}
   if(data.type==='gravuru-katalog-editor-close-cancelled'&&!active.hasHistory){
    windowImpl.history.pushState({...windowImpl.history.state,[marker]:active.identity.channel},'',active.href);active.hasHistory=true;
   }
  });
  windowImpl.addEventListener('popstate',()=>{
   if(!active||windowImpl.history.state?.[marker]===active.identity.channel)return;
   active.hasHistory=false;requestClose();
  });
  windowImpl.addEventListener('beforeunload',event=>{if(active?.dirty){event.preventDefault();event.returnValue='';}});
 }
 return {
  get isOpen(){return !!active;},requestClose,
  open({reihe,id,linie,trigger}){
   if(active||!reihe||!id)return false;
   if(!dialog)create();
   const channel=windowImpl.crypto.randomUUID(),identity={channel,reihe,id};
   const query=new URLSearchParams({katalogReihe:reihe,katalogDesign:id,katalogOverlay:channel,...(linie?{katalogLinie:linie}:{})});
   const url=merchantNavigation('/werkstatt/designs/bearbeiten/?'+query,windowImpl.location.href);
   active={identity,trigger,ready:false,dirty:false,hasHistory:true,href:windowImpl.location.href,x:windowImpl.scrollX,y:windowImpl.scrollY,overflow:documentImpl.body.style.overflow};
   previousRequest=windowImpl.GravuruMerchantRequest;windowImpl.GravuruMerchantRequest=request;
   windowImpl.history.pushState({...windowImpl.history.state,[marker]:channel},'',active.href);
   documentImpl.body.style.overflow='hidden';title.textContent=id;closeButton.disabled=false;
   frame=documentImpl.createElement('iframe');frame.className='catalog-editor-frame';frame.title='Katalogdesign bearbeiten';frame.src=url;
   const openedFrame=frame;
   frame.addEventListener('load',()=>{
    if(!active||frame!==openedFrame)return;
    // A completed navigation has already left the editor's beforeunload guard.
    // Read only the frame URL; a blocked/cross-origin page must remain closable.
    let current;try{current=catalogueOverlayIdentity(openedFrame.contentWindow.location.href);}catch{}
    if(current?.channel!==channel||current.reihe!==reihe||current.id!==id){active.ready=false;active.dirty=false;closeButton.disabled=false;}
   });
   dialog.append(frame);dialog.showModal();return true;
  }
 };
}

// The existing editor remains usable directly. Only an explicit same-origin
// embedding with the correct catalogue identity installs this message channel.
export function installCatalogueEditorBridge({state,leave,windowImpl=globalThis.window}={}){
 if(!windowImpl||windowImpl.parent===windowImpl)return null;
 let identity;try{
  identity=catalogueOverlayIdentity(windowImpl.location.href);
  if(!identity||windowImpl.parent.location.origin!==windowImpl.location.origin||identity.id!==state.katalogEditor.id||identity.reihe!==state.katalogEditor.reihe)return null;
 }catch{return null;}
 const send=(type,extra={})=>windowImpl.parent.postMessage({type,...identity,...extra},windowImpl.location.origin);
 let lastState='';
 windowImpl.addEventListener('message',event=>{
  if(catalogueEditorMessage(event,windowImpl.parent,identity,windowImpl.location.origin)&&event.data.type==='gravuru-katalog-editor-request-close')void leave();
 });
 windowImpl.addEventListener('keydown',event=>{
  if(event.key!=='Escape'||windowImpl.document?.querySelector('dialog[open]'))return;
  event.preventDefault();void leave();
 });
 send('gravuru-katalog-editor-ready');
 return {
  sync(){const value=JSON.stringify([state.dirty===true,state.busy===true]);if(value===lastState)return;lastState=value;send('gravuru-katalog-editor-state',{dirty:state.dirty===true,busy:state.busy===true});},
  saved(data){send('gravuru-katalog-editor-saved',{checksum:data.checksum,changed:data.changed===true});},
  close(){send('gravuru-katalog-editor-closed');},
  cancel(){send('gravuru-katalog-editor-close-cancelled');}
 };
}
