(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.GravuruPlateGeometry=api;})(typeof window==='object'?window:this,function(){
 'use strict';
 const PROFILE='steel-template-v1',K=.552284749831;
 const bellReference=typeof module==='object'&&module.exports?require('./doorbell-reference.js'):window.GravuruDoorbellReference;
 const bellModels=typeof module==='object'&&module.exports?require('./doorbell-models.js'):window.GravuruDoorbellModels;
 function modelFor(g){const a=g?.assembly||g;if(!a?.modelId)return bellReference;const model=bellModels.find(m=>m.id===a.modelId);if(!model)throw Error('Dieses Klingelmodell ist nicht hinterlegt.');return model;}
 function bellFootprint(g){const m=modelFor(g),r=m.bell,boxes=[r,...(m.cutBoundsMm||[]),...(m.imageBounds?[m.imageBounds]:[])];const x=Math.min(...boxes.map(b=>b.x)),y=Math.min(...boxes.map(b=>b.y));return {x:x-r.x,y:y-r.y,width:Math.max(...boxes.map(b=>b.x+b.width))-x,height:Math.max(...boxes.map(b=>b.y+b.height))-y};}
 function centeredBell(g){const a=g.assembly.acrylic||{x:0,y:0,width:g.widthMm,height:g.heightMm},r=bellFootprint(g);return {x:a.x+(a.width-r.width)/2-r.x,y:a.y+(a.height-r.height)/2-r.y};}
 function issue(message,target){throw Object.assign(Error(message),{target});}
 function validate(raw){
  const g={};for(const key of ['widthMm','heightMm','cornerRadiusMm','holeCount','holeDiameterMm','edgeMm']){if(typeof raw?.[key]!=='number'||!Number.isFinite(raw[key]))issue('Bitte alle Maße als Zahlen in Millimetern eingeben.',{field:key});g[key]=raw[key];}
  if(raw.spacers){if(![2,4].includes(raw.spacers.count)||raw.holeCount!==raw.spacers.count||raw.holeDiameterMm!==8)throw Error('Abstandshalter benötigen 2 oder 4 Bohrungen mit Ø 8 mm.');g.spacers={count:raw.spacers.count,headDiameterMm:12,holeDiameterMm:8,wallDistanceMm:10};}
  g.shape=raw.shape;if(raw.baseAcrylicThicknessMm!==undefined){if(![3,5].includes(raw.baseAcrylicThicknessMm))issue('Bitte 3 mm oder 5 mm Acrylstärke wählen.',{field:'base-acrylic-thickness'});g.baseAcrylicThicknessMm=raw.baseAcrylicThicknessMm;}
  if(raw.baseAcrylicFinish!==undefined){if(!g.baseAcrylicThicknessMm||!['weiss-matt','klar-hochglanz'].includes(raw.baseAcrylicFinish))throw Error('Bitte eine gültige Acryl-Druckausführung wählen.');g.baseAcrylicFinish=raw.baseAcrylicFinish;}
  if(!['rect','rounded','ellipse'].includes(g.shape))throw Error('Diese Form wird noch nicht unterstützt.');
  if(g.widthMm<20||g.heightMm<20||g.widthMm>600||g.heightMm>600)issue('Für diese Vorlagen sind Maße von 20 bis 600 mm vorgesehen.',{field:g.widthMm<20||g.widthMm>600?'widthMm':'heightMm'});
  if(g.cornerRadiusMm<0||g.cornerRadiusMm>Math.min(g.widthMm,g.heightMm)/2||(g.shape!=='rounded'&&g.cornerRadiusMm!==0))issue('Der Radius passt nicht zur Form.',{field:'cornerRadiusMm'});
  if(![0,2,4].includes(g.holeCount))throw Error('Bitte keine, zwei oder vier Bohrungen wählen.');
  if(g.holeDiameterMm<=0||g.holeDiameterMm>50||g.edgeMm<=0||g.edgeMm>=Math.min(g.widthMm,g.heightMm)/2)issue('Bohrdurchmesser oder Randabstand ist ungültig.',{field:g.holeDiameterMm<=0||g.holeDiameterMm>50?'holeDiameterMm':'edgeMm'});
  if(raw.holeOverrides!==undefined){
   if(!Array.isArray(raw.holeOverrides)||raw.holeOverrides.length!==g.holeCount)throw Error('Die Einzelpositionen passen nicht zur Bohrungszahl.');
   g.holeOverrides=raw.holeOverrides.map((p,i)=>{if(p===null)return null;if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||typeof p.locked!=='boolean')issue('Ungültige Einzelposition einer Bohrung.',{holes:[i]});return {x:p.x,y:p.y,locked:p.locked};});
  }
  const hs=holes(g),r=g.holeDiameterMm/2;
  function inside(x,y){const w=g.widthMm,h=g.heightMm;if(g.shape==='ellipse')return ((x-w/2)/(w/2))**2+((y-h/2)/(h/2))**2<1;const cr=g.shape==='rounded'?g.cornerRadiusMm:0;const dx=Math.max(cr-x,0,x-(w-cr)),dy=Math.max(cr-y,0,y-(h-cr));return x>0&&y>0&&x<w&&y<h&&(!cr||dx*dx+dy*dy<cr*cr);}
  // Checking the bounding square is conservative and keeps the entire drill inside the plate.
  for(const [i,p] of hs.entries()){if(![-r,r].every(dx=>[-r,r].every(dy=>inside(p.x+dx,p.y+dy))))issue('Ein Bohrloch liegt zu nah an der Kontur. Bitte Abstand oder Form ändern.',{holes:[i]});}
  for(let i=0;i<hs.length;i++)for(let j=0;j<i;j++)if(Math.hypot(hs[i].x-hs[j].x,hs[i].y-hs[j].y)<=2*r)issue('Bohrungen überschneiden sich.',{holes:[j,i]});
  if(raw.assembly!=null)g.assembly=validateAssembly(raw.assembly,g);
  if(g.spacers){const a=g.assembly?.acrylic,b=g.assembly?.bell;for(const [i,h] of holes(g).entries()){
 const fits=(plate,x,y)=>Array.from({length:32},(_,j)=>j*Math.PI/16).every(t=>contains(plate,x+6.5*Math.cos(t),y+6.5*Math.sin(t)));
 if(!fits(g,h.x,h.y)||a&&!fits(acrylicGeometry(a),h.x-a.x,h.y-a.y))issue('Abstandshalter '+(i+1)+': Der 12-mm-Kopf muss vollständig auf beiden Platten liegen. Bitte Bohrung oder Acrylplatte versetzen.',{holes:[i]});
 if(b){const f=bellFootprint(g);if(Math.hypot(Math.max(b.x+f.x-h.x,0,h.x-b.x-f.x-f.width),Math.max(b.y+f.y-h.y,0,h.y-b.y-f.y-f.height))<=6)issue('Ein Abstandshalterkopf überschneidet sich mit der Funkklingel.',{holes:[i],field:'bell-x'});}
 for(const other of holes(g).slice(0,i))if(Math.hypot(other.x-h.x,other.y-h.y)<=12)issue('Abstandshalterköpfe überschneiden sich.',{holes:[i]});
 }}
  if(typeof raw.screwClearanceAcceptedFor==='string'&&raw.screwClearanceAcceptedFor===clearanceKey(g)&&screwWarnings(g).length)g.screwClearanceAcceptedFor=raw.screwClearanceAcceptedFor;
  return g;
 }
 function holes(g){const e=g.edgeMm,w=g.widthMm,h=g.heightMm;return (g.holeCount===2?[[e,h/2],[w-e,h/2]]:g.holeCount===4?[[e,e],[w-e,e],[e,h-e],[w-e,h-e]]:[]).map(([x,y],i)=>({x:g.holeOverrides?.[i]?.x??x,y:g.holeOverrides?.[i]?.y??y,diameter:g.holeDiameterMm}));}
 function contains(g,x,y){const w=g.widthMm,h=g.heightMm;if(x<0||y<0||x>w||y>h)return false;if(g.shape==='ellipse')return ((x-w/2)/(w/2))**2+((y-h/2)/(h/2))**2<=1;const r=g.shape==='rounded'?g.cornerRadiusMm:0;return !r||Math.max(r-x,0,x-w+r)**2+Math.max(r-y,0,y-h+r)**2<=r*r;}
 function acrylicGeometry(a){return {shape:a.shape,widthMm:a.width,heightMm:a.height,cornerRadiusMm:a.cornerRadiusMm,holeCount:0,holeDiameterMm:4,edgeMm:1};}
 function validateAssembly(raw,g){
  const model=modelFor(raw),source=raw.acrylic;
  if(raw.reference!==model.revision)throw Error('Das Klingel-Profil passt nicht zur gespeicherten Auswahl.');
  if(source==null&&raw.bell==null)throw Error('Bitte eine Acrylplatte oder Klingel hinzufügen.');
  let a=null;
  if(source!=null){
   a={};for(const k of ['x','y','width','height','cornerRadiusMm']){if(!Number.isFinite(source[k]))issue('Ungültige Acrylmaße.',{field:'acrylic-'+({cornerRadiusMm:'radius'}[k]||k)});a[k]=source[k];}
   if(![3,5].includes(source.thicknessMm)||!['schwarz','anthrazit','weiss-matt','klar-hochglanz'].includes(source.color))throw Error('Acryl benötigt 3 mm oder 5 mm Stärke und eine hinterlegte Farbe.');
   a.shape=source.shape;a.thicknessMm=source.thicknessMm;a.color=source.color;try{validate(acrylicGeometry(a));}catch(e){e.target={field:'acrylic-'+({widthMm:'width',heightMm:'height',cornerRadiusMm:'radius',shape:'shape'}[e.target?.field]||'width')};throw e;}
   if(![[a.x,a.y],[a.x+a.width,a.y],[a.x,a.y+a.height],[a.x+a.width,a.y+a.height]].every(([x,y])=>contains(g,x,y)))issue('Die Acrylplatte muss vollständig auf die Grundplatte passen.',{field:'acrylic-x'});
  }
  const b=raw.bell===null?null:{x:raw.bell?.x,y:raw.bell?.y};
  if(b){
   if(a?.thicknessMm===5||g.baseAcrylicThicknessMm===5)issue('Bei 5 mm Acrylglas ist keine Funkklingel möglich.',{field:a?.thicknessMm===5?'acrylic-thickness':'base-acrylic-thickness'});
   if(g.baseAcrylicThicknessMm)issue('Eine Funkklingel ist nur mit Edelstahl-Grundplatte möglich.',{field:'bell-model'});
   if(!Number.isFinite(b.x)||!Number.isFinite(b.y))issue('Ungültige Klingelposition.',{field:!Number.isFinite(b.x)?'bell-x':'bell-y'});
   const r=bellFootprint(raw),support=a?acrylicGeometry(a):g,ox=a?.x||0,oy=a?.y||0;
   if(![[b.x+r.x,b.y+r.y],[b.x+r.x+r.width,b.y+r.y],[b.x+r.x,b.y+r.y+r.height],[b.x+r.x+r.width,b.y+r.y+r.height]].every(([x,y])=>contains(support,x-ox,y-oy)))issue('Die Funkklingel muss vollständig auf die '+(a?'Acrylplatte':'Grundplatte')+' passen.',{field:'bell-x'});
  }
  for(const [i,h] of holes(g).entries()){
   const r=h.diameter/2;
   if(a){const px=h.x-a.x,py=h.y-a.y,corners=[[-r,-r],[r,-r],[-r,r],[r,r]];
    const inside=corners.every(([dx,dy])=>contains(acrylicGeometry(a),px+dx,py+dy));
    const outside=h.x+r<=a.x||h.y+r<=a.y||h.x-r>=a.x+a.width||h.y-r>=a.y+a.height;
    if(!inside&&!outside)issue('Eine Bohrung liegt am Acrylrand. Bitte Platte oder Bohrung versetzen.',{holes:[i]});
   }
   if(b&&(()=>{const f=bellFootprint(raw);return Math.hypot(Math.max(b.x+f.x-h.x,0,h.x-b.x-f.x-f.width),Math.max(b.y+f.y-h.y,0,h.y-b.y-f.y-f.height))<=r;})())issue('Die Funkklingel überdeckt eine Befestigungsbohrung.',{holes:[i],field:'bell-x'});
  }
  return {reference:model.revision,...(raw.modelId?{modelId:raw.modelId}:{}),acrylic:a,bell:b};
 }
 function acrylicHoles(g){const a=g.assembly?.acrylic;if(!a)return [];return holes(g).filter(h=>contains(acrylicGeometry(a),h.x-a.x,h.y-a.y)).map(h=>({...h,x:h.x-a.x,y:h.y-a.y}));}
 function cutSVG(g){if(!g.assembly?.bell)return '';const a=g.assembly.acrylic||{x:0,y:0},b=g.assembly.bell,model=modelFor(g),r=model.bell;return `<g transform="translate(${b.x-r.x-a.x} ${b.y-r.y-a.y})" fill="none" stroke="#FF0000" stroke-width="0.001" data-coreldraw-outline="hairline">${model.cutPaths.map(d=>`<path d="${d}"/>`).join('')}</g>`;}
 function assemblyPreview(g){if(!g.assembly)return '';const a=g.assembly.acrylic,b=g.assembly.bell;let s='<g pointer-events="none" data-assembly-preview="true">';if(a){const outline=geometry(acrylicGeometry(a)).outline;s+=`<path d="${outline}" transform="translate(${a.x+1.35} ${a.y+1.35})" fill="#555" opacity="${a.color==='klar-hochglanz'?.12:1}"/><path d="${outline}" transform="translate(${a.x} ${a.y})" fill="${a.color==='weiss-matt'?'#ffffff':a.color==='klar-hochglanz'?'#dce8ee':a.color==='schwarz'?'#202326':'#45494c'}" opacity="${a.color==='klar-hochglanz'?.22:1}" stroke="#87959d" stroke-width=".3"/>`;for(const h of acrylicHoles(g))s+=`<circle cx="${a.x+h.x}" cy="${a.y+h.y}" r="${h.diameter/2}" fill="#eee"/>`;}if(b){const model=modelFor(g),r=model.bell;if(model.imageUrl){const im=model.imageBounds||r;const clipped=model.id==='aosu-ultra-v8s1ax15-16x28',clip='bell-silhouette-'+String(b.x).replace('.','-')+'-'+String(b.y).replace('.','-');if(clipped)s+=`<defs><clipPath id="${clip}" clipPathUnits="objectBoundingBox"><path d="M.24 .008H.76Q.978 .008 .978 .08V.92Q.978 .992 .76 .992H.24Q.022 .992 .022 .92V.08Q.022 .008 .24 .008Z"/></clipPath></defs>`;s+=`<image ${clipped?`clip-path="url(#${clip})"`:""} href="${model.imageUrl}" x="${b.x+im.x-r.x}" y="${b.y+im.y-r.y}" width="${im.width}" height="${im.height}" preserveAspectRatio="none"/>`;}else s+=`<rect x="${b.x}" y="${b.y}" width="${r.width}" height="${r.height}" rx="4" fill="#32363a" stroke="#00BFFF" stroke-width=".5"/><circle cx="${b.x+r.width/2}" cy="${b.y+r.height*.73}" r="12" fill="#666" stroke="#ccc" stroke-width=".5"/>`;}return s+'</g>';}
 function ellipse(cx,cy,rx,ry){return `M${cx+rx} ${cy}C${cx+rx} ${cy+K*ry} ${cx+K*rx} ${cy+ry} ${cx} ${cy+ry}C${cx-K*rx} ${cy+ry} ${cx-rx} ${cy+K*ry} ${cx-rx} ${cy}C${cx-rx} ${cy-K*ry} ${cx-K*rx} ${cy-ry} ${cx} ${cy-ry}C${cx+K*rx} ${cy-ry} ${cx+rx} ${cy-K*ry} ${cx+rx} ${cy}Z`;}
 // Only the construction preview may render collisions; production always validates.
 function previewInput(raw){
  validate({...raw,spacers:undefined,holeCount:0,holeOverrides:[],holeDiameterMm:4,edgeMm:1,assembly:null});
  if(![0,2,4].includes(raw.holeCount)||!Number.isFinite(raw.holeDiameterMm)||raw.holeDiameterMm<=0||raw.holeDiameterMm>50||!holes(raw).every(h=>Number.isFinite(h.x)&&Number.isFinite(h.y)))throw Error('Unvollständige Bohrungsmaße.');
  if(raw.assembly){const a=raw.assembly.acrylic;if(a){validate(acrylicGeometry(a));if(!Number.isFinite(a.x)||!Number.isFinite(a.y))throw Error('Unvollständige Acrylposition.');}const b=raw.assembly.bell;if(b&&(!Number.isFinite(b.x)||!Number.isFinite(b.y)))throw Error('Unvollständige Klingelposition.');}
  return raw;
 }
 function symmetricHoles(raw,index){
  const hs=holes(raw),p=hs[index];if(!p||![2,4].includes(raw.holeCount))throw Error('Bitte eine Ausgangsbohrung wählen.');
  const left=index%2===0?p.x:raw.widthMm-p.x,top=index<2?p.y:raw.heightMm-p.y;
  return hs.map((h,i)=>({x:i%2===0?left:raw.widthMm-left,y:raw.holeCount===2?p.y:(i<2?top:raw.heightMm-top),locked:raw.holeOverrides?.[i]?.locked??true}));
 }
 function holesAreSymmetric(g){
  const hs=holes(g),near=(a,b)=>Math.abs(a-b)<.05;
  if(![2,4].includes(hs.length)||!hs.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)))return null;
  if(hs.length===2)return near(hs[0].x+hs[1].x,g.widthMm)&&near(hs[0].y,hs[1].y)&&((hs[0].x<g.widthMm/2&&hs[1].x>g.widthMm/2)||(hs[1].x<g.widthMm/2&&hs[0].x>g.widthMm/2));
  if(new Set(hs.map(p=>(p.x<g.widthMm/2?'L':p.x>g.widthMm/2?'R':'C')+(p.y<g.heightMm/2?'T':p.y>g.heightMm/2?'B':'C'))).size!==4||hs.some(p=>near(p.x,g.widthMm/2)||near(p.y,g.heightMm/2)))return false;
  const has=(x,y)=>hs.some(p=>near(p.x,x)&&near(p.y,y));
  return hs.every(p=>has(g.widthMm-p.x,p.y)&&(hs.length===2||has(p.x,g.heightMm-p.y)));
 }
 function clearanceKey(g){
  const a=g.assembly?.acrylic,b=g.assembly?.bell;
  return JSON.stringify({version:1,plate:[g.widthMm,g.heightMm,g.shape,g.cornerRadiusMm,...(g.baseAcrylicThicknessMm?[g.baseAcrylicThicknessMm]:[])],holes:holes(g).map(h=>[h.x,h.y,h.diameter]),acrylic:a?[a.x,a.y,a.width,a.height,a.shape,a.cornerRadiusMm,a.thicknessMm]:null,bell:b?[b.x,b.y,g.assembly.reference,...(g.assembly.modelId?[g.assembly.modelId]:[])]:null});
 }
 function clearanceAccepted(g){return g.screwClearanceAcceptedFor===clearanceKey(g);}
 function anchorPosition(g,key,width=0,height=0,inset=0){
  if(!/^[012][012]$/.test(key)||![width,height,inset,g.widthMm,g.heightMm].every(Number.isFinite)||inset<0)throw Error('Ungültiger Ankerpunkt.');
  const [column,row]=key.split('').map(Number),xs=[inset,(g.widthMm-width)/2,g.widthMm-width-inset],ys=[inset,(g.heightMm-height)/2,g.heightMm-height-inset];
  return {x:Math.round(xs[column]*100)/100,y:Math.round(ys[row]*100)/100};
 }
 function snapAcrylicCenter(g,a,tolerance=3){
  const center=anchorPosition(g,'11',a.width,a.height);
  return Math.hypot(a.x-center.x,a.y-center.y)<=tolerance?{...a,...center}:{...a};
 }
 function resizeAcrylic(a,handle,dx,dy){
  const result={...a},clamp=v=>Math.max(20,Math.min(600,Math.round(v*10)/10));
  if(handle.includes('e'))result.width=clamp(a.width+dx);
  if(handle.includes('s'))result.height=clamp(a.height+dy);
  if(handle.includes('w')){result.width=clamp(a.width-dx);result.x=Math.round((a.x+a.width-result.width)*10)/10;}
  if(handle.includes('n')){result.height=clamp(a.height-dy);result.y=Math.round((a.y+a.height-result.height)*10)/10;}
  return result;
 }
 function screwWarnings(g,detailed=false){
  if(!g.assembly)return [];const a=g.assembly.acrylic,b=g.assembly.bell,ag=a?acrylicGeometry(a):null,warnings=[];
  for(const [i,h] of holes(g).entries()){
   const r=h.diameter/2+2;
   const fullyOnAcrylic=a&&[[-r,-r],[r,-r],[-r,r],[r,r]].every(([dx,dy])=>contains(ag,h.x+dx-a.x,h.y+dy-a.y));
   const nearAcrylic=a&&Math.hypot(Math.max(a.x-h.x,0,h.x-a.x-a.width),Math.max(a.y-h.y,0,h.y-a.y-a.height))<r;
   const f=b?bellFootprint(g):null;const nearBell=b&&Math.hypot(Math.max(b.x+f.x-h.x,0,h.x-b.x-f.x-f.width),Math.max(b.y+f.y-h.y,0,h.y-b.y-f.y-f.height))<r;
   if((nearAcrylic&&!fullyOnAcrylic)||nearBell)warnings.push({target:{holes:[i],field:nearBell?'bell-x':'acrylic-x',preferField:true},message:`Bohrung ${i+1}: Für den Schraubenkopf werden rund um das Loch 2 mm zusätzlicher Freiraum benötigt. ${nearBell?'Bitte die Klingel oder das Bohrloch verschieben.':'Bitte die Acrylplatte einrücken, damit genügend Platz für den Schraubenkopf bleibt.'} ${nearBell?'Die Klingel':'Der Acrylrand'} liegt im benötigten Bereich. Wenn du diese Anordnung trotzdem beibehalten möchtest, bestätige den Hinweis ausdrücklich. Der Bohrdurchmesser bleibt unverändert.`});
  }return detailed?warnings:warnings.map(w=>w.message);
 }
 function geometry(raw,preview=false){const g=preview?previewInput(raw):validate(raw),w=g.widthMm,h=g.heightMm,r=g.shape==='rounded'?g.cornerRadiusMm:0,a=K*r;
  const outline=g.shape==='ellipse'?ellipse(w/2,h/2,w/2,h/2):`M${r} 0H${w-r}C${w-r+a} 0 ${w} ${r-a} ${w} ${r}V${h-r}C${w} ${h-r+a} ${w-r+a} ${h} ${w-r} ${h}H${r}C${r-a} ${h} 0 ${h-r+a} 0 ${h-r}V${r}C0 ${r-a} ${r-a} 0 ${r} 0Z`;
  const hs=holes(g).map(p=>({x:p.x,y:p.y,r:p.diameter/2}));return {outline,holes:hs,clip:outline+hs.map(p=>ellipse(p.x,p.y,p.r,p.r)).join(' '),gap:0};
 }
 function product(raw,id,title){const g=validate(raw);return {id,title,templateProfile:PROFILE,templateGeometry:g,material:g.baseAcrylicThicknessMm?'Acryl':'Edelstahl',method:'engraving',shape:g.shape,widthMm:g.widthMm,heightMm:g.heightMm,thicknessMm:g.baseAcrylicThicknessMm||1.5,cornerRadiusMm:g.cornerRadiusMm,configured:false,previewEnabled:true,productionConfirmed:false,groupName:'Edelstahl · Maßvorlage',holeOptions:[{count:g.holeCount,edgeMm:g.edgeMm,holes:holes(g)}]};}
 function initialAcrylic(raw){
  const g=validate({...raw,spacers:undefined,assembly:undefined}), hs=holes(g);
  // Start noticeably inset, then shrink until holes and screw heads are clear.
  for(let scale=.8;scale>=.05;scale-=.025){
   const width=Math.round(g.widthMm*scale*10)/10,height=Math.round(g.heightMm*scale*10)/10;
   if(width<20||height<20)break;
   const a={x:(g.widthMm-width)/2,y:(g.heightMm-height)/2,width,height,shape:'rect',cornerRadiusMm:0,thicknessMm:3,color:'anthrazit'};
   if(hs.some(h=>Math.hypot(Math.max(a.x-h.x,0,h.x-a.x-width),Math.max(a.y-h.y,0,h.y-a.y-height))<=h.diameter/2+3))continue;
   try{validate({...g,assembly:{reference:bellReference.revision,acrylic:a,bell:null}});return a;}catch{}
  }
  throw Error('Hier passt mittig keine Acrylplatte mit ausreichend Abstand zu den Bohrungen. Bitte zuerst die Plattengröße oder Bohrpositionen anpassen.');
 }
 function spacerPreview(g){if(!g.spacers)return '';return '<g data-spacer-heads="true" pointer-events="none"><defs><linearGradient id="spacer-metal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f9fafb"/><stop offset=".18" stop-color="#929a9f"/><stop offset=".40" stop-color="#e8ecef"/><stop offset=".55" stop-color="#ffffff"/><stop offset=".72" stop-color="#a4adb3"/><stop offset="1" stop-color="#657077"/></linearGradient><radialGradient id="spacer-face" cx="32%" cy="24%" r="85%"><stop stop-color="#fafcfd"/><stop offset=".5" stop-color="#d4dade"/><stop offset="1" stop-color="#969fa6"/></radialGradient></defs>'+holes(g).map(h=>`<ellipse cx="${h.x+.65}" cy="${h.y+1.1}" rx="6.25" ry="6.1" fill="#17232c" opacity=".2"/><circle cx="${h.x}" cy="${h.y}" r="6" fill="url(#spacer-metal)" stroke="#6b757c" stroke-width=".18"/><circle cx="${h.x}" cy="${h.y}" r="5.25" fill="url(#spacer-face)" stroke="#f2f5f7" stroke-width=".18"/><path d="M${h.x-4.6} ${h.y-1.6}Q${h.x-2} ${h.y-5.4} ${h.x+2.6} ${h.y-4.1}" fill="none" stroke="#fff" stroke-width=".35" opacity=".65"/>`).join('')+'</g>';}
 
 function withSpacers(raw,count){const g={...raw};if(!count){delete g.spacers;return validate(g)}const a=g.assembly?.acrylic||{x:0,y:0,width:g.widthMm,height:g.heightMm};g.spacers={count};g.holeCount=count;g.holeDiameterMm=8;const inset=Math.min(12,Math.min(a.width,a.height)/4);g.holeOverrides=(count===2?[[inset,a.height/2],[a.width-inset,a.height/2]]:[[inset,inset],[a.width-inset,inset],[inset,a.height-inset],[a.width-inset,a.height-inset]]).map(([x,y])=>({x:a.x+x,y:a.y+y,locked:true}));delete g.screwClearanceAcceptedFor;return validate(g);}
 return {spacerPreview,withSpacers,modelFor,bellModels,bellFootprint,centeredBell,initialAcrylic,PROFILE,validate,holes,geometry,product,contains,acrylicGeometry,acrylicHoles,cutSVG,assemblyPreview,bellReference,previewInput,symmetricHoles,screwWarnings,holesAreSymmetric,clearanceKey,clearanceAccepted,resizeAcrylic,anchorPosition,snapAcrylicCenter};
});
