// Uses the same glyph/motif-aware templateFit as native preview, including concave corners.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {katalogFor} from '../app/workshop/design-dashboard.mjs';
import {katalogDesignToTemplate,templateFit} from '../app/workshop/katalog-convert.mjs';
import {convertFont} from '../app/workshop/font-library.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),cat=process.env.GRAVURU_KATALOG||path.resolve(root,'../grabkreuze-katzen-katalog'),out=process.env.GRAVURU_CAT_REVIEW||path.resolve(root,'../../outputs/grabkreuze-katzen-nachauftrag');
const k=katalogFor(cat,{maxAgeMs:0}),f=k.families.get('grabkreuz-acryl-5mm-schwarz'),size=f.sizes.find(s=>s.key==='KZ-A-11x20');
const masters=k.designs.masters.filter(m=>m.seriesFolder==='grabkreuze-katzen-11x20');
const names=[...new Set(masters.flatMap(m=>JSON.parse(fs.readFileSync(path.join(cat,'designs/grabkreuze-katzen-11x20',m.id,'design.json'))).fonts))];
const {fonts,missing}=await k.fontResources(names,{converter:convertFont});if(missing.length)throw Error('Missing '+missing);
const report=[];
for(const master of masters){
 const c=katalogDesignToTemplate(master,f,k.theme(master.themes?.[0]),{fonts,svgText:master.svg()});
 const fits=(margin,objects)=>templateFit({...c.template,objects}, {...f,designArea:{...f.designArea,marginMm:margin}},size,fonts,{motifs:c.motifs});
 const elements=[];
 for(const o of c.template.objects){
  const check=fits(2,[o]);let low=0,high=20;
  if(fits(0,[o]).status!=='passt')low=-1;
  else for(let i=0;i<12;i++){const mid=(low+high)/2;if(fits(mid,[o]).status==='passt')low=mid;else high=mid;}
  elements.push({id:o.id,type:o.type,text:o.text,minimumCertifiedMarginMm:Math.floor(low*1000)/1000,passes2mm:check.status==='passt',issues:check.issues});
 }
 const min=Math.min(...elements.map(e=>e.minimumCertifiedMarginMm));
 report.push({id:master.id,minimumCertifiedMarginMm:min,passes2mm:elements.every(e=>e.passes2mm),elements});
 console.log(master.id,min.toFixed(3),elements.filter(e=>!e.passes2mm).map(e=>e.id+': '+(e.text||'Motiv').replaceAll('\n',' / ')).join(' | '));
}
fs.writeFileSync(path.join(out,'randabstand-pruefung.json'),JSON.stringify({requiredMm:2,source:'Chris #76 comment 6562491600; supersedes 3 mm',method:'Binary search of native templateFit (glyph contours, motif paths including stroke, concave contour and rounded corners); conservative lower bound at 0.005 mm search resolution. Ground restriction unchanged.',designs:report},null,2)+'\n');
