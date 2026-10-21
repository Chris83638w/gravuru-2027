import {request} from './motifs.mjs';
import {validateDesignContent,DESIGN_LIMITS,validContentId} from './design-content.mjs';
import {publicationSnapshot,assertRuntimeCompatibility} from './runtime-contract.mjs';
import {uploadConfiguration} from './doorbell-release.mjs';
import {mountingAccessIssues} from './mounting-access.mjs';
export const TYPE='gravuru_configurator';
export const LIST=`query Doorbells($after:String){metaobjects(type:"gravuru_configurator",first:50,after:$after){nodes{id handle updatedAt fields{key value}} pageInfo{hasNextPage endCursor}}}`;
export const ONE=`query Doorbell($handle:MetaobjectHandleInput!){metaobjectByHandle(handle:$handle){id handle updatedAt fields{key value}}}`;
export const SAVE=`mutation SaveDoorbell($handle:MetaobjectHandleInput!,$metaobject:MetaobjectUpsertInput!){metaobjectUpsert(handle:$handle,metaobject:$metaobject){metaobject{id} userErrors{field message}}}`;
export const PRODUCT=`query DoorbellProduct($id:ID!){product(id:$id){id handle descriptionHtml}}`;
export const PUBLISH=`mutation PublishDoorbell($product:ProductUpdateInput!){productUpdate(product:$product){product{id descriptionHtml} userErrors{field message}}}`;
export function decode(n){const f=Object.fromEntries(n.fields.map(x=>[x.key,x.value]));return {...n,profile:JSON.parse(f.configuration),name:f.name};}
export async function listDoorbells(){const rows=[];let after=null;const seen=new Set();do{const d=(await request(LIST,{after})).metaobjects;rows.push(...d.nodes.map(decode).filter(n=>n.profile.kind==='layered-doorbell'));if(!d.pageInfo.hasNextPage)break;after=d.pageInfo.endCursor;if(!after||seen.has(after))throw Error('Unvollständige Modellliste.');seen.add(after);}while(true);return rows.sort((a,b)=>a.name.localeCompare(b.name,'de'));}
export function validateProfile(p,original,{extraFontIds=[]}={}){
 if(!p||!original||!validContentId(p.id))throw Error('Ungültige Produktkennung.');
 for(const key of ['frames','materials','mounting','manufacturing'])if(JSON.stringify(p[key])!==JSON.stringify(original[key]))throw Error('Material, Rahmen und Montagegeometrie dürfen hier nicht verändert werden.');
 for(const key of Object.keys(original.features))if(key!=='motifsAllowed'&&p.features[key]!==original.features[key])throw Error('Diese Grundfunktion ist fest mit dem Modell verbunden.');
 if(typeof p.features.motifsAllowed!=='boolean')throw Error('Ungültige Motiveinstellung.');
 const choices={frameKeys:p.frames.map(f=>f.key),colorKeys:p.materials.acrylic.colors.map(c=>c.key),mountingKeys:p.mounting.options.map(m=>m.key),designIds:p.designs.map(d=>d.id)};
 for(const [key,list] of Object.entries(p.customerOptions||{})){if(!choices[key]||!Array.isArray(list)||!list.length||new Set(list).size!==list.length||list.some(v=>!choices[key].includes(v)))throw Error('Ungültige Kundenauswahl: '+key);}
 for(const frameKey of p.customerOptions?.frameKeys||choices.frameKeys)for(const mountingKey of p.customerOptions?.mountingKeys||choices.mountingKeys){const issue=mountingAccessIssues(p,{frameKey,mountingKey})[0];if(issue)throw Error('Rahmen '+frameKey+' / Befestigung '+mountingKey+': '+issue.message);}
 if(p.id!==original.id||JSON.stringify(p.binding)!==JSON.stringify(original.binding)||JSON.stringify(p.geometry)!==JSON.stringify(original.geometry)||JSON.stringify(p.purchasing)!==JSON.stringify(original.purchasing))throw Error('Produktzuordnung, Preise und Fertigungsgeometrie dürfen hier nicht verändert werden.');
 if(!p.name?.trim()||p.name.length>200)throw Error('Bitte einen Namen mit höchstens 200 Zeichen vergeben.');
 if(!p.designs?.length||p.designs.length>60||new Set(p.designs.map(d=>d.id)).size!==p.designs.length)throw Error('Bitte 1 bis 60 eindeutig benannte Designs verwenden.');
 const ids=new Set();for(const d of p.designs){validateDesignContent(d,{extraFontIds});if(!d.name?.trim()||!d.objects?.length||d.objects.length>DESIGN_LIMITS.maxObjects)throw Error('Jedes Design braucht einen Namen und mindestens ein Element.');ids.clear();for(const o of d.objects){if(!o.id||ids.has(o.id))throw Error('Doppelte Element-ID.');ids.add(o.id);if(o.type==='text'&&(!o.text?.trim()||o.text.length>DESIGN_LIMITS.maxTextLength))throw Error('Text fehlt oder ist zu lang.');if(!['x','y','w','h','rotation'].every(k=>Number.isFinite(o[k]))||o.w<=0||o.h<=0)throw Error('Ungültige Elementmaße.');const a=Math.abs(o.rotation*Math.PI/180),w=Math.abs(o.w*Math.cos(a))+Math.abs(o.h*Math.sin(a)),h=Math.abs(o.w*Math.sin(a))+Math.abs(o.h*Math.cos(a));const b=p.geometry.bell;if(o.x-w/2<10||o.x+w/2>150||o.y-h/2<10||o.y+h/2>270)throw Error(d.name+': Ein Element liegt außerhalb der gemeinsamen Gestaltungsfläche.');if(Math.min(o.x+w/2,b.x+b.width)-Math.max(o.x-w/2,b.x)>.1&&Math.min(o.y+h/2,b.y+b.height)-Math.max(o.y-h/2,b.y)>.1)throw Error(d.name+': Ein Element überlappt die Klingel.');}}
 return p;
}
export async function saveDoorbell(row,draft){validateProfile(draft,row.profile);const handle={type:TYPE,handle:row.handle};const fresh=decode((await request(ONE,{handle})).metaobjectByHandle);if(fresh.updatedAt!==row.updatedAt)throw Error('Zwischenzeitlich geändert. Bitte neu laden, damit keine Änderung überschrieben wird.');const p=structuredClone(draft);p.admin={...p.admin,draftRevision:crypto.randomUUID(),savedAt:new Date().toISOString()};const fields=[{key:'name',value:p.name},{key:'revision',value:p.admin.draftRevision},{key:'configuration',value:JSON.stringify(p)}];const result=(await request(SAVE,{handle,metaobject:{fields}})).metaobjectUpsert;if(result.userErrors?.length)throw Error(result.userErrors.map(x=>x.message).join(' · '));const saved=decode((await request(ONE,{handle})).metaobjectByHandle);if(saved.profile.admin.draftRevision!==p.admin.draftRevision)throw Error('Speichern konnte nicht bestätigt werden.');return saved;}
export async function publishDoorbell(row){
 const handle={type:TYPE,handle:row.handle};const fresh=decode((await request(ONE,{handle})).metaobjectByHandle);if(fresh.updatedAt!==row.updatedAt)throw Error('Zwischenzeitlich geändert. Bitte neu laden.');
 if(JSON.stringify(fresh.profile)!==JSON.stringify(row.profile))throw Error('Der Entwurf enthält ungespeicherte Änderungen. Bitte zuerst speichern und neu laden.');
 const p=structuredClone(fresh.profile);validateProfile(p,fresh.profile);const active=publicationSnapshot(p);
 const product=(await request(PRODUCT,{id:p.binding.productId})).product;if(!product||product.handle!==p.binding.handle)throw Error('Die Shopify-Zuordnung stimmt nicht mehr.');
 const runtime=await assertRuntimeCompatibility(active,product.descriptionHtml);
 active.runtimeContract={id:runtime.id,artifacts:runtime.artifacts.map(a=>({...a}))};
 const file=await uploadConfiguration(active);
 const check=decode((await request(ONE,{handle})).metaobjectByHandle);if(check.updatedAt!==row.updatedAt)throw Error('Während der Dateivorbereitung geändert. Bitte neu laden.');
 const current=(await request(PRODUCT,{id:p.binding.productId})).product;if(current.descriptionHtml!==product.descriptionHtml)throw Error('Die Artikelseite wurde zwischenzeitlich geändert. Bitte erneut veröffentlichen.');
 const safe=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const marker='<div id="gravuru-published-profile" hidden data-profile-url="'+safe(file.url)+'" data-revision="'+safe(active.revision)+'"></div>';
 const descriptionHtml=product.descriptionHtml.replace(/<div\s+id="gravuru-published-profile"[^>]*><\/div>/g,'')+marker;
 const result=(await request(PUBLISH,{product:{id:product.id,descriptionHtml}})).productUpdate;
 if(result.userErrors?.length)throw Error(result.userErrors.map(x=>x.message).join(' · '));if(!result.product?.descriptionHtml.includes('data-profile-url="'+safe(file.url)+'"'))throw Error('Veröffentlichung konnte nicht bestätigt werden.');
 p.admin.previousPublishedProfile=p.admin.publishedProfile;p.admin.previousPublishedFile=p.admin.publishedFile;p.admin.publishedProfile=active;p.admin.publishedFile=file;p.admin.publishedRevision=active.revision;p.admin.publishedAt=new Date().toISOString();
 let saveError;
 try{const saved=(await request(SAVE,{handle,metaobject:{fields:[{key:'configuration',value:JSON.stringify(p)}]}})).metaobjectUpsert;if(saved.userErrors?.length)saveError=saved.userErrors.map(x=>x.message).join(' · ');}catch(e){saveError=e instanceof Error?e.message:String(e);}
 // A network failure may occur after a successful save: read back before deciding to roll back.
 let verified;try{verified=decode((await request(ONE,{handle})).metaobjectByHandle);}catch(e){throw Error('Die Shopdatei wurde übernommen, der Verwaltungsstatus konnte nicht geprüft werden. Bitte neu laden und vor einer weiteren Veröffentlichung prüfen.');}
 if(verified.profile.admin.publishedRevision===active.revision&&verified.profile.admin.publishedFile?.url===file.url)return verified;
 const live=(await request(PRODUCT,{id:product.id})).product;
 if(live.descriptionHtml===result.product.descriptionHtml){const rollback=(await request(PUBLISH,{product:{id:product.id,descriptionHtml:product.descriptionHtml}})).productUpdate;if(!rollback.userErrors?.length&&rollback.product?.descriptionHtml===product.descriptionHtml)throw Error('Die Veröffentlichung wurde zurückgenommen, weil der Verwaltungsstatus nicht gespeichert werden konnte. Die vorherige Kundenversion bleibt aktiv. '+(saveError||''));}
 throw Error('Die Shopdatei wurde übernommen, der Verwaltungsstatus ist unvollständig. Bitte die Kundenversion prüfen und neu laden. '+(saveError||''));
}

