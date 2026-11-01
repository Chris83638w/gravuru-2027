// Source: Issue 48, 2026-11-01. Local catalog branch only; no import or release.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {openKatalog} from '../app/workshop/katalog-source.mjs';
import {familySizeCandidates} from '../app/workshop/family-size-candidates.mjs';
import {katalogDesignToTemplate,scaleTemplate} from '../app/workshop/katalog-convert.mjs';
import {assessDesignTarget} from '../app/workshop/design-target-rules.mjs';
import {convertFont} from '../app/workshop/font-library.mjs';

const args=Object.fromEntries(process.argv.slice(2).map(s=>{const i=s.indexOf('=');return i<0?[s,true]:[s.slice(0,i),s.slice(i+1)];}));
if(Object.keys(args).some(k=>!['--katalog','--output','--fonts','--apply'].includes(k))||typeof args['--katalog']!=='string'||typeof args['--output']!=='string')throw Error('--katalog=<local repo> --output=<new report> [--fonts=<review config>] [--apply]');
const output=path.resolve(args['--output']);if(fs.existsSync(output))throw Error('Bericht existiert bereits.');
const katalog=openKatalog(args['--katalog']),family=katalog.families.get('steel-door-signs');
const themeId=katalog.lines.get('edelstahl-tuerschilder')?.subcategories.find(s=>s.id==='familienschilder')?.themeId;
if(!themeId)throw Error('Unterkategorie Familienschilder fehlt.');
const masters=katalog.designs.masters.filter(d=>!d.hidden&&d.themes?.includes(themeId));
const candidates=familySizeCandidates(katalog,masters),originals=new Map(masters.map(d=>[d.id,d]));
const available=args['--fonts']?JSON.parse(fs.readFileSync(args['--fonts'],'utf8')).localResources.fonts:{};
const {fonts,missing}=await katalog.fontResources([...new Set(masters.flatMap(m=>m.fonts))],{available,converter:convertFont});
if(missing.length)throw Error('Schriften fehlen: '+missing.join(', '));
const sha=s=>createHash('sha256').update(s).digest('hex'),changes=[],skipped=[];
for(const addition of candidates.additions){
 const master=candidates.masters.find(m=>m.id===addition.designId),original=originals.get(master.id),before=fs.readFileSync(original.jsonFile,'utf8');
 const approved=original.json.freigabe?.status==='freigegeben'||original.json.ziele?.some(t=>t.freigabe!==null&&t.freigabe!==undefined);
 if(approved){skipped.push({designId:master.id,sizeKeys:addition.sizeKeys,reason:'Vorhandene Freigabe bleibt unverändert; Größenerweiterung würde ihren Umfang verändern.'});continue;}
 let native;try{native=katalogDesignToTemplate(master,family,null,{fonts});}catch(error){skipped.push({designId:master.id,sizeKeys:addition.sizeKeys,reason:error.message});continue;}
 const accepted=[];
 for(const sizeKey of addition.sizeKeys){const size=family.sizes.find(s=>s.key===sizeKey);
  try{const template=scaleTemplate(native.template,native.template.katalog.plateMm,[size.widthMm,size.heightMm],fonts,{contain:true}),fit=assessDesignTarget({master,template,family,size,fonts,motifs:()=>native.motifs});
   if(fit.status==='passt')accepted.push(sizeKey);else skipped.push({designId:master.id,sizeKey,status:fit.status,issues:fit.issues});
  }catch(error){skipped.push({designId:master.id,sizeKey,status:'passt nicht',issues:[error.message]});}
 }
 if(!accepted.length)continue;
 const json=JSON.parse(before),beforeSizes=json.sizes??null;json.sizes=[...new Set([...(json.sizes||[]),...accepted])];
 const indent=before.match(/\n([ \t]+)"/)?.[1]||' ',eol=before.includes('\r\n')?'\r\n':'\n';
 const sizesField=new RegExp('^'+indent+'"sizes"\\s*:\\s*\\[[\\s\\S]*?\\]','m');
 if(!sizesField.test(before))throw Error('Explizites Größenfeld fehlt: '+master.id);
 const formatted=JSON.stringify(json.sizes,null,indent).split('\n').join(eol+indent);
 const after=before.replace(sizesField,()=>indent+'"sizes": '+formatted);
 if(JSON.stringify(JSON.parse(after))!==JSON.stringify(json))throw Error('Größenfeld konnte nicht verlustfrei ergänzt werden.');
 changes.push({designId:master.id,file:path.relative(katalog.root,original.jsonFile).replaceAll('\\','/'),beforeSha:sha(before),afterSha:sha(after),beforeSizes,added:accepted,afterSizes:json.sizes});
 if(args['--apply']===true){if(sha(fs.readFileSync(original.jsonFile))!==sha(before))throw Error('Quelle gleichzeitig geändert.');fs.writeFileSync(original.jsonFile,after);}
}
const report={schema:'gravuru-family-size-additions/v1',source:'https://github.com/Chris83638w/gravuru-2027/issues/48#issuecomment-6557254364',applied:args['--apply']===true,masters:masters.length,candidates:candidates.additions.reduce((s,a)=>s+a.sizeKeys.length,0),changedDesigns:changes.length,addedSizes:changes.reduce((s,c)=>s+c.added.length,0),changes,skipped};
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({masters:report.masters,candidates:report.candidates,changedDesigns:report.changedDesigns,addedSizes:report.addedSizes,skipped:skipped.length,applied:report.applied}));
