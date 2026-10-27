import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {patchMemorialCartUX,patchMemorialCartIndex} from '../legacy-patches/memorial-cart-edit-compat.mjs';
import {patchPreviewManifest} from '../legacy-patches/memorial-editor-compat.mjs';
const args=process.argv.slice(2),arg=k=>args[args.indexOf(k)+1],sha=b=>createHash('sha256').update(b).digest('hex');
for(const k of ['--preview','--runtime','--out'])if(!args.includes(k))throw Error(k+' fehlt.');
const preview=fs.realpathSync(arg('--preview')),runtime=fs.realpathSync(arg('--runtime')),out=path.resolve(arg('--out')),apply=args.includes('--apply'),backup=args.includes('--backup')?path.resolve(arg('--backup')):null;
const inside=(a,b)=>a===b||a.startsWith(b+path.sep);
if(fs.existsSync(out)||inside(out,preview)||inside(out,runtime))throw Error('Neue unabhängige private Ausgabe erforderlich.');
if(apply&&(!backup||fs.existsSync(backup)||inside(backup,preview)||inside(backup,runtime)||inside(backup,out)||inside(out,backup)))throw Error('Neue unabhängige Sicherung erforderlich.');
const models=JSON.parse(fs.readFileSync(path.join(preview,'models.json'))),binding=JSON.parse(fs.readFileSync(path.join(preview,'commerce.json')));
if(models.length!==1||models[0].universal?.profile.id!=='P-f087d73f-b29e-43f8-ba1e-543d1daa95a8'||String(models[0].universal.profile.revision)!=='30'||binding.productId!=='gid://shopify/Product/16138083107196'||String(binding.shopifyPricingRevision)!=='31')throw Error('Ungeprüfter Produkt-/Preisstand.');
const plans=[];
function add(scope,root,rel,patch){
 let cursor=root;for(const part of rel.split('/')){cursor=path.join(cursor,part);if(fs.existsSync(cursor)&&fs.lstatSync(cursor).isSymbolicLink())throw Error('Symlink nicht erlaubt.');}
 const file=path.join(root,rel),before=fs.existsSync(file)?fs.readFileSync(file):null;
 const after=Buffer.from(patch(before?.toString('utf8')).replace(/\r\n/g,'\n'));
 plans.push({scope,rel,file,before,after,mode:before?fs.statSync(file).mode:0o644});
}
add('preview',preview,'index.html',patchMemorialCartIndex);
for(const [scope,root] of [['preview',preview],['runtime',runtime]]){
 add(scope,root,'configurator/variant-m/ux.mjs',patchMemorialCartUX);
 add(scope,root,'configurator/variant-m/legacy-cart-restore.mjs',old=>{if(old!==undefined)throw Error('Modul bereits vorhanden.');return fs.readFileSync(new URL('../app/configurator/variant-m/legacy-cart-restore.mjs',import.meta.url),'utf8');});
}
const manifestFile=preview+'.json';if(fs.lstatSync(manifestFile).isSymbolicLink())throw Error('Manifest-Symlink nicht erlaubt.');
const before=fs.readFileSync(manifestFile);
const after=Buffer.from(JSON.stringify(patchPreviewManifest(JSON.parse(before),plans.filter(p=>p.scope==='preview').map(p=>({path:p.rel,before:p.before===null?null:sha(p.before),beforeBytes:p.before?.length,after:sha(p.after),bytes:p.after.length}))),null,2)+'\n');
plans.push({scope:'preview',rel:'preview-manifest.json',file:manifestFile,before,after,mode:fs.statSync(manifestFile).mode});
fs.mkdirSync(out,{recursive:true,mode:0o700});
for(const p of plans){const dest=path.join(out,p.scope,p.rel);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,p.after,{flag:'wx',mode:0o600});if(dest.endsWith('.mjs')&&spawnSync(process.execPath,['--check',dest],{encoding:'utf8'}).status!==0)throw Error('Syntaxfehler: '+p.rel);}
const report={schema:'gravuru-memorial-cart-edit-repair/v1',applied:false,designsChanged:false,priceChanged:false,databasesOpened:false,files:plans.map(p=>({scope:p.scope,path:p.rel,before:p.before===null?null:sha(p.before),after:sha(p.after)}))};
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
if(apply){
 for(const p of plans)if(p.before===null?fs.existsSync(p.file):sha(fs.readFileSync(p.file))!==sha(p.before))throw Error('Gleichzeitige Änderung: '+p.rel);
 fs.mkdirSync(backup,{recursive:true,mode:0o700});
 for(const p of plans)if(p.before){const dest=path.join(backup,p.scope,p.rel);fs.mkdirSync(path.dirname(dest),{recursive:true,mode:0o700});fs.writeFileSync(dest,p.before,{flag:'wx',mode:0o600});}
 fs.writeFileSync(path.join(backup,'report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 const changed=[];
 try{
  for(const p of plans){const next=p.file+'.cart-edit-next';fs.writeFileSync(next,p.after,{flag:'wx',mode:p.mode});fs.renameSync(next,p.file);changed.push(p);}
  for(const p of plans)if(sha(fs.readFileSync(p.file))!==sha(p.after))throw Error('Rückprüfung fehlgeschlagen.');
  report.applied=true;fs.writeFileSync(path.join(backup,'APPLIED.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 }catch(error){for(const p of changed.reverse()){if(sha(fs.readFileSync(p.file))!==sha(p.after))throw Error('Gleichzeitige Änderung verhindert Rücknahme.');if(p.before===null)fs.unlinkSync(p.file);else{const next=p.file+'.cart-edit-rollback';fs.writeFileSync(next,p.before,{flag:'wx',mode:p.mode});fs.renameSync(next,p.file);}}throw error;}
}
console.log(JSON.stringify({applied:report.applied,files:plans.length,designsChanged:false,priceChanged:false,databasesOpened:false}));
