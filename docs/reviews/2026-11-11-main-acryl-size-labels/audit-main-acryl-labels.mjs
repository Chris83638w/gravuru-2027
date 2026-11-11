import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
const root=path.resolve(process.argv[2]??'.');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const base='work/product-plans-run-v9/Tuerschild-Acrylglas-3mm_v4/';
const source=read(base+'source-document.json'), plan=read(base+'plan.json');
const cfg=source.config??source.document?.config;
if(!cfg)throw Error('Unexpected source shape: '+Object.keys(source));
const toCm=n=>String(Number((Number(n)/10).toFixed(8))).replace('.',',');
function comparison(s,geometry){
 const m=s.label.match(/([\d.,]+)\s*[×x]\s*([\d.,]+)\s*cm/);
 if(!m)return {key:s.key,label:s.label,unparsed:true};
 const stated=m.slice(1).map(x=>Number(x.replace(',','.'))), actual=[geometry.width,geometry.height].map(x=>x/10);
 return {key:s.key,label:s.label,widthMm:geometry.width,heightMm:geometry.height,exactLabel:`${toCm(geometry.width)} × ${toCm(geometry.height)} cm`,matches:stated.every((x,i)=>Math.abs(x-actual[i])<1e-8)};
}
const formats=cfg.familyFormats.formats;
const main=formats.find(s=>s.key.includes('RE-70X23P3-'));
const nativePlan=plan.products[0].document.config.familyFormats.formats.find(s=>s.key===main.key);
const normalized=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(root,'work/product-plans-run-v9/sources/normalized-inputs.json.gz'))));
const workbook=normalized.workbooks.find(w=>w.name==='Tuerschild-Acrylglas-3mm_v4.xlsx');
const families=['acryl/acryl-3mm-tuerschilder-schwarz','acryl/acryl-3mm-tuerschilder-anthrazit','edelstahl/steel-door-signs'].map(name=>{
 const f=read('work/product-plans-catalog/familien/'+name+'.json');
 const comparisons=f.sizes.map(s=>comparison(s,{width:s.widthMm,height:s.heightMm}));
 return {path:'familien/'+name+'.json',familyId:f.id,total:comparisons.length,mismatches:comparisons.filter(s=>s.matches===false),unparsed:comparisons.filter(s=>s.unparsed),target:f.sizes.find(s=>s.key.includes('RE-70X23P3-'))};
});
const checks=formats.map(s=>comparison(s,s.geometry));
const output={sourceSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,base+'source-document.json'))).digest('hex'),planId:plan.id,planHash:plan.planHash,valid:plan.valid,main:{key:main.key,label:main.label,geometry:main.geometry,variantCount:main.variants.reduce((n,v)=>n+v.mounting.length,0),variants:main.variants.map(v=>({color:v.color,familyId:v.familyId,sizeKey:v.sizeKey,basePriceCents:v.basePriceCents,mounting:v.mounting.map(m=>({id:m.id,priceCents:m.priceCents,totalCents:m.priceCents+v.basePriceCents}))})),samePlanGeometry:isDeepStrictEqual(main.geometry,nativePlan.geometry)},mainFormatCount:formats.length,mainLabelMismatches:checks.filter(s=>s.matches===false),mainUnparsedLabels:checks.filter(s=>s.unparsed),families,excelVariant:workbook.variants.find(v=>v.variantKey==='TS-Acryl-RE-70X23P3-T30')};
fs.writeFileSync(path.join(root,'work/restabschluss/main-acryl-7x2-local-audit.json'),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({main:output.main,mainFormatCount:formats.length,mismatches:output.mainLabelMismatches,unparsed:output.mainUnparsedLabels,families:families.map(f=>({id:f.familyId,total:f.total,mismatches:f.mismatches.length,unparsed:f.unparsed.length}))},null,2));
