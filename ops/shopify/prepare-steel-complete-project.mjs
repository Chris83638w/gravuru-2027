// Reconstruct the active Theme extension only from its read-only remote snapshot
// and assets whose bytes match that snapshot. Local-only: no deploy/network.
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';
const [snapshotFile,sourceProject,assetDirectory,destination]=process.argv.slice(2).map(p=>path.resolve(p));
if(!snapshotFile||!sourceProject||!assetDirectory||!destination||fs.existsSync(destination))throw Error('New destination required');
const snapshot=JSON.parse(fs.readFileSync(snapshotFile)),modules=snapshot.appModuleVersions;
const theme=modules.find(m=>m.registrationTitle==='gravuru-storefront'),fn=modules.find(m=>m.registrationTitle==='gravuru-personalization-price');
if(theme?.registrationId!=='a4d6506c-8e89-ca7d-f5b1-1a0d1e00a1f9bb93e76a'||fn?.registrationId!=='3194be17-ee65-e144-e1da-65b8d1e1720183f0f9ef')throw Error('Extension identity changed');
const files=theme.config.theme_extension.files,checked=[];
for(const [dir,entries] of Object.entries(files)){
 if(!['assets','blocks','snippets','locales'].includes(dir))throw Error('Unexpected theme directory');
 for(const [name,entry] of Object.entries(entries)){
  if(!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,150}$/.test(name))throw Error('Unexpected theme filename');
  let bytes;
  if(typeof entry.value==='string')bytes=Buffer.from(entry.value,'utf8');
  else{
   if(dir!=='assets'||!Number.isSafeInteger(entry.size)||!/^[A-Za-z0-9+/]{43}=$/.test(entry.sha256||''))throw Error('Unexpected theme asset metadata');
   bytes=fs.readFileSync(path.join(assetDirectory,name));
   if(bytes.length!==entry.size||createHash('sha256').update(bytes).digest('base64')!==entry.sha256)throw Error('Theme asset differs: '+name);
  }
  checked.push({file:dir+'/'+name,bytes,sha256:createHash('sha256').update(bytes).digest('hex')});
 }
}
const wasm=fs.readFileSync(path.join(sourceProject,'extensions/gravuru-personalization-price/dist/function.wasm'));
if(createHash('sha256').update(wasm).digest('hex')!=='a5c59354755dcf73bdeca8006134847549d8712f70277634fab405db93532da2')throw Error('Function artifact changed');
fs.mkdirSync(destination,{recursive:true});
for(const item of ['shopify.app.toml','package.json','extensions'])fs.cpSync(path.join(sourceProject,item),path.join(destination,item),{recursive:true,errorOnExist:true,force:false});
const dir=path.join(destination,'extensions/gravuru-storefront');fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(path.join(dir,'shopify.extension.toml'),`name = "gravuru-storefront"\ntype = "theme"\nuid = "${theme.registrationId}"\n`);
for(const f of checked){const p=path.join(dir,f.file);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,f.bytes);}
const locale=fn.config.localization;
if(locale?.default_locale!=='en'||!locale.translations?.en||Object.keys(locale.translations).length!==1)throw Error('Function locales need review');
const locales=path.join(destination,'extensions/gravuru-personalization-price/locales');fs.mkdirSync(locales,{recursive:true});fs.writeFileSync(path.join(locales,'en.default.json'),JSON.stringify(locale.translations.en));
const proof={schema:'gravuru-complete-pricing-input-project/v1',noDeployment:true,themeSource:'active remote snapshot plus SHA256-verified bytes',themeFiles:checked.map(({bytes,...f})=>({...f,bytes:bytes.length})),wasmSha256:createHash('sha256').update(wasm).digest('hex'),extensionUids:[theme.registrationId,fn.registrationId]};
fs.writeFileSync(path.join(destination,'complete-project-proof.json'),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify({prepared:true,themeFiles:checked.length,destination,noDeployment:true}));
