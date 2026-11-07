// Mikail, 07.11.2026: the private editor loads identical complete font/plate
// payloads once. Stored product documents and their rendering remain unchanged.
import {createHash,randomBytes} from 'node:crypto';
import {productFontIndex} from '../configurator/variant-m/lazy-resources-model.mjs';

const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const hash=body=>createHash('sha256').update(body).digest('hex');
const image=value=>typeof value==='string'&&/^data:image\/(?:png|jpeg|webp);base64,/.test(value);
const fail=(code,message)=>{throw Object.assign(Error(message),{status:503,code});};
const configOf=model=>plain(model?.universal)?model.universal:model;
const serialize=value=>Buffer.from(JSON.stringify(value),'utf8');
const contentType='application/json; charset=utf-8';
const resourceValue=(config,kind,name)=>kind==='font'
  ?(config?.localResources?.fonts&&Object.hasOwn(config.localResources.fonts,name)?config.localResources.fonts[name]:undefined)
  :config?.materialSurface;
function reloadConfig(source){
  try{
    const model=source();
    if(model&&typeof model.then==='function'){Promise.resolve(model).catch(()=>{});return null;}
    return plain(model)?configOf(model):null;
  }catch{return null;}
}

/**
 * One private instance/namespace per authorized handler. `source()` must reload
 * the pinned, complete model; never use it to look up arbitrary URL parameters.
 * The caller still owns authentication and private HTTP cache headers.
 *
 * maxBytes bounds retained payload buffers. maxEntries also bounds recovery
 * descriptors/callbacks. Body eviction is recoverable while its descriptor
 * remains; a descriptor evicted by that limit deliberately becomes a 404.
 * A supplied source is checked once during prepare. Payloads absent/different
 * in that pinned source remain inline, including supplemental current fonts.
 */
export function createBrowserModelResources({prefix,maxBytes=64*1024*1024,maxEntries=2048}={}){
  if(typeof prefix!=='string'||!/^\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/.test(prefix))throw TypeError('A local resource prefix without a trailing slash is required.');
  if(!Number.isSafeInteger(maxBytes)||maxBytes<1||!Number.isSafeInteger(maxEntries)||maxEntries<1)throw TypeError('Positive bounded resource limits are required.');
  const namespace=prefix+'/'+randomBytes(16).toString('hex');
  const pattern=new RegExp('^'+namespace+'/(schriften|grundplatten)/([a-f0-9]{64})\\.json$');
  const bodies=new Map(),descriptors=new Map();let cachedBytes=0;
  const touch=(map,key,value)=>{map.delete(key);map.set(key,value);};
  const removeBody=key=>{const old=bodies.get(key);if(old){cachedBytes-=old.length;bodies.delete(key);}};
  function rememberBody(key,body){
    removeBody(key);
    // A regenerated response may be larger than the cache. Serve it transiently
    // without retaining a single oversized exception to the configured limit.
    if(body.length>maxBytes)return;
    while(cachedBytes+body.length>maxBytes){const oldest=bodies.keys().next().value;removeBody(oldest);}
    bodies.set(key,body);cachedBytes+=body.length;
  }
  function register(entry,source){
    const previous=descriptors.get(entry.key);
    // Do not retain a complete model or redundant fallback callback lists.
    const recovery=typeof source==='function'?{source,name:entry.name}:previous?.recovery??null;
    touch(descriptors,entry.key,{kind:entry.kind,hash:entry.hash,recovery});
    while(descriptors.size>maxEntries){const oldest=descriptors.keys().next().value;descriptors.delete(oldest);removeBody(oldest);}
    rememberBody(entry.key,entry.body);
  }
  function prepare(model,{source}={}){
    if(source!==undefined&&typeof source!=='function')throw TypeError('The pinned model source must be a synchronous callback.');
    if(!plain(model)||!plain(configOf(model)))throw TypeError('A complete native model is required.');
    const copy=structuredClone(model),config=configOf(copy),resources=config.localResources;
    if(resources!==undefined&&!plain(resources))throw TypeError('Native model resources must be an object.');
    const fonts=resources?.fonts;
    if(fonts!==undefined&&!plain(fonts))throw TypeError('Native fonts must be an object.');
    // Validate the pre-existing local URLs with the actual browser contract.
    productFontIndex(config);
    const previous=resources?.lazyFonts??[],existing=new Map(previous.map(entry=>[entry.name,entry]));
    const entries=new Map(),fontEntries=[];let extraFonts=0;
    const pinnedConfig=typeof source==='function'?reloadConfig(source):null;
    function emit(kind,value,name){
      const body=serialize(value),sha256=hash(body),key=kind+'/'+sha256;
      if(typeof source==='function'){
        const pinned=resourceValue(pinnedConfig,kind,name);
        try{if(pinned===undefined||hash(serialize(pinned))!==sha256)return null;}catch{return null;}
      }
      if(!entries.has(key))entries.set(key,{key,kind,name,hash:sha256,body});
      return namespace+'/'+(kind==='font'?'schriften':'grundplatten')+'/'+sha256+'.json';
    }
    for(const [name,font] of Object.entries(fonts??{})){
      if(!name.trim()||name.length>120)continue;
      if(!plain(font))throw TypeError('An inline native font must contain its complete resource object.');
      // The existing browser index accepts 64 entries. Extra complete fonts
      // stay inline, rather than making a formerly valid product unopenable.
      if(!existing.has(name)&&previous.length+extraFonts>=64)continue;
      const url=emit('font',font,name),prior=existing.get(name);
      if(!url)continue;
      fontEntries.push({...prior,name,url,...(typeof font.label==='string'?{label:font.label}:{}),...(typeof font.category==='string'?{category:font.category}:{})});
      if(!existing.has(name))extraFonts++;
    }
    if(fontEntries.length){
      const inline=new Set(fontEntries.map(entry=>entry.name));
      for(const name of inline)delete config.localResources.fonts[name];
      config.localResources.lazyFonts=[...previous.filter(entry=>!inline.has(entry.name)),...fontEntries];
      productFontIndex(config);
    }
    if(image(config.materialSurface)){
      const url=emit('material-image',config.materialSurface);
      if(url){
        config.localResources??={};
        config.localResources.lazyMaterialSurface={url};
        delete config.materialSurface;
      }
    }
    if(entries.size>maxEntries)fail('browser_resources_capacity','Die Ressourcen dieses Modells überschreiten die konfigurierte Ablagegröße.');
    // Without a reload callback every body emitted by this prepare must fit.
    // Fail before admission instead of returning immediately broken URLs.
    if(typeof source!=='function'&&[...entries.values()].reduce((sum,entry)=>sum+entry.body.length,0)>maxBytes)
      fail('browser_resources_capacity','Für dieses Modell fehlt eine feste Quelle zum sicheren Nachladen der Ressourcen.');
    for(const entry of entries.values())register(entry,source);
    return copy;
  }
  function matches(pathname){return typeof pathname==='string'&&pattern.test(pathname);}
  function read(pathname){
    const match=typeof pathname==='string'?pattern.exec(pathname):null;if(!match)return null;
    const kind=match[1]==='schriften'?'font':'material-image',key=kind+'/'+match[2],entry=descriptors.get(key);
    if(!entry)return null; // Never consult any source for unissued resources.
    let body=bodies.get(key);
    if(!body){
      if(typeof entry.recovery?.source!=='function')return null;
      try{
        const value=resourceValue(reloadConfig(entry.recovery.source),kind,entry.recovery.name);
        if(kind==='font'?!plain(value):!image(value))return null;
        body=serialize(value);if(hash(body)!==entry.hash)return null;
        rememberBody(key,body);
      }catch{return null;}
    }else touch(bodies,key,body);
    touch(descriptors,key,entry);
    // Responses cannot mutate retained buffers used by another name/product.
    return {body:Buffer.from(body),hash:entry.hash,contentType};
  }
  return {prepare,read,matches};
}
