// Immutable catalogue SVG -> display-only PNG; no native product or source writes.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {verifyPinnedFiles,DESIGN_BATCH_DELIVERY_COMMIT as COMMIT,DESIGN_BATCH_FOLDER as FOLDER} from './prepare-design-batch-review.mjs';

const hash=b=>createHash('sha256').update(b).digest('hex');
const read=f=>JSON.parse(fs.readFileSync(f));
const json=x=>JSON.stringify(x,null,2)+'\n';
const slash=s=>s.replaceAll('\\','/');
export function sourcePreviewRelative(sourceDir,reference){
 if(typeof reference!=='string'||!reference||/^[a-z]+:|^[/\\]|[\\?#\x00-\x1f]/i.test(reference))throw Error('Unsupported relative source image');
 const relative=path.posix.normalize(sourceDir+'/'+reference);
 if(relative.startsWith('../')||relative==='..'||!relative.startsWith('designs/'))throw Error('Source image escapes catalogue designs');
 return relative;
}
export function sourcePreviewFont(name,sourceFonts,registry,replacements){
 const direct=sourceFonts.find(f=>f.name===name&&f.datei);
 if(direct)return {name,sourceName:direct.name,file:direct.datei,substitution:direct.art==='ersatz'||!!direct.ersatzFuer,...(direct.art==='ersatz'||direct.ersatzFuer?{substitutionSource:direct.ersatzQuelle||FOLDER+'/schriften-ersatz/ersatz-alle.json'}:{})};
 const replacement=replacements[name],font=typeof replacement==='string'&&registry.find(f=>f.name===replacement&&f.file);
 if(!font)throw Error('Unresolved source font: '+name);
 return {name,sourceName:replacement,file:font.file,substitution:true,substitutionSource:FOLDER+'/schriften-ersatz/ersatz-alle.json'};
}
export function sourcePreviewGlyphCheck(text,codepoints){
 const have=new Set(codepoints),missing=[...new Set([...text].filter(c=>!/[\s\u200b-\u200d\ufeff]/u.test(c)&&!have.has(c.codePointAt(0))).map(c=>'U+'+c.codePointAt(0).toString(16).toUpperCase()))];
 if(missing.length)throw Error('Font lacks source glyphs: '+missing.join(', '));
}
function cmapFor(files,python){
 const program='import sys,json\nfrom fontTools.ttLib import TTFont\nout={}\nfor file in json.load(sys.stdin):\n f=TTFont(file);out[file]=list((f.getBestCmap() or {}).keys());f.close()\njson.dump(out,sys.stdout)';
 return JSON.parse(execFileSync(python,['-c',program],{input:JSON.stringify(files),encoding:'utf8',maxBuffer:32*1024*1024,windowsHide:true}));
}
export async function prepareSourcePreviewSupplement({catalogueRoot,gapAudit,planFile,out,examples=false,resume=false,rerender=false,python=process.env.GRAVURU_PYTHON,maxSide=800}){
 const root=path.resolve(catalogueRoot),dest=path.resolve(out),codeRoot=fileURLToPath(new URL('../',import.meta.url));
 for(const forbidden of [root,codeRoot]){const rel=path.relative(forbidden,dest);if(!rel||!rel.startsWith('..'+path.sep)&&rel!=='..')throw Error('Supplement must be outside repositories');}
 if(fs.existsSync(dest)&&(!resume||!fs.existsSync(path.join(dest,'supplement-manifest.json'))))throw Error('Use new output or explicit resumable supplement');
 if(!python)throw Error('Pinned Python with fontTools required');
 const audit=read(gapAudit),plan=read(planFile);if(audit.sourceCommit!==COMMIT||plan.deliveryCommit!==COMMIT)throw Error('Source audit is not pinned');
 const registryFile='schriften/schriften.json',replacementFile=FOLDER+'/schriften-ersatz/ersatz-alle.json';
 const registry=read(path.join(root,registryFile)).fonts,replacements=read(path.join(root,replacementFile)),sources=new Map();
 const pinFiles=[registryFile,replacementFile];
 for(const batch of plan.batches){const relative=slash(path.relative(root,batch.manifestFile));pinFiles.push(relative);for(const row of read(batch.manifestFile).designs)sources.set(row.pfad,row);}
 const jobs=[],blocked=[];
 for(const row of audit.rows){
  try{
   if(row.sourceFontFileStatus)throw Error('Legacy source font mapping not resolved');
   const svgBytes=fs.readFileSync(row.file);if(hash(svgBytes)!==row.expectedSha256)throw Error('Original SVG differs from immutable gallery source');
   const svg=svgBytes.toString('utf8'),sourceDir=row.source.replace(/\/design\.json$/,''),source=sources.get(sourceDir);if(!source)throw Error('Pinned design metadata missing');
   if(/<!DOCTYPE|<!ENTITY/i.test(svg))throw Error('XML entity declarations are forbidden');
   const names=[...new Set([...svg.matchAll(/font-family\s*=\s*["']([^"']+)["']/g)].map(m=>m[1]))];
   if(!names.length)throw Error('Explicit source font family missing');
   const fonts=names.map(name=>sourcePreviewFont(name,source.schriften||[],registry,replacements));
   const refs=[...new Set([...svg.matchAll(/(?:xlink:)?href\s*=\s*["']([^"']+)["']/g)].map(m=>m[1]).filter(v=>!v.startsWith('#')&&!v.startsWith('data:')))];
   const photos=refs.map(ref=>({ref,file:sourcePreviewRelative(sourceDir,ref)}));
   pinFiles.push(...fonts.map(f=>f.file),...photos.map(f=>f.file));
   jobs.push({row,source,svg,fonts,photos});
  }catch(error){blocked.push({originalId:row.id,reason:error.message,reviewOnly:true,released:false});}
 }
 const pinned=verifyPinnedFiles(root,pinFiles),byFile=new Map(pinned.map(s=>[s.file,s]));
 const fontFiles=[...new Set(jobs.flatMap(j=>j.fonts.map(f=>path.join(root,f.file))))],cmap=cmapFor(fontFiles,python);
 const fontData=new Map(fontFiles.map(f=>[f,fs.readFileSync(f).toString('base64')]));
 const require=createRequire(import.meta.url),{chromium}=require('playwright');
 const browser=await chromium.launch({headless:true}),context=await browser.newContext({offline:true,serviceWorkers:'block',viewport:{width:maxSide,height:maxSide},deviceScaleFactor:1});
 await context.route('**/*',route=>route.abort());
 const manifestFile=path.join(dest,'supplement-manifest.json'),prior=resume?read(manifestFile):null;
 if(prior&&(prior.schema!=='gravuru-source-preview-supplement/v1'||prior.deliveryCommit!==COMMIT))throw Error('Resume manifest differs');
 const rows=rerender?[]:prior?.rows||[],done=new Set(rows.map(r=>r.originalId));
 for(const row of prior?.rows||[]){const b=fs.readFileSync(path.join(dest,row.preview));if(b.length!==row.bytes||hash(b)!==row.sha256)throw Error('Completed preview changed');}
 if(rerender&&(!prior||prior.complete))throw Error('Only an unfinished example supplement can be rerendered');
 const selected=examples?new Set(['TR-V2A-6.5x6.5-D803','GT-S-30x20-D50--source-095ec4f8e87f','GT-S-22x14-D234']):null;
 const pending=jobs.filter(j=>!done.has(j.row.id)&&(!selected||selected.has(j.row.id)));
 fs.mkdirSync(dest,{recursive:true});
 const renderer={name:'isolated-chromium',version:browser.version(),offline:true,explicitFonts:true,glyphCoverageChecked:true,sourceFontNamesCssQuoted:true,maxSide,displayBackgroundPolicy:'light original engraving: #252a31; dark or mixed original artwork: #ffffff; source colours unchanged'};
 try{
  const queue=[...pending];await Promise.all(Array.from({length:3},async()=>{
   const page=await context.newPage();
   for(let job;(job=queue.shift());){
    try{
     const fontPayload=job.fonts.map(f=>({...f,data:fontData.get(path.join(root,f.file)),codepoints:cmap[path.join(root,f.file)]}));
     const images=job.photos.map(f=>{const b=fs.readFileSync(path.join(root,f.file));const ext=path.extname(f.file).slice(1).toLowerCase(),mime=ext==='jpg'?'jpeg':ext;if(!['png','jpeg','webp'].includes(mime))throw Error('Unsupported source image type');return {ref:f.ref,data:'data:image/'+mime+';base64,'+b.toString('base64')};});
     await page.goto('about:blank');
     const result=await page.evaluate(async({svg,fonts,images,maxSide})=>{
      const doc=new DOMParser().parseFromString(svg,'image/svg+xml'),root=doc.documentElement;
      if(doc.querySelector('parsererror')||root.localName!=='svg')throw Error('Invalid source XML');
      const allowed=new Set(['svg','g','defs','path','rect','circle','ellipse','line','polyline','polygon','text','tspan','textPath','image','clipPath','mask','linearGradient','radialGradient','stop','use','pattern','title','desc','metadata']);
      const pictures=new Map(images.map(x=>[x.ref,x.data])),fontNames=new Set(fonts.map(f=>f.name));
      for(const node of doc.querySelectorAll('*')){
       if(!allowed.has(node.localName))throw Error('Unsupported source element: '+node.localName);
       for(const attr of node.attributes){
        // A catalogue family such as Baloo 2 needs CSS string quoting. Bind
        // the exact supplied name; never permit the browser's default font.
        if(attr.localName==='font-family'&&fontNames.has(attr.value))node.setAttribute('font-family',JSON.stringify(attr.value));
        if(/^on/i.test(attr.name)||/@import|expression\s*\(/i.test(attr.value))throw Error('Active source attribute');
        if(attr.localName==='href'){
         if(attr.value.startsWith('#'))continue;
         if(node.localName!=='image')throw Error('External non-image source reference');
         const value=pictures.get(attr.value)||attr.value;
         if(!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value))throw Error('Unresolved source image');
         node.setAttributeNS(attr.namespaceURI,attr.name,value);
        }
        for(const match of attr.value.matchAll(/url\((.*?)\)/gi))if(!/^['"]?#[\w:.-]+['"]?$/.test(match[1].trim()))throw Error('External source paint reference');
       }
      }
      const box=(root.getAttribute('viewBox')||'').trim().split(/[ ,]+/).map(Number);if(box.length!==4||box.some(n=>!Number.isFinite(n))||box[2]<=0||box[3]<=0)throw Error('Source viewBox missing');
      const width=Math.max(1,Math.round(maxSide*box[2]/Math.max(box[2],box[3]))),height=Math.max(1,Math.round(maxSide*box[3]/Math.max(box[2],box[3])));
      document.body.style.cssText='margin:0;background:white';
      for(const font of fonts){const bytes=Uint8Array.from(atob(font.data),c=>c.charCodeAt(0));const face=new FontFace(font.name,bytes);await face.load();if(face.status!=='loaded')throw Error('Explicit source font did not load');document.fonts.add(face);}
      root.setAttribute('width',String(width));root.setAttribute('height',String(height));root.id='source-preview';root.style.display='block';document.body.replaceChildren(document.importNode(root,true));await document.fonts.ready;
      const fontMap=new Map(fonts.map(f=>[f.name,new Set(f.codepoints)]));
      for(const node of document.querySelectorAll('text,tspan,textPath')){
       const family=getComputedStyle(node).fontFamily.replace(/^['"]|['"]$/g,'');const cmap=fontMap.get(family);if(!cmap)throw Error('Unresolved computed source font: '+family);
       for(const child of node.childNodes)if(child.nodeType===Node.TEXT_NODE)for(const char of child.textContent){if(!/[\s\u200b-\u200d\ufeff]/u.test(char)&&!cmap.has(char.codePointAt(0)))throw Error('Font lacks source glyph '+family+' U+'+char.codePointAt(0).toString(16).toUpperCase());}
      }
      await Promise.all([...document.querySelectorAll('image')].map(node=>new Promise((resolve,reject)=>{const i=new Image();i.onload=resolve;i.onerror=()=>reject(Error('Source photo decode failed'));i.src=node.getAttribute('href')||node.getAttributeNS('http://www.w3.org/1999/xlink','href');})));
      const tones=[];
      const luminance=value=>{const match=/^rgba?\((\d+)[, ]+(\d+)[, ]+(\d+)/.exec(value);if(!match)return null;const values=match.slice(1).map(v=>{const n=Number(v)/255;return n<=0.04045?n/12.92:((n+0.055)/1.055)**2.4;});return .2126*values[0]+.7152*values[1]+.0722*values[2];};
      for(const node of document.querySelectorAll('#source-preview text,#source-preview path,#source-preview polygon,#source-preview polyline,#source-preview line')){
       if(node.closest('defs,clipPath,mask,pattern,[data-platzhalter],.foto,[id^="foto-"]'))continue;
       const style=getComputedStyle(node);for(const prop of node.localName==='line'?['stroke']:['fill','stroke']){const tone=luminance(style[prop]);if(tone!==null)tones.push(tone);}
      }
      const light=tones.length>0&&tones.every(tone=>tone>=.35),backgroundHex=light?'#252a31':'#ffffff';document.body.style.background=backgroundHex;
      return {width,height,viewBox:box,backgroundHex,backgroundReason:light?'Unveränderte helle Quellgravur auf kontrastierender Anzeigeunterlage.':'Unveränderte dunkle oder gemischte Quellgrafik auf weißer Anzeigeunterlage.'};
     },{svg:job.svg,fonts:fontPayload,images,maxSide});
     const preview='originals/_source-previews/'+hash(job.row.id).slice(0,24)+'.png',target=path.join(dest,preview);fs.mkdirSync(path.dirname(target),{recursive:true});
     const bytes=await page.locator('#source-preview').screenshot({type:'png',omitBackground:false,timeout:20000});fs.writeFileSync(target,bytes,{flag:rerender?'w':'wx'});
     rows.push({originalId:job.row.id,sourceOriginalId:job.source.id,preview,bytes:bytes.length,sha256:hash(bytes),source:{file:job.row.source.endsWith('/design.json')?job.row.source.replace(/design\.json$/,'design.svg'):job.row.source+'/design.svg',galleryFile:'originals/'+job.row.id+'/design.svg',sha256:job.row.expectedSha256,kind:job.row.sourceBatch?'pinned-catalogue-original':'preserved-gallery-original'},fonts:job.fonts.map(f=>({...f,sha256:byFile.get(f.file).sha256})),photos:job.photos.map(f=>({file:f.file,sha256:byFile.get(f.file).sha256})),geometry:result,reviewOnly:true,released:false});
     console.log(JSON.stringify({stage:'rendered-source-preview',id:job.row.id,rendered:rows.length,bytes:bytes.length}));
    }catch(error){blocked.push({originalId:job.row.id,reason:error.message,reviewOnly:true,released:false});console.log(JSON.stringify({stage:'blocked-source-preview',id:job.row.id,reason:error.message}));}
   }
   await page.close();
  }));
 }finally{await context.close();await browser.close();}
 const counts={requested:audit.rows.length,rendered:rows.length,blocked:blocked.length,pending:jobs.length-rows.length-blocked.filter(b=>jobs.some(j=>j.row.id===b.originalId)).length};
 const manifest={schema:'gravuru-source-preview-supplement/v1',sourceCommit:COMMIT,deliveryCommit:COMMIT,reviewOnly:true,released:false,complete:!examples,counts,rows:rows.sort((a,b)=>a.originalId.localeCompare(b.originalId)),blocked};
 fs.writeFileSync(manifestFile,json(manifest));
 fs.writeFileSync(path.join(dest,'preparation-proof.json'),json({schema:'gravuru-source-preview-preparation-proof/v1',sourceCommit:COMMIT,deliveryCommit:COMMIT,pinnedSourceVerified:true,originalSourcesVerified:true,sources:pinned,renderer,counts,reviewOnly:true,released:false}));
 const index=[];function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory())walk(f);else if(e.name!=='files-sha256.json'){const b=fs.readFileSync(f);index.push({file:slash(path.relative(dest,f)),bytes:b.length,sha256:hash(b)});}}}walk(dest);fs.writeFileSync(path.join(dest,'files-sha256.json'),json(index.sort((a,b)=>a.file.localeCompare(b.file))));return {out:dest,counts};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),get=n=>args[args.indexOf(n)+1];
 console.log(JSON.stringify(await prepareSourcePreviewSupplement({catalogueRoot:get('--katalog'),gapAudit:get('--audit'),planFile:get('--plan'),out:get('--out'),examples:args.includes('--examples'),resume:args.includes('--resume'),rerender:args.includes('--rerender')})));
}
