import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';

const here=dirname(fileURLToPath(import.meta.url));
assert.equal(process.argv.length,5,'Aufruf: node build.mjs <Checkout-2bd7bd8e> <Checkout-921928f4> <Bauordner>');
const [basis,repo,build]=process.argv.slice(2).map(value=>resolve(value));
const commit='921928f41a7d61e73b504400728f2f6f629e8ade';
const base='2bd7bd8e4b556955fbbbe28b585ecdaa4bfc7179';
const path='/konfi-demo/prio-claude-stufe1-267/r921928f4/',origin='https://app-2027.gravuru-designwerkstatt.de';
const out=join(build,'public');
const sha=b=>createHash('sha256').update(b).digest('hex');
const git=(dir,...args)=>execFileSync('git',['-C',dir,...args],{maxBuffer:12*1024*1024});
const moduleFor=(dir,file)=>import(pathToFileURL(join(dir,'app',file)).href);
const asset=text=>Buffer.from(text,'utf8');
const text=(body)=>body.toString('utf8');
const files=new Map(),proof={commit,base,origin,path,files:{},baseline:{},bundleNames:{}};
const historic=JSON.parse(await readFile(join(here,'..','manifest.json'),'utf8'));
const frames=gunzipSync(await readFile(join(here,'rahmen-2bd7bd8e.json.gz')));
assert.equal(sha(frames),'4cff90c2e0a41da1c80692285affa2fb0b5062f6bc504817f16fb96ad8d1fc4b');
const pinned=JSON.parse(text(frames));
const frame=entry=>({body:asset(entry.html),headers:new Headers({'content-security-policy':entry.policy})});
function replace(source,needle,change){
  assert.equal(source.split(needle).length,2,'Unerwarteter Ausgangsstand '+needle.slice(0,90));
  return source.replace(needle,()=>change);
}
function protectedHeader(source,headers) {
  const policy=headers.get('content-security-policy');assert(policy?.includes("connect-src 'self'"));
  const forMeta=policy.split(';').map(x=>x.trim()).filter(x=>x&&!x.startsWith('frame-ancestors')).join('; ');
  assert(!forMeta.includes('"'));
  return source.replace('<head>',()=>'<head><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="'+forMeta+'">');
}

assert.equal(text(git(repo,'rev-parse','HEAD')).trim(),commit);
assert.equal(text(git(basis,'rev-parse','HEAD')).trim(),base);
assert.equal(text(git(repo,'merge-base',base,commit)).trim(),base);
assert.equal(text(git(basis,'diff','--name-only',base,'--','app')).trim(),'');
for(const dir of [basis,repo]) assert.equal(text(git(dir,'diff','--name-only','--','app')).trim(),'');
await mkdir(out,{recursive:true});
const {acrylAssetText}=await moduleFor(repo,'workshop/acryl-employee-host.mjs');
const packages=await Promise.all([[basis,'basis'],[repo,'kandidat']].map(async ([dir,sub])=>{
  const m=await moduleFor(dir,'configurator/variant-m/bundle-build.mjs');
  const product=m.buildProductEditorBundles(join(build,sub));
  return {core:product,device:product.device,...product.executions,presentation:product.presentation};
}));
const publicRoot=frame(pinned.entry),editor=frame(pinned.editor);
assert.equal(sha(editor.body),historic.baseline.editorHtml);
const nativeShell=text(editor.body);
const anchors=new Map();
await Promise.all(Object.entries(packages[0]).map(async ([kind,old])=>{
  const next=packages[1][kind];
  const canonical='/_acryl-bundle/'+old.name;
  const approved=asset(acrylAssetText(text(await readFile(old.file))));
  assert.deepEqual({original:canonical,sha256:sha(approved)},historic.baseline[kind]);
  assert(nativeShell.includes(canonical),kind);
  const name=next.name.replace(/\.mjs$/,'.js');
  anchors.set(canonical,path+name);
  files.set(name,asset(acrylAssetText(text(await readFile(next.file)))));
  proof.baseline[kind]={original:canonical,sha256:sha(approved)};
  proof.bundleNames[kind]=name;
}));

// The ordinary scoped renderer contains the correct original product tools, generated HTML
// and resource roots. Only the six content-addressed editor bundle links move to this test.
let isolatedEditor=protectedHeader(nativeShell,editor.headers);
for(const [live,pilot] of anchors)isolatedEditor=isolatedEditor.replaceAll(live,pilot);
assert(!isolatedEditor.includes('/_acryl-bundle/editor-'),'Kein alter Code im Startrahmen');
files.set('editor.html',asset(isolatedEditor));

const ui='app/workshop/ui/';
const source=file=>text(git(repo,'show',commit+':'+ui+file));
const normal=source('shop-entry-page.mjs');
const shared=['shop-entry-client.mjs','shop-selection-transfer.mjs'];
for(const name of ['shop-entry-page.mjs',...shared]){
  assert.equal(source(name),text(git(basis,'show',base+':'+ui+name)),name);
}
let designSwitch=source('shop-design-switch.mjs');
for(const name of shared)designSwitch=replace(designSwitch,'./'+name,'/konfigurator/shop/'+name);
files.set('shop-design-switch.js',asset(designSwitch));

let page=normal;
page=replace(page,'import {createShopEntryClient,','import {pilotClient as createShopEntryClient,cartForPilot,betaEntry} from \'./pilot.js\';\nimport {');
page=replace(page,"from './shop-entry-client.mjs'","from '/konfigurator/shop/shop-entry-client.mjs'");
page=replace(page,"from './shop-design-switch.mjs'","from './shop-design-switch.js'");
page=replace(page,"  const client=createShopEntryClient({token:fragment.get('s')||''});",
  "  const test=fragment.get('test');\n  if(!/^[a-f0-9]{48}$/.test(test||''))throw Error('Bitte über den geschützten Prio-Test öffnen.');\n  fragment.set('ui','prio-r15');\n  const client=createShopEntryClient({token:fragment.get('s')||''});");
page=replace(page,"  const backUrl=shopUrl(data.shopDomain,fragment.get('back'));","  const backUrl=betaEntry;");
page=replace(page,"  const embedded=fragment.get('embed')==='1'&&window.parent!==window,shopOrigin='https://'+data.shopDomain;",
  "  const embedded=false,shopOrigin='https://'+data.shopDomain;");
page=replace(page,"    const submitCart=embedded?embeddedCart(client.submitThemeCart,shopOrigin,{image}):client.submitThemeCart;",
  "    const submitCart=cartForPilot(client,data,test);");
page=replace(page,'container:document.querySelector(\'#editor\'),activate,toDataUrl',
  'container:document.querySelector(\'#editor\'),activate,toDataUrl,clientFactory:createShopEntryClient');
files.set('shop-entry-page.js',asset(page));
files.set('pilot.js',await readFile(join(here,'pilot.js')));
let start=protectedHeader(text(publicRoot.body),publicRoot.headers);
start=replace(start,'/konfigurator/shop/shop-entry-page.mjs',path+'shop-entry-page.js');
start=start.replaceAll('/_merchant-acryl-editor.html',path+'editor.html');
// warmEditor recognizes standard merchant bundle paths. Preload the own core directly.
start=replace(start,'<title>', '<link rel="modulepreload" href="'+path+proof.bundleNames.core+'" fetchpriority="low"><title>');
files.set('prio.html',asset(start));
for(const [name,body] of files){await writeFile(join(out,name),body);proof.files[name]={bytes:body.length,sha256:sha(body)};}
proof.baseline.editorHtml=sha(editor.body);
const expected=JSON.parse(await readFile(join(here,'manifest.json'),'utf8'));
assert.deepEqual(proof,expected,'Der Bau weicht von der veröffentlichten Beta ab');
await writeFile(join(build,'manifest.json'),JSON.stringify(expected,null,2)+'\n');
console.log('Geprüft: '+files.size+' isolierte Dateien, Basis '+packages[0].core.hash+', Kandidat '+packages[1].core.hash);
