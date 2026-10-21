const sku=location.pathname.split('/').filter(Boolean)[1],status=document.querySelector('#status');
document.querySelector('#back').addEventListener('click',event=>{if(history.length>1){event.preventDefault();history.back();}});
try{
 const endpoint='/api/gestalten/'+encodeURIComponent(sku),response=await fetch(endpoint+'/model',{credentials:'omit'}),data=await response.json();
 if(!response.ok)throw Error(data.error?.message||'Dieses Design konnte nicht geladen werden.');
 const {model,resources,token}=data;
 window.GravuruModelProfile=model.legacy;window.UniversalConfig=model.universal;window.GravuruPreviewResources=resources;
 window.GravuruCustomerPreview={productId:model.configuration.id,productRevision:model.configuration.revision,save:async payload=>{
  const response=await fetch(endpoint+'/drafts',{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json','X-Gravuru-Preview':token},body:JSON.stringify(payload)});
  const result=await response.json();if(!response.ok)throw Error(result.error?.message||'Die Gestaltung konnte nicht gesichert werden.');return result;
 }};
 document.querySelector('#title').textContent=model.name;document.title=model.name+' gestalten · Gravuru';
 const frame=document.createElement('iframe');frame.title='Dein Foto und deinen Text gestalten';frame.src='/_merchant-editor.html';document.querySelector('#editor').append(frame);status.hidden=true;
 window.addEventListener('message',event=>{if(event.origin===location.origin&&event.source===frame.contentWindow&&event.data?.type==='gravuru-fk-close')document.querySelector('#back').click();});
}catch(error){status.textContent=error.message;}
