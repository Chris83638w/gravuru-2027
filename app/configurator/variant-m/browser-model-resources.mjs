// Internal transport only: restore the exact shared payload before it reaches
// the existing editor/model. No glyph reduction or image conversion takes place.
const RESOURCE_URL=/^\/(?:originale\/editor\/ressourcen|browser-ressourcen)\/[a-f0-9]{32}\/(schriften|grundplatten)\/([a-f0-9]{64})\.json$/;
const pending=new Map();
const CACHE_LIMIT=128;
const image=value=>typeof value==='string'&&/^data:image\/(?:png|jpeg|webp);base64,/.test(value);
const fail=(code,message)=>{throw Object.assign(Error(message),{code});};
function trimCache(){
  let completed=Array.from(pending.values()).filter(entry=>entry.ready).length;
  for(const [key,entry]of pending){if(completed<=CACHE_LIMIT)break;if(entry.ready){pending.delete(key);completed--;}}
}

export const isBrowserResourceUrl=url=>typeof url==='string'&&RESOURCE_URL.test(url);

/** Same-origin, immutable, token-bound resource. Failures permit a fresh retry. */
export function fetchResourceJSON(url,{priority,fetcher=globalThis.fetch,subtle=globalThis.crypto?.subtle}={}){
  const match=typeof url==='string'&&url.match(RESOURCE_URL);
  if(!match)return Promise.reject(Object.assign(Error('Ungültige Produktressource.'),{code:'browser_resource_url'}));
  const cached=pending.get(url);
  if(cached){pending.delete(url);pending.set(url,cached);return cached.promise;}
  const entry={ready:false,promise:null};
  entry.promise=(async()=>{
    if(!subtle?.digest)fail('browser_resource_integrity_unavailable','Die Produktressource kann nicht sicher geprüft werden.');
    const response=await fetcher(url,{credentials:'same-origin',...(priority?{priority}:{})});
    if(!response.ok)fail('browser_resource_load','Die Produktressource konnte nicht geladen werden.');
    const data=await response.arrayBuffer();
    const digest=Array.from(new Uint8Array(await subtle.digest('SHA-256',data)),byte=>byte.toString(16).padStart(2,'0')).join('');
    if(digest!==match[2])fail('browser_resource_integrity','Die Produktressource stimmt nicht mit ihrem Original überein.');
    let value;
    try{value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(data));}
    catch{fail('browser_resource_json','Die Produktressource enthält ungültige Daten.');}
    if(match[1]==='grundplatten'?!image(value):!value||typeof value!=='object'||Array.isArray(value))
      fail('browser_resource_type','Die Produktressource hat einen falschen Inhalt.');
    return value;
  })().then(value=>{entry.ready=true;trimCache();return value;},error=>{if(pending.get(url)===entry)pending.delete(url);throw error;});
  pending.set(url,entry);
  return entry.promise;
}

/** Material must exist before installUniversal/prepareConfig copies the model. */
export async function hydrateMaterialSurface(config,{get=fetchResourceJSON}={}){
  const marker=config?.localResources?.lazyMaterialSurface;
  if(marker===undefined)return;
  const match=typeof marker?.url==='string'&&marker.url.match(RESOURCE_URL);
  if(!marker||typeof marker!=='object'||Array.isArray(marker)||!match||match[1]!=='grundplatten')
    fail('browser_resource_material','Die nachladbare Grundplatte ist ungültig.');
  const value=await get(marker.url);
  if(!image(value))fail('browser_resource_type','Die nachgeladene Grundplatte ist ungültig.');
  config.materialSurface=value;
  delete config.localResources.lazyMaterialSurface;
}
