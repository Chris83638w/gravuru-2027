// Package only the reviewed source delta; never writes a server or product store.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';

const repo=process.cwd(),base='c7710dec6f2c4f6d0b36073ad2dc623fd5d5ac05';
const workspace=path.resolve(repo,'../..');
const out=path.resolve(process.argv[2]||path.join(workspace,'outputs/r15-resume-integration-20261108'));
const stage=path.join(out,'package'),runtime=path.join(out,'build-runtime');
const sha=b=>createHash('sha256').update(b).digest('hex');
const git=(...args)=>execFileSync('git',['-C',repo,...args],{maxBuffer:64*1024*1024});
const paths=[
 'app/configurator/variant-m/contract.mjs','app/configurator/variant-m/customer-rights.mjs',
 'app/configurator/variant-m/element-rights.mjs','app/configurator/variant-m/logo-upload.mjs',
 'app/configurator/variant-m/module-profile.mjs','app/configurator/variant-m/module-runtime.mjs',
 'app/configurator/variant-m/ux-model.mjs','app/configurator/variant-m/ux.mjs',
 'app/workshop/cart-personalization.mjs','app/workshop/shop-design-gallery.mjs',
 'app/workshop/shop-entry.mjs','app/workshop/shop-preparation.mjs',
 'app/workshop/public-design-preview-cache.mjs','app/workshop/public-design-previews.mjs',
 'app/workshop/shop-warm-manifest.mjs','app/workshop/ui/shop-warm.mjs',
 'app/workshop/configurator-integration.mjs','app/workshop/acryl-employee-host.mjs',
];
const delta=git('diff',base,'--name-only','--','app').toString().trim().split('\n').filter(p=>p&&!p.endsWith('.test.mjs'));
if(JSON.stringify([...delta].sort())!==JSON.stringify([...paths].sort()))throw Error('Unexpected production delta');
const basePaths=new Set(git('ls-tree','-r','--name-only',base,'--','app').toString().trim().split('\n'));
const put=(name,bytes)=>{const file=path.join(stage,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes);};
const files=paths.map(p=>{const after=fs.readFileSync(path.join(repo,p)),before=basePaths.has(p)?git('show',base+':'+p):null;put('files/'+p,after);if(before)put('backup/'+p,before);return {path:p,beforeSha256:before?sha(before):null,afterSha256:sha(after),bytes:after.length};});
const protectedPaths=[...basePaths].filter(p=>p.endsWith('.css')||p.startsWith('app/configurator/mobile-demo/')&&p.endsWith('.mjs')&&!p.endsWith('.test.mjs')||[
 'app/configurator/variant-m/view-zoom.mjs','app/configurator/variant-m/design-reset.mjs',
 'app/configurator/variant-m/preview-uploads.mjs','app/configurator/variant-m/pointer-state.mjs',
 'app/configurator/variant-m/background-loading.mjs','app/configurator/variant-m/build.mjs',
 'app/configurator/variant-m/lazy-resources.mjs','app/configurator/variant-m/product-design-gallery.mjs',
 'app/configurator/variant-m/profile-selection.mjs','app/configurator/variant-m/preload-queue.mjs',
 'app/configurator/variant-m/visible-resource-loader.mjs','app/workshop/customer-vector-logo.py',
 'app/workshop/customer-vector-logo.mjs','app/workshop/ui/shop-embed.mjs',
 'app/workshop/ui/shop-entry-client.mjs','app/workshop/theme-cart.mjs','app/workshop/shop-start-model.mjs',
].includes(p));
const protectedFiles=protectedPaths.map(p=>{const before=sha(git('show',base+':'+p)),after=sha(fs.readFileSync(path.join(repo,p)));if(before!==after)throw Error('Protected source changed: '+p);return {path:p,sha256:after};});

// The actual live styles differ from historical Git styles. Build with all 36
// captured active styles; never package replacements for them.
const cssRoot=path.join(workspace,'outputs/r15-module-rules-20261108/live-css');
const activeStyles=JSON.parse(fs.readFileSync(path.join(cssRoot,'manifest.json')));
if(activeStyles.length!==36)throw Error('Expected 36 captured active styles');
fs.mkdirSync(runtime,{recursive:true});
fs.cpSync(path.join(repo,'app'),path.join(runtime,'app'),{recursive:true,filter:p=>!p.split(path.sep).includes('.preview')&&!p.endsWith('.test.mjs')});
fs.copyFileSync(path.join(repo,'package.json'),path.join(runtime,'package.json'));
for(const f of activeStyles){const bytes=fs.readFileSync(path.join(cssRoot,f.path));if(sha(bytes)!==f.sha256)throw Error('Captured style mismatch: '+f.path);fs.copyFileSync(path.join(cssRoot,f.path),path.join(runtime,f.path));}
const {build}=await import(pathToFileURL(path.join(runtime,'app/configurator/variant-m/build.mjs')).href);
const built=build();
for(const f of activeStyles)if(sha(fs.readFileSync(path.join(runtime,f.path)))!==f.sha256)throw Error('Build changed style: '+f.path);
const manifest={schema:'gravuru-r15-resume-patch/v1',base,sourceCommit:git('rev-parse','HEAD').toString().trim(),liveCodeBase:'e9c36ce12d38fcb36bcb4b4c57add458d1859af7',liveApplied:false,profileAssigned:false,files,protectedFiles,activeStyles,built};
put('patch-manifest.json',JSON.stringify(manifest,null,2)+'\n');
put('verify.mjs',`import fs from 'node:fs';import path from 'node:path';import{createHash}from'node:crypto';import{fileURLToPath}from'node:url';
const here=path.dirname(fileURLToPath(import.meta.url)),m=JSON.parse(fs.readFileSync(path.join(here,'patch-manifest.json'))),mode=process.argv[2]||'--package',root=path.resolve(process.argv[3]||here),sha=b=>createHash('sha256').update(b).digest('hex');
if(!['--package','--before','--after'].includes(mode))throw Error('Unknown mode');
for(const f of m.files){if(f.path.includes('..')||path.isAbsolute(f.path))throw Error('Invalid path');const p=path.join(root,mode==='--package'?'files':'',f.path),expected=mode==='--before'?f.beforeSha256:f.afterSha256;if(expected===null){if(fs.existsSync(p))throw Error('Unexpected existing file: '+f.path);}else if(sha(fs.readFileSync(p))!==expected)throw Error('File differs: '+f.path);if(mode==='--package'&&f.beforeSha256&&sha(fs.readFileSync(path.join(root,'backup',f.path)))!==f.beforeSha256)throw Error('Backup differs: '+f.path);}
console.log(JSON.stringify({mode,files:m.files.length,writes:0}));\n`);
put('README.md','# Reviewed R15 module and preview patch\n\nPrepared only. No live activation. Verify current server sources against --before, copy only the 18 sources to a separate candidate runtime, then --after and build. Preserve every active CSS file and every product/order database. Review the linked handoffs before deployment.\n');
execFileSync(process.execPath,[path.join(stage,'verify.mjs')],{stdio:'pipe'});
execFileSync(process.execPath,[path.join(stage,'verify.mjs'),'--after',repo],{stdio:'pipe'});
const archive=path.join(out,'r15-resume-patch.tar.gz');
execFileSync('tar',['-czf',archive,'-C',stage,'files','backup','patch-manifest.json','verify.mjs','README.md']);
const receipt={archive,bytes:fs.statSync(archive).size,sha256:sha(fs.readFileSync(archive)),manifestSha256:sha(fs.readFileSync(path.join(stage,'patch-manifest.json'))),files:files.length,protectedFiles:protectedFiles.length,activeStyles:activeStyles.length,built};
fs.writeFileSync(path.join(out,'package-receipt.json'),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt));
