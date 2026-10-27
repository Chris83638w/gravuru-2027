import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {patchMemorialUX,patchMemorialCommerce,patchMemorialMeasurement,patchMemorialValidation} from '../legacy-patches/memorial-editor-compat.mjs';
const args=process.argv.slice(2),value=k=>args[args.indexOf(k)+1],sha=b=>createHash('sha256').update(b).digest('hex');
for(const k of ['--runtime','--out'])if(!args.includes(k))throw Error(k+' fehlt.');
const root=fs.realpathSync(value('--runtime')),out=path.resolve(value('--out')),backup=args.includes('--backup')?path.resolve(value('--backup')):null;
if(fs.existsSync(out)||out===root||out.startsWith(root+path.sep))throw Error('Neue private Ausgabe außerhalb der Laufzeit erforderlich.');
const edits=[['configurator/variant-m/ux.mjs',patchMemorialUX],['configurator/variant-m/commerce.mjs',patchMemorialCommerce],['platform/sources/app/shared/models/doorbell-preview.mjs',patchMemorialMeasurement],['platform/sources/app/shared/models/design-content.mjs',patchMemorialValidation]];
const plans=edits.map(([name,patch])=>{const file=path.join(root,name);if(fs.lstatSync(file).isSymbolicLink())throw Error('Symlink nicht erlaubt.');const before=fs.readFileSync(file);return {name,file,before,after:Buffer.from(patch(before.toString('utf8')).replace(/\r\n/g,'\n')),mode:fs.statSync(file).mode};});
const name='configurator/variant-m/commerce-status.mjs',file=path.join(root,name);if(fs.existsSync(file))throw Error('Statusmodul bereits vorhanden.');
plans.push({name,file,before:null,after:fs.readFileSync(new URL('../app/configurator/variant-m/commerce-status.mjs',import.meta.url)),mode:0o644});
fs.mkdirSync(out,{recursive:true,mode:0o700});
for(const p of plans){const target=path.join(out,p.name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,p.after,{flag:'wx'});if(spawnSync(process.execPath,['--check',target],{encoding:'utf8'}).status!==0)throw Error('Syntaxfehler: '+p.name);}
const manifest={schema:'gravuru-memorial-runtime-repair/v1',applied:false,files:plans.map(p=>({path:p.name,before:p.before===null?null:sha(p.before),after:sha(p.after)})),restartRequired:true};
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
if(args.includes('--apply')){
 if(!backup||fs.existsSync(backup)||backup===root||backup.startsWith(root+path.sep))throw Error('Neue private Sicherung erforderlich.');
 for(const p of plans)if(p.before===null?fs.existsSync(p.file):sha(fs.readFileSync(p.file))!==sha(p.before))throw Error('Gleichzeitige Änderung: '+p.name);
 fs.mkdirSync(backup,{recursive:true,mode:0o700});
 for(const p of plans)if(p.before){const dest=path.join(backup,p.name);fs.mkdirSync(path.dirname(dest),{recursive:true,mode:0o700});fs.writeFileSync(dest,p.before,{flag:'wx',mode:0o600});}
 const changed=[];try{for(const p of plans){const next=p.file+'.memorial-next';fs.writeFileSync(next,p.after,{flag:'wx',mode:p.mode});fs.renameSync(next,p.file);changed.push(p);}for(const p of plans)if(sha(fs.readFileSync(p.file))!==sha(p.after))throw Error('Rückprüfung fehlgeschlagen.');manifest.applied=true;fs.writeFileSync(path.join(backup,'APPLIED.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx',mode:0o600});}
 catch(error){for(const p of changed.reverse()){if(sha(fs.readFileSync(p.file))!==sha(p.after))throw Error('Gleichzeitige Änderung verhindert Rücknahme.');if(p.before===null)fs.unlinkSync(p.file);else{const next=p.file+'.memorial-rollback';fs.writeFileSync(next,p.before,{flag:'wx',mode:p.mode});fs.renameSync(next,p.file);}}throw error;}
}
console.log(JSON.stringify(manifest));
