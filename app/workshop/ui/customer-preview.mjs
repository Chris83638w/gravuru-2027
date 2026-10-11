import {merchantRequest} from './merchant-request.mjs';
const params=new URL(location.href).searchParams,status=document.querySelector('#status'),back=document.querySelector('#back');
const context=new URLSearchParams();for(const key of ['shop','host','embedded'])if(params.has(key))context.set(key,params.get(key));
const id=params.get('configuration'),revision=params.get('revision');
if(id)context.set('configuration',id);back.href='/werkstatt/?'+context;
try{
 if(!/^cfg_[a-f0-9-]{36}$/.test(id||'')||! /^[1-9][0-9]*$/.test(revision||''))throw Error('Eine gespeicherte Produktkennung und Revision sind erforderlich.');
 const response=await merchantRequest('/api/workshop/customer-model/'+id+'?revision='+revision);
 const model=await response.json();if(!response.ok)throw Error(model.error?.message||'Produkt konnte nicht geladen werden.');
 const resources=Object.create(null),urls=new Set();
 if(model.universal){
  for(const match of JSON.stringify(model.universal).matchAll(/\/api\/workshop\/design-assets\/[a-f0-9]{64}\/preview\.svg/g))urls.add(match[0]);
  for(const item of model.universal.localResources?.photoExamples||[])urls.add('/api/workshop/design-assets/'+item.assetId+'/preview.svg');
  for(const url of urls){const result=await merchantRequest(url);if(!result.ok)throw Error('Eine private Designressource konnte nicht geladen werden.');const blob=await result.blob();resources[url]=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});}
  // Keep the immutable source descriptors valid. Only the renderer catalog
  // resolves authenticated preview bytes after the product has been validated.
 }
 window.GravuruPreviewResources=resources;
 window.GravuruModelProfile=model.legacy;window.UniversalConfig=model.universal;
 window.GravuruWorkshopReview={productId:model.configuration.id,productRevision:model.configuration.revision};
 // Same-origin renderer obtains authenticated API calls through this closure;
 // session tokens never enter URLs, storage or the serialized product model.
 window.GravuruMerchantRequest=merchantRequest;
 document.querySelector('#title').textContent=model.name;document.title=model.name+' · Kundenansicht';
 const frame=document.createElement('iframe');frame.title=model.name+' personalisieren';frame.src=model.key==='form'?'/_merchant-form-editor.html?configuration='+id+'&revision='+revision:'/_merchant-editor.html';
 document.querySelector('#editor').append(frame);status.hidden=true;
 window.addEventListener('message',event=>{if(event.origin===location.origin&&event.source===frame.contentWindow&&event.data?.type==='gravuru-fk-close')location.assign(back.href);});
}catch(error){status.textContent=error.message;}
