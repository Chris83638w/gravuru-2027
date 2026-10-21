import {validContentId} from './design-content.mjs';
// Only audited releases belong here. Draft HTML cannot grant itself capabilities.
export const DRAFT_FILE_MAX_BYTES=2_000_000;
const base='https://gravuru-design.myshopify.com/cdn/shop/t/40/assets/';
const legacy=Object.freeze({
 id:'doorbell-v1',schemaVersion:3,kind:'layered-doorbell',
 capabilities:Object.freeze(['text','motif','customer-options','design-marks']),
 // Bundled motifs are known to the audited base editor. Additional library
 // media need the G2 registry/catalogue verification before publication.
 motifIds:Object.freeze(['paw','dog','heart','rainbow','star','branch','wreath','mountain','sun','infinity','frame','line','circle','flower','moon','wings','tree','compass']),
 artifacts:Object.freeze([
  Object.freeze({url:base+'gravuru-model-launcher-live-v5.js',sha256:'92a46ef366047689687a901828f7aac8e49ab21c8f32ec6ce58114ce887e50d4'}),
  Object.freeze({url:base+'gravuru-admin-runtime-v1.js',sha256:'4404eb140bc31226de7bebed882e408692a2bef66bbc56d25fdca39bcc94d107'}),
  Object.freeze({url:base+'gravuru-model-editor-live.js',sha256:'b514081ed6822cbeee176edaea6d014ee891219807d8eb89f7a677f94d9f1b85'})
 ])
});
export const RUNTIME_RELEASES=Object.freeze([legacy]);
const validId=validContentId;
export function publicationSnapshot(profile){
 if(!validId(profile.id)||!validId(profile.admin?.draftRevision))throw Error('Eine eindeutige gespeicherte Entwurfsrevision fehlt. Bitte zuerst speichern.');
 const active=structuredClone(profile);delete active.admin;
 active.revision=profile.admin.draftRevision;
 return active;
}
export function requiredCapabilities(profile){
 const required=new Set();
 if(profile.customerFields!==undefined||profile.fontGroups!==undefined)required.add('customer-fields');
 for(const design of profile.designs||[]){
  if(design.category||design.collections?.length)required.add('design-categories');
  if(design.marks?.length)required.add('design-marks');
  for(const object of design.objects||[]){
   required.add(object.type);
   if(object.customerEditable===false)required.add('locked-elements');
   if(['customerFieldId','fontGroupId','constraints','price','priceCents','surchargeCents','allowedFonts','maxLength','maxLines'].some(key=>object[key]!==undefined)||object.required!==undefined&&object.type==='text')required.add('customer-fields');
  }
 }
 if(profile.customerOptions)required.add('customer-options');
 return [...required];
}
export function runtimeForDescription(html){
 // Require an actual script src, not a filename in prose, comments or data attributes.
 const source=String(html);
 const urls=[];
 // Small conservative HTML tokenizer (also usable in an App Home worker).
 // Consume complete tags/quoted attributes and skip raw text and inert trees.
 const tags=/<!--[\s\S]*?(?:-->|$)|<\/?([a-z][\w:-]*)\b((?:"[^"]*"|'[^']*'|[^'">])*)>/gi;
 let inert=0,match;
 while((match=tags.exec(source))){
  if(!match[1])continue;
  const name=match[1].toLowerCase(),closing=match[0].startsWith('</');
  if(name==='template'||name==='noscript'){inert+=closing?-1:1;inert=Math.max(0,inert);continue;}
  if(closing)continue;
  const attrs=new Map();
  for(const a of match[2].matchAll(/([^\s=/'"<>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)){
   const key=a[1].toLowerCase();if(!attrs.has(key))attrs.set(key,a[2]??a[3]??a[4]??'');
  }
  if(name==='script'&&!inert&&!attrs.has('nomodule')&&['','text/javascript','application/javascript'].includes((attrs.get('type')||'').toLowerCase())){
   try{const u=new URL((attrs.get('src')||'').replace(/&amp;/g,'&'));if(u.pathname.includes('gravuru-model-launcher')){u.search='';u.hash='';urls.push(u.href);}}catch{}
  }
  if(['script','style','textarea','title','xmp','iframe','noembed','plaintext'].includes(name)){
   const end=new RegExp('</'+name+'\\s*>','gi');end.lastIndex=tags.lastIndex;const close=end.exec(source);tags.lastIndex=close?end.lastIndex:source.length;
  }
 }
 if(urls.length!==1)throw Error('Der Shop ist noch nicht eindeutig mit einer geprüften Kundenversion verbunden. Der Entwurf bleibt gespeichert.');
 const release=RUNTIME_RELEASES.find(r=>r.artifacts[0].url===urls[0]);
 if(!release)throw Error('Diese Kundenversion ist noch nicht für die Veröffentlichung geprüft. Der Entwurf bleibt gespeichert.');
 return release;
}
export function checkRuntimeCompatibility(profile,description){
 const release=runtimeForDescription(description);
 if(profile.kind!==release.kind||profile.schemaVersion!==release.schemaVersion)throw Error('Produkttyp oder Schema wird von dieser Kundenversion nicht unterstützt.');
 const missing=requiredCapabilities(profile).filter(c=>!release.capabilities.includes(c));
 if(missing.length)throw Error('Die Kundenversion unterstützt diese Funktionen noch nicht: '+missing.join(', ')+'. Der Entwurf bleibt gespeichert.');
 for(const d of profile.designs||[])for(const o of d.objects||[])if(o.type==='motif'&&!release.motifIds.includes(o.motif))throw Error('Dieses Motiv ist für die Kundenversion noch nicht bestätigt: '+o.motif+'. Bitte zuerst die Medienzuordnung prüfen.');
 // The current customer importer has a 2 MB ceiling. Check the largest editable
 // design envelope, not the full catalogue, which is not a customer draft.
 for(const d of profile.designs||[]){
  const draft={schema:'gravuru-funkklingel-muster/v2',motifBoundsVersion:1,profileId:profile.id,profileRevision:profile.revision,state:{designId:d.id,objects:d.objects}};
  if(new TextEncoder().encode(JSON.stringify(draft,null,2)).length>DRAFT_FILE_MAX_BYTES-4096)throw Error('Der bearbeitbare Entwurf überschreitet die Dateigrenze der Kundenversion.');
 }
 return release;
}
export async function assertRuntimeCompatibility(profile,description){
 const release=checkRuntimeCompatibility(profile,description);
 for(const artifact of release.artifacts){
  const response=await fetch(artifact.url,{cache:'no-store'});
  if(!response.ok)throw Error('Die Kundenversion konnte nicht geprüft werden. Es wurde nichts veröffentlicht.');
  const bytes=await response.arrayBuffer();
  const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');
  if(hash!==artifact.sha256)throw Error('Die Kundenversion wurde verändert und muss erneut geprüft werden. Es wurde nichts veröffentlicht.');
 }
 return release;
}
