// Append a disjoint catalogue package to a private review copy. Existing
// products, revisions and comments are never re-imported or updated.
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {createDesignAssetStore} from '../app/workshop/design-assets.mjs';
import {createProductRepository} from '../app/workshop/repository.mjs';
import {validateProductDocument} from '../app/workshop/product-model.mjs';
import {validateSlateReviewMapping} from '../ops/plesk/slate-review-runtime.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const json=value=>JSON.stringify(value,null,2)+'\n';
const fail=message=>{throw Error(message);};
const within=(root,file)=>root===file||file.startsWith(root+path.sep);
function noLinks(file){for(let current=file;;current=path.dirname(current)){if(fs.existsSync(current)&&fs.lstatSync(current).isSymbolicLink())fail('Symbolic paths are not allowed');if(current===path.dirname(current))break;}return file;}
function privatePath(value){const file=noLinks(path.resolve(value));for(let current=file;;current=path.dirname(current)){if(fs.existsSync(path.join(current,'.git')))fail('Private review data must stay outside Git');if(current===path.dirname(current))break;}return file;}
function child(root,relative){
  if(typeof relative!=='string'||!relative||relative.includes('\\')||relative.includes('\0')||relative.split('/').some(part=>!part||part.startsWith('.')||part.includes(':')))fail('Invalid package path');
  const file=path.resolve(root,relative);if(file===root||!within(root,file))fail('Package path escapes root');return noLinks(file);
}
function walk(root){
  const files=[];
  const visit=dir=>{for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=noLinks(path.join(dir,entry.name));if(entry.isDirectory())visit(file);else if(entry.isFile())files.push(path.relative(root,file).split(path.sep).join('/'));else fail('Only regular package files are allowed');}};
  visit(root);return files.sort();
}
function write(file,bytes){fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});fs.writeFileSync(file,bytes,{flag:'wx',mode:0o600});}
export function readSlatePackage(value){
  const root=privatePath(value),checksums=read(child(root,'files-sha256.json')),names=new Set();
  for(const row of checksums){
    if(names.has(row.file))fail('Duplicate package file');names.add(row.file);
    const bytes=fs.readFileSync(child(root,row.file));
    if(bytes.length!==row.bytes||sha(bytes)!==row.sha256)fail('Package checksum mismatch: '+row.file);
  }
  assert.deepEqual(walk(root),[...names,'files-sha256.json'].sort(),'Package inventory must match all files');
  const pack=read(child(root,'manifest.json'));
  validateSlateReviewMapping(pack,{localOnly:true,published:false,shopifyWrites:0,products:pack.products});
  return {root,pack,checksums,hash:sha(fs.readFileSync(child(root,'manifest.json')))};
}
function disjoint(base,addon){
  if(base.pack.catalogueCommit!==addon.pack.catalogueCommit)fail('Catalogue commits must agree');
  for(const [label,oldRows,newRows,key] of [
    ['original IDs',base.pack.originals,addon.pack.originals,'id'],
    ['product keys',base.pack.products,addon.pack.products,'key'],
    ['package product IDs',base.pack.products,addon.pack.products,'productId'],
  ]){
    const old=new Set(oldRows.map(row=>row[key])),fresh=new Set();
    for(const row of newRows){if(old.has(row[key])||fresh.has(row[key]))fail('Extension overlaps '+label);fresh.add(row[key]);}
  }
}

export function mergeSlatePackages({baseRoot,addonRoot,out}){
  const base=readSlatePackage(baseRoot),addon=readSlatePackage(addonRoot);disjoint(base,addon);
  out=privatePath(out);if(fs.existsSync(out))fail('Combined package output must be new');
  for(const source of [base,addon])if(within(source.root,out)||within(out,source.root))fail('Combined output must be separate');
  const planned=new Map();
  const add=(name,source,expected)=>{
    const old=planned.get(name);
    if(old&&(old.expected.sha256!==expected.sha256||old.expected.bytes!==expected.bytes))fail('Different bytes collide at '+name);
    if(!old)planned.set(name,{source,expected});
  };
  for(const source of [base,addon]){
    for(const row of source.checksums){
      // Root reports describe their original package. Preserve their exact
      // bytes under separate provenance paths instead of inventing a merge.
      const target=row.file.includes('/')?row.file:'source-packages/'+source.hash+'/'+row.file;
      add(target,child(source.root,row.file),row);
    }
  }
  for(const source of [base,addon]){
    const file=child(source.root,'files-sha256.json');
    add('source-packages/'+source.hash+'/files-sha256.json',file,{sha256:sha(fs.readFileSync(file)),bytes:fs.statSync(file).size});
  }
  const assets=new Map();
  for(const asset of [...base.pack.assets,...addon.pack.assets]){
    if(assets.has(asset.id))assert.deepEqual(assets.get(asset.id),asset,'Conflicting content-addressed asset metadata');else assets.set(asset.id,asset);
  }
  const fontFiles={...base.pack.fontFiles};
  for(const [name,file] of Object.entries(addon.pack.fontFiles)){if(fontFiles[name]&&fontFiles[name]!==file)fail('Font file mapping conflict: '+name);fontFiles[name]=file;}
  const pack={...base.pack,products:[...base.pack.products,...addon.pack.products],originals:[...base.pack.originals,...addon.pack.originals],assets:[...assets.values()],fontFiles,
    sourcePackages:[{manifestSha256:base.hash,counts:base.pack.counts},{manifestSha256:addon.hash,counts:addon.pack.counts}]};
  const editable=pack.originals.filter(row=>row.targets?.some(target=>target.status==='prepared'));
  const complete=editable.filter(row=>row.targets.every(target=>target.status==='prepared'));
  // Source preparedDesigns used different meanings (both memorial sizes versus
  // one exact door-sign size). Keep source counts verbatim and derive explicit
  // aggregate meanings from the actual combined targets.
  pack.counts={originals:pack.originals.length,engraving:pack.originals.filter(row=>row.process!=='UV').length,uv:pack.originals.filter(row=>row.process==='UV').length,
    editableOriginals:editable.length,fullyPreparedOriginals:complete.length,partiallyPreparedOriginals:editable.length-complete.length,
    unpreparedOriginals:pack.originals.length-editable.length,preparedTargets:pack.originals.reduce((sum,row)=>sum+(row.targets||[]).filter(target=>target.status==='prepared').length,0),reviewProducts:pack.products.length};
  validateSlateReviewMapping(pack,{localOnly:true,published:false,shopifyWrites:0,products:pack.products});
  fs.mkdirSync(out,{recursive:true,mode:0o700});
  for(const [relative,row] of planned){const bytes=fs.readFileSync(row.source);if(bytes.length!==row.expected.bytes||sha(bytes)!==row.expected.sha256)fail('Source changed during merge');write(child(out,relative),bytes);}
  write(child(out,'manifest.json'),json(pack));
  write(child(out,'START-HIER.md'),'# Gemeinsame private Schiefer-Prüfgalerie\n\nOriginale und Nachweise bleiben unverändert; Quellberichte stehen unter source-packages/.\nBenutzeränderungen liegen ausschließlich in den zugehörigen Review-Datenbanken.\nKeine Veröffentlichung oder Designfreigabe.\n');
  const checksums=walk(out).map(file=>{const bytes=fs.readFileSync(child(out,file));return {file,bytes:bytes.length,sha256:sha(bytes)};});
  write(child(out,'files-sha256.json'),json(checksums));
  return {out,counts:pack.counts,files:checksums.length+1};
}

export async function extendSlateReview({baseRoot,addonRoot,data,galleryOut}){
  const base=readSlatePackage(baseRoot),addon=readSlatePackage(addonRoot);disjoint(base,addon);
  data=privatePath(data);const mappingFile=path.join(data,'local-review-import.json');
  for(const name of ['workshop.sqlite','design-assets.sqlite','profiles.sqlite','review-comments.sqlite','local-review-import.json'])if(!fs.statSync(noLinks(path.join(data,name))).isFile())fail('Existing review data missing: '+name);
  const mappingBytes=fs.readFileSync(mappingFile),prior=JSON.parse(mappingBytes);
  validateSlateReviewMapping(base.pack,prior);
  if(addon.pack.products.length>100)fail('Extension exceeds one atomic import batch (100 products)');
  const lockFile=data+'.slate-extension.lock';let lock,assets,repo,temp;
  try{
    lock=fs.openSync(lockFile,'wx',0o600);fs.writeSync(lock,'Separate offline Schiefer extension\n');
    const merged=mergeSlatePackages({baseRoot,addonRoot,out:galleryOut});
    assets=createDesignAssetStore({filename:path.join(data,'design-assets.sqlite')});
    repo=createProductRepository({filename:path.join(data,'workshop.sqlite'),validateDocument:validateProductDocument});
    for(const row of prior.products)repo.get(row.productId); // existence only; edited heads need not equal baselines
    const documents=addon.pack.products.map(product=>{
      const {document,fontRefs}=read(child(addon.root,product.file));
      if(sha(JSON.stringify(document))!==product.documentHash)fail('Extension document checksum mismatch');
      document.config.localResources.fonts=Object.fromEntries(fontRefs.map(name=>[name,read(child(addon.root,addon.pack.fontFiles[name]))]));
      if(document.config.profile.material?.kind!=='slate')fail('Only Schiefer products may enter this extension');
      assert.deepEqual(document.config.profile.designs.map(design=>design.id).sort(),product.designIds.map(id=>'katalog-'+id).sort());
      for(const design of document.config.profile.designs)if(design.katalog?.target?.released!==false)fail('Extension contains a released design');
      validateProductDocument(document);
      return {product,document};
    });
    for(const asset of addon.pack.assets){
      let existing;try{existing=assets.get(asset.id);}catch(error){if(error.status!==404)throw error;}
      if(!existing){const imported=await assets.import({name:'Original.svg',bytes:fs.readFileSync(child(addon.root,asset.source)).toString('base64')});if(imported.assetId!==asset.id)fail('Converted asset differs from the prepared original');}
      assert.equal(sha(assets.read(asset.id,true)),asset.metadata.sourceSha256);assert.equal(sha(assets.read(asset.id)),asset.metadata.previewSha256);
    }
    const entries=documents.map(({document})=>{
      assets.validateDocument(document);
      const fingerprint=sha(JSON.stringify(document)),key='slate-review-extension:'+fingerprint;
      const earlier=repo.importItem(key);
      if(earlier){
        if(prior.products.some(row=>row.productId===earlier.id))fail('Extension import journal points at an existing mapped product');
        assert.equal(earlier.fingerprint,fingerprint);assert.deepEqual(repo.get(earlier.id).document.config,document.config,'Partial earlier import was edited; do not overwrite or silently remap');
      }
      return {key,fingerprint,document};
    });
    const saved=entries.length?repo.importBatch(entries):[];
    const added=saved.map((item,index)=>{
      const readback=repo.get(item.id);assert.deepEqual(readback.document.config,documents[index].document.config);assets.validateDocument(readback.document);
      return {...documents[index].product,productId:item.id,revision:readback.revision,created:item.created};
    });
    const result={...prior,products:[...prior.products,...added]};
    validateSlateReviewMapping(read(path.join(merged.out,'manifest.json')),result);
    // File publication is last. The old mapping is never truncated. A failed
    // earlier batch can only leave new immutable assets/import-journal entries;
    // rerunning with a new gallery output safely checks/reuses those entries.
    temp=mappingFile+'.'+randomUUID()+'.tmp';
    const fd=fs.openSync(temp,'wx',0o600);try{fs.writeFileSync(fd,json(result));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
    if(!fs.readFileSync(mappingFile).equals(mappingBytes))fail('Review mapping changed concurrently; stop and inspect');
    fs.renameSync(temp,mappingFile);temp=null;
    return {localOnly:true,shopifyWrites:0,published:false,oldProducts:prior.products.length,newProducts:added.length,newOriginals:addon.pack.originals.length,gallery:merged.out,counts:merged.counts};
  }finally{
    assets?.close();repo?.close();
    if(temp&&fs.existsSync(temp))fs.unlinkSync(temp);
    if(lock!==undefined){fs.closeSync(lock);fs.unlinkSync(lockFile);}
  }
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2),value=key=>args[args.indexOf(key)+1];
  for(const name of ['--base','--addon','--data','--gallery-out'])if(!args.includes(name)||!value(name))fail(name+' required');
  console.log(JSON.stringify(await extendSlateReview({baseRoot:value('--base'),addonRoot:value('--addon'),data:value('--data'),galleryOut:value('--gallery-out')})));
}
