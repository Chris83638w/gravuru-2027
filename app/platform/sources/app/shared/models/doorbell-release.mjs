import {request} from './motifs.mjs';
export const STAGE=`mutation StageConfiguration($input:[StagedUploadInput!]!){stagedUploadsCreate(input:$input){stagedTargets{url resourceUrl parameters{name value}} userErrors{field message}}}`;
export const CREATE_FILE=`mutation ConfigurationFile($files:[FileCreateInput!]!){fileCreate(files:$files){files{id fileStatus ... on GenericFile{url}} userErrors{field message}}}`;
export const FILE_STATUS=`query ConfigurationFileStatus($id:ID!){node(id:$id){... on GenericFile{id url fileStatus}}}`;
function errors(result){if(result.userErrors?.length)throw Error(result.userErrors.map(e=>e.message).join(' · '));}
export async function uploadConfiguration(profile){
 const text=JSON.stringify(profile),filename='gravuru-config-'+profile.id.replace(/[^a-zA-Z0-9-]/g,'-')+'-'+crypto.randomUUID()+'.json';
 const staged=(await request(STAGE,{input:[{resource:'FILE',filename,mimeType:'application/json',httpMethod:'POST'}]})).stagedUploadsCreate;errors(staged);
 const target=staged.stagedTargets?.[0];if(!target?.url||!target.resourceUrl)throw Error('Shopify hat keinen Upload bereitgestellt.');
 const body=new FormData();for(const p of target.parameters)body.append(p.name,p.value);body.append('file',new Blob([text],{type:'application/json'}),filename);
 const uploaded=await fetch(target.url,{method:'POST',body});if(!uploaded.ok)throw Error('Die Konfigurationsdatei konnte nicht hochgeladen werden. Die Kundenversion ist unverändert.');
 const created=(await request(CREATE_FILE,{files:[{originalSource:target.resourceUrl,filename,contentType:'FILE',duplicateResolutionMode:'RAISE_ERROR',alt:profile.name+' · Konfiguration '+profile.revision}]})).fileCreate;errors(created);
 let file=created.files?.[0];if(!file?.id)throw Error('Die Dateianlage konnte nicht bestätigt werden.');
 for(let i=0;i<20&&file.fileStatus!=='READY';i++){if(file.fileStatus==='FAILED')throw Error('Shopify konnte die Konfigurationsdatei nicht verarbeiten.');await new Promise(r=>setTimeout(r,500));file=(await request(FILE_STATUS,{id:file.id})).node;}
 if(file?.fileStatus!=='READY'||!file.url)throw Error('Shopify verarbeitet die Datei noch. Bitte später erneut veröffentlichen.');
 const url=new URL(file.url);if(url.protocol!=='https:'||url.hostname!=='cdn.shopify.com')throw Error('Unerwartete Shopify-Dateiadresse.');
 const check=await fetch(file.url);if(!check.ok||await check.text()!==text)throw Error('Die veröffentlichte Datei stimmt nicht mit dem Entwurf überein.');
 return {id:file.id,url:file.url};
}
