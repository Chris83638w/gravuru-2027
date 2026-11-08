import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const output=process.argv[2];
if(!output||!path.isAbsolute(output)||fs.existsSync(output))throw Error('A new absolute package directory is required.');
const base='044494a06b05571364e57dffc83b8a0a4458050d';
const files=[
 'app/workshop/gallery-shop-sync-transport.mjs','app/workshop/gallery-shop-sync.mjs','app/workshop/shop-product-binding-store.mjs',
 'scripts/lib/gallery-production-activation.mjs','scripts/lib/gallery-production-module-target.mjs','scripts/lib/gallery-production-shopify-read.mjs',
 'scripts/lib/gallery-production-preview-mount.mjs','ops/plesk/module-activation-preview-config.mjs'
];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const git=args=>{const result=spawnSync('git',args,{cwd:root,maxBuffer:128*1024*1024});if(result.status)throw Error('Git source lookup failed: '+args.join(' '));return result.stdout;};
const write=(relative,bytes)=>{const file=path.join(output,relative);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes);};
const entries=[];
for(const relative of files){
 const bytes=fs.readFileSync(path.join(root,relative));write('overlay/'+relative,bytes);
 const exists=spawnSync('git',['cat-file','-e',base+':'+relative],{cwd:root}).status===0;
 let before=null;
 if(exists){const old=git(['show',base+':'+relative]);write('before/'+relative,old);before={bytes:old.length,sha256:hash(old)};}
 entries.push({path:relative,before,after:{bytes:bytes.length,sha256:hash(bytes)}});
}
const customerPaths=git(['ls-tree','-r','--name-only',base,'--','app/configurator','app/workshop/ui']).toString('utf8').trim().split('\n');
const customer=[];
for(const relative of customerPaths){const before=git(['show',base+':'+relative]),after=fs.readFileSync(path.join(root,relative));if(!before.equals(after))throw Error('Protected UI differs: '+relative);customer.push({path:relative,sha256:hash(after)});}
const wrapper="export {configureGalleryManagement} from './runtime-v2/ops/plesk/module-activation-preview-config.mjs';\n";
write('external/gallery-module-activation-preview.mjs',wrapper);
const manifest={schema:'gravuru-private-module-preview-patch/v1',baseRuntimeCommit:base,sourceCommit:git(['rev-parse','HEAD']).toString().trim(),
 executionEnabled:false,writesEnabled:false,productAssignments:0,customerRuntimeChanged:false,
 sourceGallery:'/var/www/vhosts/gravuru-designwerkstatt.de/private/gesamtbestand-stage-0bb50565-20261106-v1/gallery-4',
 managementFilename:'/var/www/vhosts/gravuru-designwerkstatt.de/private/mika-module-connect-20261108-v2/module-management.sqlite',
 journalFilename:'/var/www/vhosts/gravuru-designwerkstatt.de/private/mika-module-connect-20261108-v2/module-shop-sync-preview.sqlite',
 targetFilename:'/var/www/vhosts/gravuru-designwerkstatt.de/private/acryl-employee-20261021-v1/data/workshop.sqlite',
 runtimeDirectory:'/var/www/vhosts/gravuru-designwerkstatt.de/private/mika-module-connect-20261108-v2/runtime-v2',
 externalWrapper:{path:'external/gallery-module-activation-preview.mjs',bytes:Buffer.byteLength(wrapper),sha256:hash(wrapper)},
 files:entries,protectedCustomerFiles:customer.length,protectedCustomerManifestSha256:hash(JSON.stringify(customer)),requiresExistingIdentityFiles:true};
write('manifest.json',JSON.stringify(manifest,null,2)+'\n');write('protected-ui-sha256.json',JSON.stringify(customer,null,2)+'\n');
write('README.md',fs.readFileSync(new URL('./README.md',import.meta.url)));
const archive=output+'.tar.gz';
const tar=spawnSync('tar',['-czf',archive,'-C',output,'overlay','before','external','manifest.json','protected-ui-sha256.json','README.md'],{encoding:'utf8'});
if(tar.status)throw Error(tar.stderr);
const artifact={schema:'gravuru-private-module-preview-artifact/v1',archive:path.basename(archive),bytes:fs.statSync(archive).size,sha256:hash(fs.readFileSync(archive)),manifestSha256:hash(fs.readFileSync(path.join(output,'manifest.json'))),files:entries.length,protectedCustomerFiles:customer.length};
fs.writeFileSync(output+'.artifact.json',JSON.stringify(artifact,null,2)+'\n');console.log(JSON.stringify(artifact));
