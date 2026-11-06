const $=id=>document.getElementById(id),params=new URL(location.href).searchParams;
const target={productId:params.get('configuration'),designId:params.get('design'),originalId:params.get('originalId')};
let context,csrf,frame,ready=false,dirty=false,busy=false,pendingRequest=null,returnAfterSave=false,snapshotTimer,startTimer;
const status=(text,error=false)=>{$('status').textContent=text;$('status').dataset.error=String(error);};
function controls(){for(const id of ['save','save-return'])$(id).disabled=!ready||busy;frame?.toggleAttribute('inert',busy);$('back').disabled=busy;}
async function request(path,data){const response=await fetch(path,{method:data?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:data?{'Content-Type':'application/json','X-Slate-Review-CSRF':csrf}:{},...(data?{body:JSON.stringify(data)}:{})});const value=await response.json();if(!response.ok)throw Object.assign(Error(value.error?.message||value.error||'Die Galerieverbindung ist momentan nicht verfügbar.'),{status:response.status});return value;}
const bytes=async blob=>{if(!(blob instanceof Blob))throw Error('Eine Bilddatei fehlt.');const a=new Uint8Array(await blob.arrayBuffer());let binary='';for(let i=0;i<a.length;i+=32768)binary+=String.fromCharCode(...a.subarray(i,i+32768));return btoa(binary);};
function goBack(){if(dirty&&!confirm('Deine Änderungen wurden noch nicht gespeichert. Trotzdem zur Galerie zurückkehren?'))return;dirty=false;location.assign(context?.returnUrl||'/originale/');}
function save(goBack=false){if(!ready||busy)return;busy=true;returnAfterSave=goBack;controls();status('Vorlage wird gesichert …');pendingRequest=crypto.randomUUID();snapshotTimer=setTimeout(()=>{if(!pendingRequest)return;pendingRequest=null;busy=false;controls();status('Die Gestaltung hat nicht rechtzeitig geantwortet. Deine Änderungen bleiben geöffnet; bitte erneut speichern.',true);},15000);frame.contentWindow.postMessage({type:'gravuru-gallery-snapshot-request',requestId:pendingRequest},location.origin);}
async function commit(snapshot){
 try{
  if(snapshot.designId!==context.designId)throw Error('Die geöffnete Vorlage stimmt nicht mehr mit der Galerie überein.');
  const photos=[];
  for(const photo of snapshot.photos){
   if(photo.assetId){photos.push({objectId:photo.objectId,assetId:photo.assetId});continue;}
   const upload={...photo,original:await bytes(photo.original),processed:await bytes(photo.processed),editSource:await bytes(photo.editSource)};
   const asset=await request('/originale/editor/media',{...target,expectedRevision:context.revision,photo:upload});photos.push({objectId:photo.objectId,assetId:asset.assetId});
  }
  const saved=await request('/originale/editor/save',{...target,expectedRevision:context.revision,objects:snapshot.objects,photos});
  context=saved.context;dirty=false;$('target').textContent=context.material+' · '+context.mm.map(n=>n/10).join(' × ')+' cm · Stand '+context.revision;frame.contentWindow.postMessage({type:'gravuru-gallery-saved',photos:saved.photos},location.origin);
  try{sessionStorage.setItem('gravuru-gallery-return',JSON.stringify({...context,savedAt:Date.now()}));}catch{}
  status(saved.changed?'Vorlage gespeichert. Die Galerie zeigt jetzt diesen Stand.':'Vorlage ist bereits auf diesem Stand.');$('latest').hidden=true;
  if(returnAfterSave){busy=false;location.assign(context.returnUrl);}
 }catch(error){status(error.message,true);if(error.status===409){$('latest').href=location.pathname+location.search;$('latest').hidden=false;}}
 finally{busy=false;pendingRequest=null;controls();}
}
$('save').addEventListener('click',()=>save());$('save-return').addEventListener('click',()=>save(true));$('back').addEventListener('click',goBack);
window.addEventListener('beforeunload',event=>{if(dirty||busy){event.preventDefault();event.returnValue='';}});
window.addEventListener('message',event=>{
 if(event.origin!==location.origin||event.source!==frame?.contentWindow)return;
 const d=event.data;
 if(d?.type==='gravuru-gallery-ready'&&d.designId===context.designId){clearTimeout(startTimer);ready=true;controls();status('Du bearbeitest die Originalvorlage. Gespeichert wird nur dieses Design und Format.');}
 if(d?.type==='gravuru-workbench-change')dirty=true;
 if(d?.type==='gravuru-gallery-save-request')save();
 if(d?.type==='gravuru-fk-close')goBack();
 if(d?.type==='gravuru-gallery-start-error'){clearTimeout(startTimer);status('Die Vorlage ist unvollständig geladen: '+d.message,true);ready=false;controls();}
 if(d?.type==='gravuru-gallery-snapshot'&&d.requestId===pendingRequest){clearTimeout(snapshotTimer);void commit(d);}
 if(d?.type==='gravuru-gallery-error'&&d.requestId===pendingRequest){clearTimeout(snapshotTimer);status(d.message,true);busy=false;pendingRequest=null;controls();}
});
try{
 const opened=await request('/originale/editor/context?'+new URLSearchParams(target));context=opened.context;csrf=opened.csrfToken;
 $('title').textContent=context.originalId+' bearbeiten';$('target').textContent=context.material+' · '+context.mm.map(n=>n/10).join(' × ')+' cm · Stand '+context.revision;
 window.GravuruModelProfile=opened.model.legacy;window.UniversalConfig=opened.model.universal;
 window.GravuruGalleryEditor={context,photos:opened.photos};
 frame=document.createElement('iframe');frame.title='Vollständiger Konfigurator für '+context.originalId;frame.src='/editor.html';$('editor').append(frame);
 startTimer=setTimeout(()=>{if(ready)return;status('Der Konfigurator konnte nicht vollständig geladen werden. Bitte die Galerie neu öffnen. Speichern bleibt bis zum vollständigen Laden gesperrt.',true);},20000);
}catch(error){status(error.message,true);}
