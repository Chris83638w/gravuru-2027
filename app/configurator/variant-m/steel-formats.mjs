import {objectIssue,validateGeometryHoles} from '../../platform/sources/app/shared/models/design-content.mjs';
import {measureText,setTextSize} from '../../platform/sources/app/shared/models/doorbell-preview.mjs';
import {holesFor} from '../../platform/sources/app/shared/models/mounting-rules.mjs';

const fail=message=>{throw Error(message);};
export const steelSizeGroup=c=>c.profile.optionGroups.find(g=>g.id==='size');
export function validateSteelFormats(c){
 if(c.steelFormats===undefined)return;
 if(c.profile.geometry.shape==='contour')fail('Konturmaße stammen aus der Zeichnung. Bitte eine eigene Kataloggröße wählen.');
 if(c.steelFormats?.version!==1||Object.keys(c.steelFormats).length!==1)fail('Unbekannte Edelstahl-Formatversion.');
 const g=c.profile.geometry,group=steelSizeGroup(c);
 // Drill patterns stored as rules (product families) follow every resize in
 // millimetres. Fixed coordinates or several sizes with holes stay blocked.
 const holeValues=c.profile.optionGroups.flatMap(group=>group.values.filter(v=>v.holes?.length));
 if(g.holes.length||holeValues.some(v=>!v.mountingRule)||(holeValues.length&&group?.values?.length>1))fail('Größenänderungen mit festem Bohrbild benötigen eine gesonderte Freigabe. Bohrbilder aus einer Produktfamilie passen sich bei einer einzelnen Schildgröße automatisch an.');
 if(!group?.values?.length||!group.values.some(v=>v.id===group.defaultValueId))fail('Mindestens eine Schildgröße und eine Startauswahl sind erforderlich.');
 for(const v of group.values){
  if(![v.widthMm,v.heightMm].every(n=>Number.isFinite(n)&&n>=10&&n<=2000)||Math.abs(v.widthMm/g.width-v.heightMm/g.height)>1e-6)fail('Die Größen eines Schilds müssen dieselben Proportionen haben. Die Grundform unter „Schildgröße & Form“ ändern.');
  if(!Number.isSafeInteger(v.priceCents)||v.priceCents<0||v.priceCents>100000000)fail('Jede Größe benötigt einen Preis in ganzen Cent.');
 }
}
export function steelPhysicalGeometry(c,options={}){
 const g=structuredClone(c.profile.geometry);
 if(!c.steelFormats)return g;
 if(g.shape==='contour')fail('Konturmaße stammen aus der Zeichnung. Bitte eine eigene Kataloggröße wählen.');
 const group=steelSizeGroup(c),v=group.values.find(v=>v.id===(options.size??group.defaultValueId));
 if(!v)fail('Unbekannte Schildgröße.');
 const scale=v.widthMm/g.width;
 return {...g,width:v.widthMm,height:v.heightMm,cornerRadiusMm:(g.cornerRadiusMm||0)*scale,safeMarginMm:(g.safeMarginMm??2)*scale,holes:g.holes.map(h=>({...h,x:h.x*scale,y:h.y*scale}))};
}
export function enableSteelFormats(c){
 if(c.profile.geometry.shape==='contour')fail('Konturmaße stammen aus der Zeichnung. Bitte eine eigene Kataloggröße wählen.');
 if(c.steelFormats)return;
 const g=c.profile.geometry;
 c.steelFormats={version:1};
 c.profile.optionGroups.unshift({id:'size',name:'Schildgröße',required:true,defaultValueId:'size-original',values:[{id:'size-original',label:`${g.width} × ${g.height} mm`,widthMm:g.width,heightMm:g.height,priceCents:c.basePriceCents,currency:'EUR'}]});
}

// Reframe the complete composition as a group. Uniform scaling preserves
// glyphs, motifs and photo masks; original revisions remain immutable.
export function resizeSteelDocument(input,geometry){
 const d=structuredClone(input),c=d.config,p=c.profile,old=p.geometry;
 if(old.shape==='contour')fail('Konturmaße stammen aus der Zeichnung. Bitte eine eigene Kataloggröße wählen.');
 if(c.doorbell||p.material.kind!=='steel')fail('Diese Formbearbeitung gilt für einlagige Edelstahlschilder.');
 const g={...old,...geometry};
 if(![g.width,g.height,g.cornerRadiusMm,g.safeMarginMm].every(Number.isFinite)||g.width<10||g.height<10||g.width>2000||g.height>2000||!['rect','ellipse'].includes(g.shape)||g.cornerRadiusMm<0||g.cornerRadiusMm>Math.min(g.width,g.height)/2||g.safeMarginMm<0||g.safeMarginMm*2>=Math.min(g.width,g.height))fail('Bitte gültige Schildmaße, Form und Randabstand eingeben.');
 if(p.designs.some(design=>design.marks?.length))fail('Dieses Design enthält feste Konturpfade. Vor einer Formänderung diese separat aufbereiten.');
 enableSteelFormats(c);validateSteelFormats(c);
 g.holes=old.holes.map(h=>({...h,x:h.x/old.width*g.width,y:h.y/old.height*g.height}));
 p.geometry=g;validateGeometryHoles(p);
 for(const group of p.optionGroups)for(const v of group.values)if(v.holes){v.holes=v.mountingRule?holesFor(g,v.mountingRule):v.holes.map(h=>({...h,x:h.x/old.width*g.width,y:h.y/old.height*g.height}));validateGeometryHoles({...p,geometry:{...g,holes:v.holes}});}
 for(const design of p.designs){
  const original=structuredClone(design.objects);
  const maximum=Math.min((g.width-2*g.safeMarginMm)/(old.width-2*(old.safeMarginMm??2)),(g.height-2*g.safeMarginMm)/(old.height-2*(old.safeMarginMm??2)),...original.filter(o=>o.type==='text').map(o=>100/o.size));
  const at=scale=>original.map(o=>{
   const next={...o,x:g.width/2+(o.x-old.width/2)*scale,y:g.height/2+(o.y-old.height/2)*scale,w:o.w*scale,h:o.h*scale};
   if(o.type==='text'){setTextSize(next,o.size*scale);if(o.letterSpacing!==undefined)next.letterSpacing=o.letterSpacing*scale;measureText(next,c.localResources.fonts);}
   if(o.strokeWidth!==undefined)next.strokeWidth=o.strokeWidth*scale;
   return next;
  });
  let scale=maximum;
  if(at(scale).some(o=>objectIssue(o,p))){let low=0,high=scale;for(let i=0;i<55;i++){const mid=(low+high)/2;if(at(mid).some(o=>objectIssue(o,p)))high=mid;else low=mid;}scale=low*(1-1e-8);}
  design.objects=at(scale);
  if(design.objects.some(o=>objectIssue(o,p)||o.type==='text'&&(o.size<1||o.size>100)||o.letterSpacing>10))fail('Die gewählte Form ist für diese Texte zu klein. Bitte größere Maße wählen.');
  if(design.importedSource)design.importedSource.scale*=scale;
 }
 const group=steelSizeGroup(c);
 for(const v of group.values){if(Math.abs(v.widthMm-old.width)<1e-6)v.widthMm=g.width;v.heightMm=v.widthMm*g.height/g.width;v.label=`${Number(v.widthMm.toFixed(3))} × ${Number(v.heightMm.toFixed(3))} mm`;}
 return d;
}
