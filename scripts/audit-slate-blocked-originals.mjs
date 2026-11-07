// Read-only diagnosis: never changes an original, a native target or a database.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {readDesignFolder} from '../app/workshop/katalog-source.mjs';
import {katalogDesignToTemplate,parseDesignSvg,scaleTemplate} from '../app/workshop/katalog-convert.mjs';
import {customerLayoutIssue} from '../app/configurator/variant-m/contract.mjs';
import {textOutlineBounds} from '../app/platform/sources/app/shared/models/text-outline-fit.mjs';
import {withSlateReviewMetadata,slateReviewCategory} from './lib/slate-review-catalog.mjs';

const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const sha=value=>createHash('sha256').update(value).digest('hex');

export function paintedTextBounds(object,fonts) {
  const b=textOutlineBounds(object,fonts);if(!b)return null;
  const a=object.rotation*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
  const points=[[b.left,b.top],[b.right,b.top],[b.right,b.bottom],[b.left,b.bottom]].map(([x,y])=>[object.x+x*c-y*s,object.y+x*s+y*c]);
  return {left:Math.min(...points.map(p=>p[0])),top:Math.min(...points.map(p=>p[1])),right:Math.max(...points.map(p=>p[0])),bottom:Math.max(...points.map(p=>p[1]))};
}

export function auditSlateBlockedOriginals({packageRoot,familyFile,fontPreparationRoot}) {
  const root=path.resolve(packageRoot),pack=read(path.join(root,'manifest.json')),family=read(familyFile);
  if(pack.reviewOnly!==true||pack.released!==false)throw Error('Unreleased review package required');
  if(fontPreparationRoot&&read(path.join(fontPreparationRoot,'preparation-report.json')).catalogueCommit!==pack.catalogueCommit)throw Error('Font preparation catalogue commit mismatch');
  const additionalFontEvidence={};
  const inventory=read(path.join(root,'files-sha256.json'));
  const indexed=new Map(inventory.map(row=>[row.file,row]));
  function checked(relative) {
    const row=indexed.get(relative),file=path.resolve(root,relative);
    if(!file.startsWith(root+path.sep)||!row)throw Error('Unlisted package source: '+relative);
    const bytes=fs.readFileSync(file);if(bytes.length!==row.bytes||sha(bytes)!==row.sha256)throw Error('Source checksum mismatch: '+relative);
    return file;
  }
  const categoryCounts={},unresolvedTopics=[],originals=[];
  for(const row of pack.originals.filter(r=>!r.reviewMaterial||r.reviewMaterial.kind==='slate')) {
    const original=read(checked('originals/'+row.id+'/design.json'));
    const enriched=withSlateReviewMetadata(row,original),category=slateReviewCategory(enriched);
    categoryCounts[category.key]=(categoryCounts[category.key]||0)+1;
    if(enriched.reviewClassification?.status==='open')unresolvedTopics.push(row.id);
    if(row.targets?.length&&row.targets.every(t=>t.status==='prepared'))continue;
    const result={id:row.id,source:row.source,process:row.process,category,sourcePlateMm:row.sourcePlateMm,sourceReason:row.reason||row.error||null,targets:row.targets?.filter(t=>t.status!=='prepared').map(t=>({sizeKey:t.sizeKey,mm:t.mm,reason:t.reason}))||[]};originals.push(result);
    if(!row.normalized||row.process!=='Gravur'){result.diagnosis='source-or-print-preparation-open';continue;}
    try{
      const jsonFile=checked('native-source/'+row.id+'/design.json'),svgFile=checked('native-source/'+row.id+'/design.svg');
      const native=read(jsonFile),svg=fs.readFileSync(svgFile,'utf8'),design=readDesignFolder(path.dirname(jsonFile));
      const originalSvg=checked('originals/'+row.id+'/design.svg');
      if(native.originalPreparation?.sourceSvgSha256!==sha(fs.readFileSync(originalSvg)))throw Error('Normalized source reference mismatch');
      const parsed=parseDesignSvg(svg),fonts={};
      for(const name of new Set(parsed.layers.filter(l=>l.kind==='text').map(l=>l.font))){
        const file=pack.fontFiles[name];
        if(file)fonts[name]=read(checked(file));
        else{
          if(!fontPreparationRoot||/[\\/]/.test(name))throw Error('Prepared font resource unavailable: '+name);
          const extra=path.join(fontPreparationRoot,'fonts',name+'.json');
          if(!fs.existsSync(extra))throw Error('Prepared font resource unavailable: '+name);
          const bytes=fs.readFileSync(extra);fonts[name]=JSON.parse(bytes);
          additionalFontEvidence[name]={sha256:sha(bytes),bytes:bytes.length,source:'same-catalogue preparation cache; not imported or substituted'};
        }
      }
      const converted=katalogDesignToTemplate(design,family,null,{fonts,svgText:svg});
      result.sourceSvgSha256=sha(fs.readFileSync(originalSvg));result.normalizedSvgSha256=sha(svg);
      result.fontSubstitutions=(native.originalPreparation.technicalChanges||[]).filter(c=>c.from||c.action?.includes('replacement font size'));
      for(const target of result.targets){
        const template=scaleTemplate(converted.template,design.plateMm,target.mm,fonts,{contain:true});
        const profile={material:{kind:'slate'},geometry:{shape:'rect',width:target.mm[0],height:target.mm[1],safeMarginMm:0,holes:[]}};
        target.currentTextIssues=template.objects.filter(o=>o.type==='text').flatMap(o=>{
          const issue=customerLayoutIssue(o,profile,{fonts});if(!issue)return [];
          const layer=parsed.layers.find(l=>l.id===o.id),sourceText=(original.texts||[]).find(t=>t.text===o.text);
          return [{id:o.id,text:o.text,font:o.font,fontSizeMm:o.size,issue,paintedBoundsMm:paintedTextBounds(o,fonts),sourceTextBoxMm:sourceText?.box||null,sourceAnchor:layer?{x:layer.x,firstBaseline:layer.y,anchor:layer.anchor,lineHeight:layer.lineHeight,lines:layer.lines}:null}];
        });
      }
      result.diagnosis=result.targets.some(t=>t.currentTextIssues?.length)?'painted-text-outside-plate':'requires-full-native-revalidation';
    }catch(error){result.diagnosis='source-or-font-conversion-open';result.currentReason=error.message;}
  }
  return {schema:'gravuru-slate-blocked-original-audit/v1',packageCatalogueCommit:pack.catalogueCommit,sourceManifestSha256:sha(fs.readFileSync(path.join(root,'manifest.json'))),familySourceSha256:sha(fs.readFileSync(familyFile)),additionalFontEvidence,categoryCounts,unresolvedAnimalSpecies:unresolvedTopics,openOriginals:originals.length,originals,originalsChanged:false,layoutsChanged:false,validationChanged:false,databaseWrites:0,productionReadyClaimed:false};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2),get=k=>args[args.indexOf(k)+1];
  for(const k of ['--package','--family','--output'])if(!args.includes(k))throw Error(k+' required');
  const report=auditSlateBlockedOriginals({packageRoot:get('--package'),familyFile:get('--family'),fontPreparationRoot:args.includes('--font-preparation')?get('--font-preparation'):undefined});
  fs.writeFileSync(path.resolve(get('--output')),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({openOriginals:report.openOriginals,unresolvedAnimalSpecies:report.unresolvedAnimalSpecies.length,categoryCounts:report.categoryCounts,diagnoses:report.originals.reduce((m,r)=>(m[r.diagnosis]=(m[r.diagnosis]||0)+1,m),{})}));
}
