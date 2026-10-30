// Pure model-bound geometry, shared by preview, validation and production.
export const DOORBELL_SCHEMA='gravuru-doorbell/v1';
export const isLayeredDoorbell=c=>c?.doorbell?.schema===DOORBELL_SCHEMA;
const clone=v=>structuredClone(v),equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const fail=m=>{throw Error('Funkklingel: '+m);};
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const cents=n=>Number.isSafeInteger(n)&&n>=0&&n<=100000000;
const id=s=>typeof s==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(s);
const fixedDecoration=o=>o?.type==='motif'&&o.uxDecoration===true&&o.customerEditable===false&&o.templateOrigin===true;
function rect(r,label,w,h){
 if(!r||!['x','y','width','height'].every(k=>finite(r[k]))||r.width<=0||r.height<=0||r.x<-.05||r.y<-.05||r.x+r.width>w+.05||r.y+r.height>h+.05)fail(label+' liegt nicht vollständig auf der Platte.');
}
// Preserve absolute original Bézier/arc coordinates. Device cuts are translated,
// never rotated/scaled; arc radii and sweep flags remain unchanged.
export function translateDoorbellPath(path,dx=0,dy=0){
 if(typeof path!=='string'||!path.trim()||path.length>200000||!finite(dx)||!finite(dy))fail('Ungültiger Konturpfad.');
 const rx=/[A-Za-z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g;
 const tokens=path.match(rx)||[];
 if(path.replace(rx,'').replace(/[\s,]/g,''))fail('Ungültiger Konturpfad.');
 const arity={M:2,L:2,H:1,V:1,C:6,S:4,Q:4,T:2,A:7,Z:0},out=[];
 let i=0,command=null,started=false;
 while(i<tokens.length){
  if(/^[A-Za-z]$/.test(tokens[i])){
   command=tokens[i++];if(!(command in arity))fail('Kontur benötigt absolute SVG-Befehle.');
   if(!started&&command!=='M')fail('Kontur muss mit M beginnen.');started=true;
   if(command==='Z'){out.push('Z');command=null;continue;}
  }
  if(!command||i+arity[command]>tokens.length)fail('Unvollständiger Konturpfad.');
  const values=tokens.slice(i,i+arity[command]).map(Number);if(!values.every(finite))fail('Ungültige Konturkoordinaten.');i+=values.length;
  const shifted=values.map((n,k)=>command==='H'?n+dx:command==='V'?n+dy:command==='A'?(k===5?n+dx:k===6?n+dy:n):n+(k%2?dy:dx));
  if(command==='A'&&(values[0]<0||values[1]<0||![0,1].includes(values[3])||![0,1].includes(values[4])))fail('Ungültiger Bogen.');
  out.push(command+' '+shifted.map(n=>Number(n.toFixed(9))).join(' '));if(command==='M')command='L';
 }
 if(!started)fail('Leerer Konturpfad.');return out.join(' ');
}
export function doorbellSelection(config,values={}){
 if(!isLayeredDoorbell(config))fail('Unbekanntes Modellformat.');
 if(!values||typeof values!=='object'||Array.isArray(values))fail('Ungültige Auswahl.');
 const options=Object.fromEntries((config.profile.optionGroups||[]).map(g=>[g.id,values[g.id]??g.defaultValueId]));
 options.position=values.position??config.doorbell.defaultPosition??'standard';
 for(const g of config.profile.optionGroups||[])if(!g.values.some(v=>v.id===options[g.id]))fail('Ungültige Auswahl: '+g.name);
 if(!['standard','opposite'].includes(options.position))fail('Ungültige Klingelposition.');
 const format=config.doorbell.formats?.find(f=>f.key===options.format);if(!format)fail('Unbekanntes Schildformat.');
 return {options,format};
}
export const doorbellPriceBase=(c,o={})=>doorbellSelection(c,o).format.basePriceCents;
const moved=(r,dx,dy)=>({...r,x:r.x+dx,y:r.y+dy});
function freeArea(g,frame){
 const a=frame.acrylic,b=g.bell,gap=5;
 const list=[
  {left:a.x,top:a.y,right:a.x+a.width,bottom:Math.min(a.y+a.height,b.y-gap)},
  {left:a.x,top:Math.max(a.y,b.y+b.height+gap),right:a.x+a.width,bottom:a.y+a.height},
  {left:a.x,top:a.y,right:Math.min(a.x+a.width,b.x-gap),bottom:a.y+a.height},
  {left:Math.max(a.x,b.x+b.width+gap),top:a.y,right:a.x+a.width,bottom:a.y+a.height}
 ].filter(r=>r.right>r.left&&r.bottom>r.top);
 return list.sort((a,b)=>(b.right-b.left)*(b.bottom-b.top)-(a.right-a.left)*(a.bottom-a.top))[0]||{left:a.x,top:a.y,right:a.x+a.width,bottom:a.y+a.height};
}
export function selectedDoorbellProfile(config,values={}){
 const {options,format}=doorbellSelection(config,values),p=clone(config.profile),f=format.profile;
 for(const key of ['geometry','frames','mounting','materials','manufacturing','designs'])p[key]=clone(f[key]);
 p.admin={...clone(f.admin||{}),...clone(p.admin||{})};
 // Reference mid-tone from the retained drawing gradients; never a production ink.
 p.material={...p.material,color:options.color==='anthrazit'?'#33383e':'#111214'};
 p.doorbellSchema=DOORBELL_SCHEMA;p.modelKey=config.doorbell.modelKey;p.formatKey=format.key;p.doorbellSelection=clone(options);
 const g=p.geometry;g.shape='rect';g.cornerRadiusMm=0;g.safeMarginMm=0;
 if(options.position==='opposite'){
  const dx=g.width-2*g.bell.x-g.bell.width,dy=g.height-2*g.bell.y-g.bell.height;
  g.bell=moved(g.bell,dx,dy);if(g.bellImageBounds)g.bellImageBounds=moved(g.bellImageBounds,dx,dy);
  g.cutPaths=g.cutPaths.map(path=>translateDoorbellPath(path,dx,dy));
  if(g.cutBoundsMm)g.cutBoundsMm=g.cutBoundsMm.map(r=>moved(r,dx,dy));
  p.designs=p.designs.map(d=>({...d,objects:d.objects.map(o=>({...o,x:g.width-o.x,y:g.height-o.y,rotation:(o.rotation||0)+(o.uxDecoration?180:0)}))}));
 }
 const mounting=p.mounting.options.find(m=>m.key===options.mounting);
 g.holes=mounting?.visibleScrews?p.mounting.holes.map(h=>({...h,diameter:p.mounting.holeDiameterMm})):[];
 delete p.mountingPreview; // Layered studioSvg renders screws once from mounting.options.
 const frame=p.frames.find(f=>f.key===options.frame);if(!frame)fail('Unbekannte Rahmenausführung.');
 g.designArea=freeArea(g,frame);return p;
}
export function selectedDoorbellDesign(c,id,o={}){
 const d=selectedDoorbellProfile(c,o).designs.find(d=>d.id===id);if(!d)fail('Design gehört nicht zum Modell.');return d;
}
export function doorbellLayoutIssue(o,p){
 const a=p.frames?.find(f=>f.key===p.doorbellSelection?.frame)?.acrylic;
 if(!a)return 'Die ausgewählte Acrylfläche fehlt.';
 if(!['x','y','w','h','rotation'].every(k=>finite(o[k]))||o.w<=0||o.h<=0)return 'Ungültige Elementmaße.';
 const t=o.rotation*Math.PI/180,w=Math.abs(o.w*Math.cos(t))+Math.abs(o.h*Math.sin(t)),h=Math.abs(o.w*Math.sin(t))+Math.abs(o.h*Math.cos(t)),b=p.geometry.bell;
 const r={left:o.x-w/2,right:o.x+w/2,top:o.y-h/2,bottom:o.y+h/2};
 if(r.left<a.x-.05||r.top<a.y-.05||r.right>a.x+a.width+.05||r.bottom>a.y+a.height+.05)return 'Element ragt über die Gestaltungsfläche hinaus.';
 // Original fixed decorative paths may surround the device (an L-shaped path's
 // bounding box covers empty space). Preserve that source rule; a customer flag
 // alone never exempts an added/moved/replaced object from device collisions.
 const fixedDecoration=o.uxDecoration===true&&(p.designs||[]).some(d=>d.objects.some(s=>s.uxDecoration===true&&['id','type','motif','x','y','w','h','rotation'].every(k=>equal(o[k],s[k]))));
 if(fixedDecoration)return '';
 if(Math.min(r.right,b.x+b.width)-Math.max(r.left,b.x)>.1&&Math.min(r.bottom,b.y+b.height)-Math.max(r.top,b.y)>.1)return 'Element überlappt die Klingel.';
 return '';
}
// Match preserved native template IDs. Text/font/size edits, deletion, custom
// additions and physical offsets survive; a no-op selection never transforms twice.
export function switchDoorbellDesign(c,design,fromOptions,toOptions){
 const from=selectedDoorbellProfile(c,fromOptions),to=selectedDoorbellProfile(c,toOptions);
 const old=from.designs.find(d=>d.id===design.id),next=to.designs.find(d=>d.id===design.id);
 if(!old||!next)fail('Design fehlt im gewählten Format.');
 if(equal(from.doorbellSelection,to.doorbellSelection))return clone(design);
 if(from.formatKey===to.formatKey){
  if(from.doorbellSelection.position===to.doorbellSelection.position)return clone(design);
  const delta=to.doorbellSelection.position==='opposite'?180:-180;
  return {...clone(next),objects:design.objects.map(o=>({...clone(o),x:to.geometry.width-o.x,y:to.geometry.height-o.y,rotation:(o.rotation||0)+(o.uxDecoration?delta:0)}))};
 }
 const a=from.geometry.designArea,b=to.geometry.designArea;
 const free=o=>({...clone(o),x:b.left+(o.x-a.left)*(b.right-b.left)/(a.right-a.left),y:b.top+(o.y-a.top)*(b.bottom-b.top)/(a.bottom-a.top)});
 const decorations=next.objects.filter(fixedDecoration),objects=[];
 let placed=false;
 for(const o of design.objects){
  if(fixedDecoration(old.objects.find(s=>s.id===o.id))){if(!placed){objects.push(...clone(decorations));placed=true;}continue;}
  const a=old.objects.find(s=>s.id===o.id),b=next.objects.find(s=>s.id===o.id);if(!a||!b){objects.push(free(o));continue;}
  const result=clone(b);
  for(const key of new Set([...Object.keys(a),...Object.keys(o)]))if(!['id','x','y'].includes(key)&&!equal(o[key],a[key])){if(Object.hasOwn(o,key))result[key]=clone(o[key]);else delete result[key];}
  result.x=b.x+(o.x-a.x);result.y=b.y+(o.y-a.y);objects.push(result);
 }
 if(!placed&&decorations.length){const added=objects.findIndex(o=>!old.objects.some(s=>s.id===o.id));objects.splice(added<0?objects.length:added,0,...clone(decorations));}
 return {...clone(next),objects};
}
export function validateDoorbellDefinition(c){
 if(!isLayeredDoorbell(c))fail('Unbekannte Schemaversion.');
 const d=c.doorbell,p=c.profile;
 if(!id(d.modelKey)||!p||p.kind!=='layered-doorbell'||p.material?.kind!=='acrylic'||p.material.thicknessMm!==3||p.processing?.profileId!=='acrylic-engraving'||c.acrylic||c.steelFormats)fail('Native mehrlagige Modellzuordnung fehlt.');
 if(!Array.isArray(d.formats)||d.formats.length!==3||new Set(d.formats.map(f=>f.key)).size!==3||!d.formats.some(f=>f.key===d.defaultFormatKey)||!['standard','opposite'].includes(d.defaultPosition??'standard'))fail('Drei eindeutige Formate und eine gültige Standardposition angeben.');
 const ids=p.designs?.map(x=>x.id);if(!ids?.length||new Set(ids).size!==ids.length||!ids.includes(p.defaultDesignId))fail('Eindeutige native Vorlagen und Standarddesign fehlen.');
 for(const f of d.formats){
  const q=f.profile,g=q?.geometry;
  if(q?.modelKey!==undefined&&q.modelKey!==d.modelKey)fail('Format gehört zu einem anderen Klingelmodell.');
  if(!id(f.key)||typeof f.label!=='string'||!f.label.trim()||!cents(f.basePriceCents)||!g||![g.width,g.height].every(v=>finite(v)&&v>=10&&v<=2000))fail('Vollständiges Format mit Maßen und Centpreis fehlt.');
  if(g.steelThicknessMm!==1.5||g.acrylicThicknessMm!==3)fail('Bestätigte Schichtstärken fehlen.');
  const size=/^(\d+)x(\d+)$/.exec(f.key);if(size&&(Math.abs(g.width-Number(size[1])*10)>.05||Math.abs(g.height-Number(size[2])*10)>.05))fail('Formatkennung und Originalmaße widersprechen sich.');
  rect(g.bell,'Gerät',g.width,g.height);if(g.bellImageBounds)rect(g.bellImageBounds,'Gerätebild',g.width,g.height);
  if(!Array.isArray(g.cutPaths)||!g.cutPaths.length||!Array.isArray(g.cutBoundsMm)||g.cutPaths.length!==g.cutBoundsMm.length)fail('Originale Geräte-Schnittkonturen fehlen.');
  g.cutPaths.forEach(path=>translateDoorbellPath(path));g.cutBoundsMm.forEach(r=>rect(r,'Schnittkontur',g.width,g.height));
  if(!Array.isArray(g.optionalCornerPaths)||g.optionalCornerPaths.length!==4)fail('Vier originale Montagekonturen fehlen.');g.optionalCornerPaths.forEach(path=>translateDoorbellPath(path));
  if(!Array.isArray(q.frames)||q.frames.length!==4||new Set(q.frames.map(x=>x.key)).size!==4)fail('Vier eindeutige Rahmen fehlen.');
  for(const f of q.frames){rect(f.acrylic,'Acrylauflage',g.width,g.height);if(f.acrylic.thicknessMm!==undefined&&f.acrylic.thicknessMm!==3)fail('Acrylstärke widerspricht dem bestätigten Material.');}
  const m=q.mounting;
  if(!m||m.holeDiameterMm!==4||!Array.isArray(m.holes)||m.holes.length!==4||!Array.isArray(m.options)||m.options.length!==5||new Set(m.options.map(x=>x.key)).size!==5)fail('Bestätigte Befestigungsoptionen fehlen.');
  for(const h of m.holes)rect({x:h.x-m.holeDiameterMm/2,y:h.y-m.holeDiameterMm/2,width:m.holeDiameterMm,height:m.holeDiameterMm},'Montagebohrung',g.width,g.height);
  if(m.options.some(x=>!cents(x.surchargeCents)||typeof x.visibleScrews!=='boolean'))fail('Befestigungspreise fehlen.');
  if(q.materials?.acrylic?.thicknessMm!==3||q.materials?.steel?.thicknessMm!==1.5||!equal(q.materials.acrylic.colors?.map(x=>x.key),['schwarz','anthrazit']))fail('Bestätigte Materialien/Farben fehlen.');
  if(q.manufacturing?.bellImage!==false||q.manufacturing?.positionGuide!==false||q.manufacturing?.innerCuts?.operation!=='cut'||q.manufacturing?.outerContour?.operation!=='reference-only')fail('Vorschau und Fertigung sind nicht getrennt.');
  if(!equal(q.designs?.map(x=>x.id),ids)||q.designs.some(x=>!Array.isArray(x.objects)||!x.objects.length||(x.marks||[]).length))fail('Formatvorlagen müssen dieselben nativen Design-IDs und aufgelöste Gestaltungslinien besitzen.');
  for(let i=0;i<ids.length;i++){
   if(q.designs[i].objects.some(o=>o.uxDecoration===true&&!(o.type==='motif'&&o.templateOrigin===true)))fail('Gestaltungslinien müssen native Vorlagenmotive sein.');
   if(!equal(q.designs[i].objects.filter(o=>!fixedDecoration(o)).map(o=>o.id),p.designs[i].objects.filter(o=>!fixedDecoration(o)).map(o=>o.id)))fail('Native Elementidentität weicht zwischen Formaten ab.');
  }
 }
 const groups=p.optionGroups,expected={format:d.formats.map(f=>f.key),frame:d.formats[0].profile.frames.map(f=>f.key),color:['schwarz','anthrazit'],mounting:d.formats[0].profile.mounting.options.map(m=>m.key)};
 if(!Array.isArray(groups)||groups.length!==4||new Set(groups.map(g=>g.id)).size!==4)fail('Format, Rahmen, Farbe und Befestigung sind erforderlich.');
 for(const g of groups){
  if(!expected[g.id]||!equal(g.values?.map(v=>v.id),expected[g.id])||!g.values.some(v=>v.id===g.defaultValueId))fail('Unvollständige Optionsgruppe.');
  for(const v of g.values){const price=g.id==='format'?d.formats.find(f=>f.key===v.id).basePriceCents:g.id==='mounting'?d.formats[0].profile.mounting.options.find(m=>m.key===v.id).surchargeCents:0;if(v.priceCents!==price)fail('Optionspreis widerspricht dem Modellpreis.');}
 }
 for(const f of d.formats)if(!equal(f.profile.frames.map(v=>v.key),expected.frame)||!equal(f.profile.mounting.options,d.formats[0].profile.mounting.options))fail('Formate besitzen unterschiedliche Rahmen oder Befestigungsoptionen.');
 const field=p.optionFields?.find(f=>f.id==='position');
 if(!field||field.kind!=='select'||!equal(field.choices?.map(x=>x.id),['standard','opposite'])||field.choices.some(x=>(x.priceCents??0)!==0))fail('Kostenlose Gegenposition fehlt.');
 if(c.basePriceCents!==d.formats.find(f=>f.key===d.defaultFormatKey).basePriceCents)fail('Grundpreis widerspricht dem Standardformat.');
 return c;
}

