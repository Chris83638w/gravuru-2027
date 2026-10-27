import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {patchMemorialUX,patchMemorialMeasurement,patchMemorialValidation,patchMemorialCommerce,completeMemorialModels,patchPreviewManifest} from '../legacy-patches/memorial-editor-compat.mjs';
const root=fileURLToPath(new URL('..',import.meta.url));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const args=process.argv.slice(2),value=flag=>{const i=args.indexOf(flag);return i<0?null:args[i+1];};
const preview=value('--preview'),fontFile=value('--font'),python=value('--python'),out=value('--out'),backup=value('--backup');
if(!preview||!fontFile||!python||!out)throw Error('Benötigt: --preview ORDNER --font TTF --python PYTHON --out NEUER_ORDNER [--manifest PRIVATE_JSON] [--apply --backup NEUER_ORDNER]');
const target=fs.realpathSync(preview),output=path.resolve(out),manifestFile=value('--manifest');
if(args.includes('--apply')&&!manifestFile)throw Error('--apply benötigt das private --manifest.');
if(manifestFile&&(path.resolve(manifestFile)!==target+'.json'||fs.lstatSync(manifestFile).isSymbolicLink()))throw Error('Manifest muss die private Datei neben dem Vorschauordner sein.');
if(fs.existsSync(output)||output===target||output.startsWith(target+path.sep))throw Error('Ausgabe muss neu und außerhalb der Vorschau sein.');
if(sha(fs.readFileSync(fontFile))!=='55c03314cc754e26f741f97890e5e9cbe3b3278fe3abcecfecafd60111b2643d')throw Error('Nicht die geprüfte Katalog-Originalschrift.');
const converted=spawnSync(python,[path.join(root,'app/workshop/font-import.py')],{input:JSON.stringify({bytes:fs.readFileSync(fontFile).toString('base64')}),encoding:'utf8',maxBuffer:12*1024*1024});
if(converted.status!==0)throw Error('Originalschrift konnte nicht vollständig eingelesen werden.');
const imported=JSON.parse(converted.stdout.trim());if(imported.missingGlyphs?.length)throw Error('Grundzeichensatz der Originalschrift unvollständig.');
const plans=[],read=rel=>{const f=path.join(target,rel);if(fs.lstatSync(f).isSymbolicLink())throw Error('Symlink im Vorschaupaket.');return fs.readFileSync(f);};
function change(rel,fn){const before=read(rel),after=Buffer.from(fn(before.toString('utf8')).replace(/\r\n/g,'\n'));plans.push({rel,before,after,mode:fs.statSync(path.join(target,rel)).mode});}
const models=JSON.parse(read('models.json')),completed=completeMemorialModels(models,imported);
if(models.length!==1||models[0].universal.profile.id!=='P-f087d73f-b29e-43f8-ba1e-543d1daa95a8'||String(models[0].universal.profile.revision)!=='30')throw Error('Unerwartetes Produkt oder geänderte Vorlagenrevision.');
change('models.json',()=>JSON.stringify(completed.models));
change('configurator/variant-m/ux.mjs',patchMemorialUX);
change('configurator/variant-m/commerce.mjs',patchMemorialCommerce);
change('platform/sources/app/shared/models/doorbell-preview.mjs',patchMemorialMeasurement);
change('platform/sources/app/shared/models/design-content.mjs',patchMemorialValidation);
const statusRel='configurator/variant-m/commerce-status.mjs';if(fs.existsSync(path.join(target,statusRel)))throw Error('Patch ist bereits vorhanden; zuerst Beleg prüfen.');
plans.push({rel:statusRel,before:null,after:fs.readFileSync(path.join(root,'app/configurator/variant-m/commerce-status.mjs')),mode:0o644});
if(manifestFile){const before=fs.readFileSync(manifestFile);const after=Buffer.from(JSON.stringify(patchPreviewManifest(JSON.parse(before),plans.map(p=>({path:p.rel,public:p.public!==false,before:p.before===null?null:sha(p.before),beforeBytes:p.before?.length,after:sha(p.after),bytes:p.after.length}))),null,2)+'\n');plans.push({rel:'preview-manifest.json',before,after,mode:fs.statSync(manifestFile).mode,target:manifestFile,public:false});}
fs.mkdirSync(output,{recursive:true,mode:0o700});
for(const p of plans){const dest=path.join(output,p.rel);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,p.after,{flag:'wx'});if(p.rel.endsWith('.mjs')){const checked=spawnSync(process.execPath,['--check',dest],{encoding:'utf8'});if(checked.status!==0)throw Error('Syntaxprüfung fehlgeschlagen: '+p.rel+' '+checked.stderr);}}
const manifest={schema:'gravuru-memorial-preview-repair/v1',productId:models[0].universal.profile.id,revision:30,font:imported.name,glyphs:imported.glyphCount,completedFaces:completed.faces,addedGlyphs:completed.added,files:plans.map(p=>({path:p.rel,public:p.public!==false,before:p.before===null?null:sha(p.before),after:sha(p.after)})),databasesOpened:false,pricesChanged:false,designsChanged:false,applied:false};
fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
if(args.includes('--apply')){
 if(!backup||fs.existsSync(backup)||path.resolve(backup).startsWith(target+path.sep))throw Error('Neue private Sicherung außerhalb der Vorschau erforderlich.');
 for(const p of plans){const current=(p.target||path.join(target,p.rel));if(p.before===null?fs.existsSync(current):sha(fs.readFileSync(current))!==sha(p.before))throw Error('Gleichzeitige Änderung: '+p.rel);}
 fs.mkdirSync(backup,{recursive:true,mode:0o700});
 for(const p of plans)if(p.before){const f=path.join(backup,p.rel);fs.mkdirSync(path.dirname(f),{recursive:true,mode:0o700});fs.writeFileSync(f,p.before,{flag:'wx',mode:0o600});}
 fs.writeFileSync(path.join(backup,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx',mode:0o600});
 const changed=[];
 try{for(const p of plans){const current=(p.target||path.join(target,p.rel)),next=current+'.repair-20261027-next';fs.writeFileSync(next,p.after,{flag:'wx',mode:p.mode});fs.renameSync(next,current);changed.push(p);}for(const p of plans)if(sha(fs.readFileSync((p.target||path.join(target,p.rel))))!==sha(p.after))throw Error('Rückprüfung fehlgeschlagen.');manifest.applied=true;fs.writeFileSync(path.join(backup,'APPLIED.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx',mode:0o600});}
 catch(error){for(const p of changed.reverse()){const current=(p.target||path.join(target,p.rel));if(sha(fs.readFileSync(current))!==sha(p.after))throw Error('Gleichzeitige Änderung verhindert automatische Rücknahme: '+p.rel);if(p.before===null)fs.unlinkSync(current);else{const previous=current+'.repair-20261027-rollback';fs.writeFileSync(previous,p.before,{flag:'wx',mode:p.mode});fs.renameSync(previous,current);}}throw error;}
}
console.log(JSON.stringify(manifest));
