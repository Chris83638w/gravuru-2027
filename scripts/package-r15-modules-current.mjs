import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';

const repo=process.cwd(),base='c7710dec6f2c4f6d0b36073ad2dc623fd5d5ac05';
const output=path.resolve(process.argv[2]||'outputs/r15-modules-current-20261108');
const stage=path.join(output,'package');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const git=(...args)=>execFileSync('git',['-C',repo,...args],{maxBuffer:32*1024*1024});
const files=[
 'app/configurator/variant-m/contract.mjs','app/configurator/variant-m/customer-rights.mjs',
 'app/configurator/variant-m/element-rights.mjs','app/configurator/variant-m/logo-upload.mjs',
 'app/configurator/variant-m/module-profile.mjs','app/configurator/variant-m/module-runtime.mjs',
 'app/configurator/variant-m/ux-model.mjs','app/configurator/variant-m/ux.mjs',
 'app/workshop/cart-personalization.mjs','app/workshop/shop-design-gallery.mjs',
 'app/workshop/shop-entry.mjs','app/workshop/shop-preparation.mjs',
];
const productionDelta=git('diff',base,'--name-only','--','app').toString().trim().split('\n').filter(p=>p&&!p.endsWith('.test.mjs'));
if(JSON.stringify([...productionDelta].sort())!==JSON.stringify([...files].sort()))throw Error('Unexpected runtime delta');
const put=(name,data)=>{const dest=path.join(stage,name);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,data);};
const baseFiles=new Set(git('ls-tree','-r','--name-only',base).toString().trim().split('\n'));
const entries=files.map(p=>{const after=fs.readFileSync(path.join(repo,p)),before=baseFiles.has(p)?git('show',base+':'+p):null;put('files/'+p,after);if(before)put('backup/'+p,before);return {path:p,beforeSha256:before?hash(before):null,afterSha256:hash(after),bytes:after.length};});
const protectedPaths=[...baseFiles].filter(p=>p.endsWith('.css')||p.startsWith('app/configurator/mobile-demo/')&&p.endsWith('.mjs')&&!p.endsWith('.test.mjs')||[
 'app/configurator/variant-m/view-zoom.mjs','app/configurator/variant-m/design-reset.mjs',
 'app/configurator/variant-m/preview-uploads.mjs','app/configurator/variant-m/pointer-state.mjs',
 'app/configurator/variant-m/background-loading.mjs','app/configurator/variant-m/build.mjs',
 'app/configurator/variant-m/lazy-resources.mjs','app/configurator/variant-m/product-design-gallery.mjs',
 'app/configurator/variant-m/profile-selection.mjs','app/configurator/variant-m/preload-queue.mjs',
 'app/configurator/variant-m/visible-resource-loader.mjs','app/workshop/customer-vector-logo.py',
 'app/workshop/customer-vector-logo.mjs','app/workshop/shop-warm-manifest.mjs',
 'app/workshop/ui/shop-embed.mjs','app/workshop/ui/shop-entry-client.mjs',
 'app/workshop/theme-cart.mjs','app/workshop/shop-start-model.mjs',
].includes(p));
const protectedFiles=protectedPaths.map(p=>{const before=git('show',base+':'+p),after=fs.readFileSync(path.join(repo,p));if(hash(before)!==hash(after))throw Error('Protected base file changed: '+p);return {path:p,beforeSha256:hash(before),afterSha256:hash(after),sameAsBase:true};});
const verification=JSON.parse(fs.readFileSync(path.join(repo,'docs/reviews/2026-11-08-r15-modules-current/verification.json'),'utf8'));
const manifest={schema:'gravuru-r15-modules-current/v1',base,liveCodeBase:'e9c36ce12d38fcb36bcb4b4c57add458d1859af7',sourceCommits:['61fcb3fb05bdcb636d1cb92e06917e175b64306a'],liveApplied:false,profileAssigned:false,privateExecutionEnabled:false,files:entries,protectedFiles,verification};
const manifestBytes=Buffer.from(JSON.stringify(manifest,null,2)+'\n');put('patch-manifest.json',manifestBytes);
put('README.md',fs.readFileSync(path.join(repo,'docs/handoffs/2026-11-08-r15-modules-current.md')));
put('verify.mjs',`import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import{fileURLToPath}from'node:url';
const here=path.dirname(fileURLToPath(import.meta.url)),manifest=JSON.parse(fs.readFileSync(path.join(here,'patch-manifest.json'))),mode=process.argv[2]||'--package',root=path.resolve(process.argv[3]||here),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
if(!['--package','--before','--after'].includes(mode))throw Error('Expected --package, --before or --after');
for(const f of manifest.files){if(f.path.includes('..')||path.isAbsolute(f.path))throw Error('Invalid relative path');const filename=path.join(root,mode==='--package'?'files':'',f.path),expected=mode==='--before'?f.beforeSha256:f.afterSha256;if(expected===null){if(fs.existsSync(filename))throw Error('Unexpected pre-existing module: '+f.path);}else if(sha(fs.readFileSync(filename))!==expected)throw Error('Hash mismatch: '+f.path);if(mode==='--package'&&f.beforeSha256&&sha(fs.readFileSync(path.join(root,'backup',f.path)))!==f.beforeSha256)throw Error('Backup mismatch: '+f.path);}
console.log(JSON.stringify({mode,verified:manifest.files.length,writes:0}));\n`);
const allowlist=['files','backup','patch-manifest.json','README.md','verify.mjs'];
const archive=path.join(output,'r15-modules-current-patch.tar.gz');
execFileSync('tar',['-czf',archive,'-C',stage,...allowlist],{stdio:'pipe'});
const receipt={archive,bytes:fs.statSync(archive).size,sha256:hash(fs.readFileSync(archive)),manifestSha256:hash(manifestBytes),files:entries.length,protectedFiles:protectedFiles.length};
fs.writeFileSync(path.join(output,'package-receipt.json'),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt));
