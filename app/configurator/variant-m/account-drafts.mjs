// Ü8.2 (K7): Dialog „Deine Entwürfe“ im Kundeneditor. Speichern braucht ein
// Kundenkonto (Entscheidung 3 vom 19.10.2026): ohne Konto Hinweis und Link zur
// Anmeldung, mit Konto Liste „Meine Entwürfe“ (Titel, Datum, Vorschau), Laden,
// Löschen. Ob ein Konto angemeldet ist, entscheidet allein der Server.
import {createAccountDraftClient,loginRequired,accountUnavailable,loginUrl} from './account-draft-client.mjs';

const base64=blob=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=()=>reject(Error('Die Bilddatei konnte nicht gelesen werden.'));reader.readAsDataURL(blob);});
const dateText=iso=>{const d=new Date(iso);return Number.isNaN(d.getTime())?'':new Intl.DateTimeFormat('de-DE',{dateStyle:'medium',timeStyle:'short'}).format(d);};
async function decodeImage(blob){const url=URL.createObjectURL(blob);const image=new Image();image.src=url;try{await image.decode();}catch{URL.revokeObjectURL(url);throw Error('Ein gespeichertes Foto konnte nicht geladen werden.');}return {url,width:image.naturalWidth,height:image.naturalHeight};}
// Kleine PNG-Vorschau aus der vorhandenen Produktvorschau (el.png), höchstens 320 px Kante.
export async function draftThumbnail(el,maxEdge=320){
  const full=await el.png(),source=await decodeImage(full);
  try{
    const scale=Math.min(1,maxEdge/Math.max(source.width,source.height)),canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(source.width*scale));canvas.height=Math.max(1,Math.round(source.height*scale));
    const image=new Image();image.src=source.url;await image.decode();canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
    return await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Vorschau konnte nicht erstellt werden.')),'image/png'));
  }finally{URL.revokeObjectURL(source.url);}
}

export function installAccountDrafts({el,config,files,dialog,button,esc,say,restoreDraft,pending=()=>false,clientFactory=createAccountDraftClient}){
  const settings=config?.customerAccount||{};
  const client=clientFactory({base:settings.apiBase||''});
  const root=dialog.querySelector('[data-ux-account]');
  let busy=false,drafts=[],mode='unknown',message='',activeId=null,limit=null;
  const title=()=>root.querySelector('[data-ux-account-title]')?.value.trim()||'';
  function render(){
    const note='<div class="ux-account-note"><strong>Im Kundenkonto speichern</strong><p>Gespeicherte Entwürfe liegen 90 Tage in deinem Kundenkonto – mit Fotos, auf jedem Gerät.</p></div>';
    if(mode==='login'){
      const href=loginUrl(settings.loginPath,settings.returnUrl||document.referrer||location.href);
      root.innerHTML=note+`<p>Zum Speichern meldest du dich kurz in deinem Kundenkonto an. Dein aktueller Stand bleibt auf diesem Gerät erhalten.</p><a class="ux-primary ux-account-login" href="${esc(href)}" target="_top" rel="noopener">Anmelden oder registrieren</a><p class="ux-small" data-ux-account-status role="status">${esc(message)}</p>`;
      return;
    }
    if(mode!=='ready'){
      root.innerHTML=note+`<p>${mode==='unavailable'?'Die Kontoverbindung ist in dieser Umgebung noch nicht eingerichtet. Dein Entwurf bleibt auf diesem Gerät erhalten.':esc(message||'Das Kundenkonto ist gerade nicht erreichbar.')}</p>${mode==='unavailable'?'':button('account-refresh','Erneut versuchen')}<p class="ux-small" data-ux-account-status role="status"></p>`;
      return;
    }
    const list=drafts.length?drafts.map(d=>`<li class="ux-account-draft"><img class="ux-account-thumb" src="${esc(client.previewUrl(d.id))}" alt="" loading="lazy"><div><strong>${esc(d.title)}</strong><small>${esc(dateText(d.updatedAt))}${d.photoCount?` · ${d.photoCount} Foto${d.photoCount===1?'':'s'}`:''}${d.productId!==config.profile.binding?.productId?' · anderes Produkt':''}</small></div><div class="ux-upload-actions">${button('account-load','Laden',`data-id="${esc(d.id)}" ${d.productId!==config.profile.binding?.productId||d.profileRevision!==config.profile.revision?'disabled title="Gehört zu einem anderen Produkt oder Produktstand."':''}`)}${button('account-delete','Löschen',`data-id="${esc(d.id)}" class="ux-remove-upload"`)}</div></li>`).join(''):'<li class="ux-small">Noch keine gespeicherten Entwürfe.</li>';
    root.innerHTML=note+`<div class="ux-account-save"><label>Titel <input type="text" data-ux-account-title maxlength="80" placeholder="${esc(config.profile.name)}"></label>${button('account-save',activeId?'Entwurf aktualisieren':'Diesen Entwurf speichern','class="ux-primary"')}${activeId?button('account-save-new','Als neuen Entwurf speichern'):''}</div><h3>Meine Entwürfe${limit?` <small>(${drafts.length} von ${limit})</small>`:''}</h3><ul class="ux-account-list">${list}</ul><p class="ux-small" data-ux-account-status role="status">${esc(message)}</p>`;
  }
  const status=text=>{message=text;const node=root.querySelector('[data-ux-account-status]');if(node)node.textContent=text;else render();};
  async function refresh(){
    try{const result=await client.list();drafts=Array.isArray(result.drafts)?result.drafts:[];limit=Number.isSafeInteger(result.limit)?result.limit:null;mode='ready';message='';}
    catch(error){mode=loginRequired(error)?'login':accountUnavailable(error)?'unavailable':'error';message=mode==='error'?error.message:'';drafts=[];}
    render();
  }
  async function mediaPayload(){
    const used=new Set(el.state.objects.filter(o=>o.uxUploadId).map(o=>o.uxUploadId)),photos=[];
    for(const id of used){
      const asset=files.get(id),object=el.state.objects.find(o=>o.uxUploadId===id);
      if(!asset?.file)throw Error('Ein Foto fehlt auf diesem Gerät. Bitte erneut hochladen oder das Element entfernen.');
      photos.push({uploadId:id,kind:object?.uxUploadKind==='logo'?'logo':'photo',name:asset.file.name||'',mime:asset.file.type,original:await base64(asset.file),...(asset.blob?{edited:await base64(asset.blob)}:{})});
    }
    return photos;
  }
  async function save(asNew){
    if(busy)return;if(pending())return status('Bitte warten, bis das Foto vollständig geladen ist.');
    busy=true;status('Entwurf wird gespeichert …');
    try{
      const draft=el.draftPayload({draft:true}),fingerprint=JSON.stringify(el.state);
      const payload={title:title()||config.profile.name,draft,photos:await mediaPayload(),preview:await base64(await draftThumbnail(el))};
      if(fingerprint!==JSON.stringify(el.state))throw Error('Die Gestaltung wurde während des Speicherns geändert. Bitte erneut speichern.');
      const result=activeId&&!asNew?await client.update(activeId,payload):await client.create(payload);
      activeId=result.draft?.id||activeId;
      await refresh();status('Entwurf gespeichert: '+(result.draft?.title||payload.title)+'.');say('Entwurf im Kundenkonto gespeichert.');
    }catch(error){
      if(loginRequired(error)){mode='login';render();}
      else status(error.message);
    }finally{busy=false;}
  }
  async function load(id){
    if(busy)return;busy=true;status('Entwurf wird geladen …');
    try{
      const result=await client.get(id),draft=result.draft;
      if(!draft||typeof draft!=='object')throw Error('Der Entwurf ist unvollständig.');
      const loaded=new Map();
      for(const photo of Array.isArray(result.photos)?result.photos:[]){
        const fetchBlob=async variant=>{const response=await fetch(client.photoUrl(id,photo.uploadId,variant),{credentials:'same-origin',cache:'no-store'});if(!response.ok)throw Error('Ein gespeichertes Foto konnte nicht geladen werden.');return response.blob();};
        const original=await fetchBlob('original'),file=new File([original],photo.name||'foto',{type:photo.mime||original.type});
        const edited=photo.edited?await fetchBlob('edited'):null,shown=await decodeImage(edited||file);
        loaded.set(photo.uploadId,{file,url:shown.url,width:shown.width,height:shown.height,...(edited?{blob:edited,edited:true}:{})});
      }
      restoreDraft(draft);
      for(const [uploadId,asset] of loaded)files.set(uploadId,asset);
      el.sync();activeId=id;
      const missing=el.state.objects.filter(o=>o.uxUploadId&&!files.get(o.uxUploadId)?.url).length;
      status('Entwurf geladen.'+(missing?' Ein Foto fehlt – bitte erneut hochladen.':''));say('Entwurf aus dem Kundenkonto geladen.');render();
    }catch(error){if(loginRequired(error)){mode='login';render();}else status(error.message);}
    finally{busy=false;}
  }
  async function remove(id){
    if(busy)return;busy=true;status('Entwurf wird gelöscht …');
    try{await client.remove(id);if(activeId===id)activeId=null;await refresh();status('Entwurf gelöscht.');}
    catch(error){if(loginRequired(error)){mode='login';render();}else status(error.message);}
    finally{busy=false;}
  }
  dialog.addEventListener('click',e=>{
    const b=e.target.closest('[data-ux]');if(!b||b.disabled||!root.contains(b))return;
    const action=b.dataset.ux;
    if(action==='account-save')save(false);else if(action==='account-save-new')save(true);else if(action==='account-refresh')refresh();
    else if(action==='account-load')load(b.dataset.id);else if(action==='account-delete'){if(window.confirm?.('Diesen Entwurf wirklich löschen?')!==false)remove(b.dataset.id);}
  });
  render();
  return {refresh,save,load,remove,client,activeDraft:()=>activeId};
}
