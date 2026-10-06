import {merchantRequest} from './merchant-request.mjs';

// Normal link navigation cannot attach an App Bridge bearer token. Fetch private
// files through the same verified merchant adapter, then download a local blob.
export async function merchantDownload(path, {request=merchantRequest}={}) {
  const response=await request(path);
  if(!response.ok) throw Error('Download nicht möglich. Bitte Anmeldung und Dateifreigabe prüfen.');
  if(/application\/json/i.test(response.headers.get('content-type')||'')) throw Error('Keine Download-Datei erhalten.');
  const disposition=response.headers.get('content-disposition')||'';
  const supplied=disposition.match(/filename="([^"\r\n]+)"/)?.[1];
  const filename=supplied&&!/[\\/\x00-\x1f]/.test(supplied)&&supplied.length<=180?supplied:null;
  return {blob:await response.blob(),filename};
}
export function installMerchantDownloads(doc=globalThis.document) {
  if(!doc?.querySelector('meta[name=gravuru-merchant-auth]'))return;
  const pending=new WeakSet();
  doc.addEventListener('click',async event=>{
    const link=event.target?.closest?.('a[href]'),href=link?.getAttribute('href');
    if(!href?.startsWith('/api/workshop/'))return;
    event.preventDefault();if(pending.has(link))return;pending.add(link);link.setAttribute('aria-busy','true');
    let status=doc.getElementById('merchant-download-status');
    if(!status){status=doc.createElement('p');status.id='merchant-download-status';status.setAttribute('role','status');doc.body.append(status);}
    status.textContent='Download wird vorbereitet …';
    try{
      const result=await merchantDownload(href),url=URL.createObjectURL(result.blob),anchor=doc.createElement('a');
      anchor.href=url;anchor.download=result.filename||link.getAttribute('download')||'Gravuru-Datei';anchor.hidden=true;doc.body.append(anchor);
      try{anchor.click();}finally{anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
      status.textContent='Download bereit.';
    }catch(error){status.textContent=error.message;}
    finally{pending.delete(link);link.removeAttribute('aria-busy');}
  });
}
if(typeof document!=='undefined')installMerchantDownloads();
