// A tiny, non-interactive app-origin frame shares the HTTP cache partition of
// the eventual editor. It does not instantiate an editor or request a model.
export function savingData(connection){return connection?.saveData===true||/(^|-)2g$/.test(String(connection?.effectiveType||''));}
export function validWarmManifest(value){
 if(value?.schema!=='gravuru-shop-warm/v1'||value.editorPath!=='/_merchant-acryl-editor.html'||value.catalogPath!=='/_acryl-runtime/lazy/katalog-kern.json'||!Array.isArray(value.fonts)||value.fonts.length>3||!Array.isArray(value.motifs)||value.motifs.length>6)return false;
 if(value.previews!==undefined&&(!Array.isArray(value.previews)||value.previews.length>3||!value.previews.every(url=>typeof url==='string'&&/^\/konfigurator\/shop\/vorschauen\/[a-f0-9]{64}\.svg$/.test(url))))return false;
 return value.fonts.every(f=>typeof f?.name==='string'&&f.name.length>0&&f.name.length<=120&&(f.url===undefined||/^\/konfigurator\/shop\/schriften\/[a-f0-9]{64}\.json$/.test(f.url)))&&value.motifs.every(k=>/^import-[a-f0-9]{24}$/.test(k));
}
export function currentEditorBundle(html){
 // Match the active preload tag, never historical strings embedded in scripts.
 for(const tag of String(html).match(/<link\b[^>]*>/gi)||[]){if(!/\brel=["']modulepreload["']/i.test(tag))continue;const path=/\bhref=["'](\/_acryl-bundle\/editor-[a-f0-9]{16}\.mjs)["']/i.exec(tag)?.[1];if(path)return path;}
 return null;
}
export function warmAssetPaths(manifest,catalog){
 if(!validWarmManifest(manifest))return [];
 const index=new Map((catalog?.font_index||[]).map(f=>[f.name,f])),known=new Set((catalog?.motif_index||[]).map(m=>m.key)),out=[];
 for(const font of manifest.fonts){const entry=index.get(font.name);if(font.url)out.push(font.url);else if(/^[a-z0-9-]+\.json$/.test(entry?.file||''))out.push('/_acryl-runtime/lazy/schriften/'+entry.file);}
 for(const key of manifest.motifs)if(known.has(key))out.push('/_acryl-runtime/lazy/motive/'+key+'.json');
 return [...new Set([...out,...(manifest.previews||[])])].slice(0,12);
}
export async function warmShopAssets(manifest,{fetchImpl=globalThis.fetch,connection=globalThis.navigator?.connection,signal}={}){
 if(!validWarmManifest(manifest)||savingData(connection))return {skipped:true,requests:[]};
 const requests=[],seen=new Set();let budget=6*1024*1024;
 async function get(path,maxBytes){
  if(seen.has(path)||budget<=0||signal?.aborted)return null;seen.add(path);requests.push(path);
  try{const response=await fetchImpl(path,{credentials:'same-origin',priority:'low',redirect:'error',signal});if(!response.ok)return null;
   const reader=response.body?.getReader();let bytes=0,parts=[];
   if(reader){for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;budget-=value.byteLength;if(bytes>maxBytes||budget<0){await reader.cancel();return null;}parts.push(value);}const all=new Uint8Array(bytes);let offset=0;for(const part of parts){all.set(part,offset);offset+=part.length;}return new TextDecoder().decode(all);}
   const text=await response.text();bytes=new TextEncoder().encode(text).length;budget-=bytes;return bytes<=maxBytes&&budget>=0?text:null;
  }catch{return null;}
 }
 const [core,html]=await Promise.all([get(manifest.catalogPath,512*1024),get(manifest.editorPath,1024*1024)]);
 let catalog=null;try{catalog=JSON.parse(core);}catch{}
 const bundle=currentEditorBundle(html),paths=[...(bundle?[bundle]:[]),...warmAssetPaths(manifest,catalog)];
 let next=0;async function worker(){while(next<paths.length){const path=paths[next++];await get(path,2*1024*1024);}}
 await Promise.all([worker(),worker()]);return {skipped:false,requests};
}
if(typeof window!=='undefined'&&window.parent!==window){
 try{const manifest=JSON.parse(decodeURIComponent(location.hash.slice(1))),controller=new AbortController();
  window.addEventListener('pagehide',()=>controller.abort(),{once:true});warmShopAssets(manifest,{signal:controller.signal}).catch(()=>{});
 }catch{/* Optional warmup never blocks product purchase. */}
}
