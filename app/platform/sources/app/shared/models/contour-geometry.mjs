// Physical outline bounds in millimetres. Independent of catalogue/design imports.
// One explicitly closed outer path; no markup, transformations or implicit subpaths.
const fail=message=>{throw new Error('Kontur: '+message);};
const COMMANDS='MmLlHhVvCcSsQqTtAaZz';
const NUMBER=/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/;
const TAU=2*Math.PI;
const mod=a=>(a%TAU+TAU)%TAU;

function parseContourPath(path,emit=null,trace=null,toleranceMm=CONTOUR_TOLERANCE_MM,allowDegenerate=false){
 if(typeof path!=='string'||!path.trim()||path.length>200000)fail('geschlossenen SVG-Pfad mit höchstens 200000 Zeichen angeben.');
 let i=0,x=0,y=0,sx=0,sy=0,command='',previous='',control=null,started=false,closed=false,segments=0,valueRead=false;
 let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
 const whitespace=()=>{while(i<path.length&&/\s/.test(path[i]))i++;};
 const separator=()=>{whitespace();if(path[i]===','){if(!valueRead)fail('unerwartetes Komma nach Pfadbefehl.');i++;whitespace();if(path[i]===',')fail('doppeltes Komma im Pfad.');}};
 const number=()=>{separator();const m=NUMBER.exec(path.slice(i));if(!m)fail('Pfad unvollständig oder ungültige Zahl.');i+=m[0].length;valueRead=true;const v=Number(m[0]);if(!Number.isFinite(v)||Math.abs(v)>1e7)fail('Koordinate außerhalb des zulässigen Zahlenbereichs.');return v;};
 const flag=()=>{separator();const v=path[i++];valueRead=true;if(v!=='0'&&v!=='1')fail('Bogen-Flags müssen 0 oder 1 sein.');return Number(v);};
 const add=(px,py)=>{if(!Number.isFinite(px)||!Number.isFinite(py))fail('Pfadausdehnung nicht endlich.');minX=Math.min(minX,px);minY=Math.min(minY,py);maxX=Math.max(maxX,px);maxY=Math.max(maxY,py);};
 const quadratic=(a,b,c,t)=>(1-t)*(1-t)*a+2*(1-t)*t*b+t*t*c;
 const cubic=(a,b,c,d,t)=>(1-t)**3*a+3*(1-t)**2*t*b+3*(1-t)*t*t*c+t**3*d;
 const roots=(a,b,c)=>{
  const scale=Math.max(Math.abs(a),Math.abs(b),Math.abs(c),1);
  if(Math.abs(a)<=Number.EPSILON*scale*8)return Math.abs(b)<=Number.EPSILON*scale*8?[]:[-c/b];
  let disc=b*b-4*a*c;if(disc<0)return [];
  const sqrt=Math.sqrt(disc),q=-.5*(b+(b<0?-sqrt:sqrt));
  return q===0?[-b/(2*a)]:[q/a,c/q];
 };
 const polyCurve=(points,depth=0)=>{
  if(!emit)return;
  if(points.slice(1,-1).every(p=>pointSegmentDistance(p,points[0],points.at(-1))<=toleranceMm)){emit(points.at(-1));return;}
  if(depth>=24)fail('Kurve ist für die sichere Flächenprüfung zu komplex.');
  const levels=[points];while(levels.at(-1).length>1){const p=levels.at(-1);levels.push(p.slice(1).map((v,i)=>[(p[i][0]+v[0])/2,(p[i][1]+v[1])/2]));}
  polyCurve(levels.map(p=>p[0]),depth+1);polyCurve(levels.map(p=>p.at(-1)).reverse(),depth+1);
 };
 const curve=(points)=>{
  trace?.(points.length===3?'Q':'C',points.slice(1).flat());
  polyCurve(points);
  const dims=[points.map(p=>p[0]),points.map(p=>p[1])],ts=[];
  for(const v of dims){
   if(v.length===3){const den=v[0]-2*v[1]+v[2];if(den)ts.push((v[0]-v[1])/den);}
   else ts.push(...roots(-v[0]+3*v[1]-3*v[2]+v[3],2*(v[0]-2*v[1]+v[2]),v[1]-v[0]));
  }
  for(const t of ts)if(t>0&&t<1)add(...dims.map(v=>v.length===3?quadratic(...v,t):cubic(...v,t)));
  add(...points.at(-1));
 };
 const arc=(rx,ry,degrees,large,sweep,ex,ey)=>{
  trace?.('A',[rx,ry,degrees,large,sweep,ex,ey]);
  if(rx<0||ry<0)fail('Bogenradien dürfen nicht negativ sein.');
  if(rx===0||ry===0||x===ex&&y===ey){add(ex,ey);emit?.([ex,ey]);return;}
  const phi=(degrees%360)*Math.PI/180,cos=Math.cos(phi),sin=Math.sin(phi),dx=(x-ex)/2,dy=(y-ey)/2;
  const xp=cos*dx+sin*dy,yp=-sin*dx+cos*dy;
  const lambda=xp*xp/(rx*rx)+yp*yp/(ry*ry);
  if(lambda>1){const scale=Math.sqrt(lambda);rx*=scale;ry*=scale;}
  const rx2=rx*rx,ry2=ry*ry,xp2=xp*xp,yp2=yp*yp,den=rx2*yp2+ry2*xp2;
  const factor=(large===sweep?-1:1)*Math.sqrt(Math.max(0,(rx2*ry2-den)/den));
  const cxp=factor*rx*yp/ry,cyp=-factor*ry*xp/rx,cx=cos*cxp-sin*cyp+(x+ex)/2,cy=sin*cxp+cos*cyp+(y+ey)/2;
  const ux=(xp-cxp)/rx,uy=(yp-cyp)/ry,vx=(-xp-cxp)/rx,vy=(-yp-cyp)/ry;
  const start=Math.atan2(uy,ux);let delta=Math.atan2(ux*vy-uy*vx,ux*vx+uy*vy);
  if(sweep===0&&delta>0)delta-=TAU;if(sweep===1&&delta<0)delta+=TAU;
  if(emit){
   const step=2*Math.acos(Math.max(-1,1-toleranceMm/Math.max(rx,ry))),count=Math.max(1,Math.ceil(Math.abs(delta)/step));
   if(count>20000)fail('Bogen ist für die sichere Flächenprüfung zu komplex.');
   for(let j=1;j<=count;j++){const t=start+delta*j/count;emit([cx+rx*cos*Math.cos(t)-ry*sin*Math.sin(t),cy+rx*sin*Math.cos(t)+ry*cos*Math.sin(t)]);}
  }
  const onArc=angle=>(sweep?mod(angle-start):mod(start-angle))<=Math.abs(delta)+1e-12;
  const tx=Math.atan2(-ry*sin,rx*cos),ty=Math.atan2(ry*cos,rx*sin);
  for(const angle of [tx,tx+Math.PI,ty,ty+Math.PI])if(onArc(angle))add(cx+rx*cos*Math.cos(angle)-ry*sin*Math.sin(angle),cy+rx*sin*Math.cos(angle)+ry*cos*Math.sin(angle));
  add(ex,ey);
 };
 while(true){
  whitespace();if(i===path.length)break;
  if(closed)fail('nur eine geschlossene Außenkontur ist erlaubt.');
  if(COMMANDS.includes(path[i])){command=path[i++];valueRead=false;if(command.toUpperCase()==='M'&&started)fail('nur eine Außenkontur ist erlaubt.');}
  else if(!command||/[A-Za-z]/.test(path[i]))fail('unbekannter oder fehlender Pfadbefehl.');
  const c=command.toUpperCase(),relative=command===command.toLowerCase();
  if(!started&&c!=='M')fail('Pfad muss mit M beginnen.');
  if(c==='Z'){
   if(!segments)fail('Pfad enthält keine Linien oder Kurven.');
   trace?.('Z',[]);add(sx,sy);emit?.([sx,sy]);x=sx;y=sy;closed=true;continue;
  }
  if(++segments>10000)fail('zu viele Pfadsegmente.');
  const point=()=>{const px=number(),py=number();return relative?[x+px,y+py]:[px,py];};
  let nextControl=null;
  if(c==='M'){[x,y]=point();sx=x;sy=y;started=true;trace?.('M',[x,y]);add(x,y);emit?.([x,y]);command=relative?'l':'L';segments--;}
  else if(c==='L'){[x,y]=point();trace?.('L',[x,y]);add(x,y);emit?.([x,y]);}
  else if(c==='H'){const v=number();x=relative?x+v:v;trace?.('L',[x,y]);add(x,y);emit?.([x,y]);}
  else if(c==='V'){const v=number();y=relative?y+v:v;trace?.('L',[x,y]);add(x,y);emit?.([x,y]);}
  else if(c==='C'){const p1=point(),p2=point(),p3=point();curve([[x,y],p1,p2,p3]);[x,y]=p3;nextControl=p2;}
  else if(c==='S'){const p1=['C','S'].includes(previous)?[2*x-control[0],2*y-control[1]]:[x,y],p2=point(),p3=point();curve([[x,y],p1,p2,p3]);[x,y]=p3;nextControl=p2;}
  else if(c==='Q'){const p1=point(),p2=point();curve([[x,y],p1,p2]);[x,y]=p2;nextControl=p1;}
  else if(c==='T'){const p1=['Q','T'].includes(previous)?[2*x-control[0],2*y-control[1]]:[x,y],p2=point();curve([[x,y],p1,p2]);[x,y]=p2;nextControl=p1;}
  else if(c==='A'){const rx=number(),ry=number(),angle=number(),large=flag(),sweep=flag(),end=point();arc(rx,ry,angle,large,sweep,...end);[x,y]=end;}
  previous=c;control=nextControl;
 }
 if(!closed)fail('Pfad muss mit Z geschlossen sein.');
 const width=maxX-minX,height=maxY-minY;
 if(!allowDegenerate&&!(width>0&&height>0))fail('Außenkontur braucht eine positive Breite und Höhe.');
 return [minX,minY,width,height];
}

export const contourPathBounds=path=>parseContourPath(path);

export function validateContourOutline(path,width,height,tolerance=.05){
 if(![width,height,tolerance].every(Number.isFinite)||width<=0||height<=0||tolerance<0)fail('ungültige Maße.');
 const bounds=contourPathBounds(path),epsilon=1e-9;
 if(Math.abs(bounds[0])>tolerance+epsilon||Math.abs(bounds[1])>tolerance+epsilon)fail('Pfadursprung muss bei 0/0 liegen (Toleranz '+tolerance+' mm).');
 if(Math.abs(bounds[2]-width)>tolerance+epsilon||Math.abs(bounds[3]-height)>tolerance+epsilon)fail('Pfadausdehnung stimmt nicht mit Breite/Höhe überein (Toleranz '+tolerance+' mm).');
 return bounds;
}

// The original Bézier/arc path stays authoritative. Only hit tests use a bounded,
// adaptive polyline. Its 0.002 mm error is reserved on the unsafe side of checks.
export const CONTOUR_TOLERANCE_MM=.002;
const EPS=1e-9;
const cache=new Map();
const distance=(p,q)=>Math.hypot(p[0]-q[0],p[1]-q[1]);
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
function pointSegmentDistance(p,a,b){
 const dx=b[0]-a[0],dy=b[1]-a[1],length=dx*dx+dy*dy;
 const t=length?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/length)):0;
 return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);
}
function intersects(a,b,c,d){
 const abC=cross(a,b,c),abD=cross(a,b,d),cdA=cross(c,d,a),cdB=cross(c,d,b);
 if(abC*abD<0&&cdA*cdB<0)return true;
 return Math.abs(abC)<EPS&&pointSegmentDistance(c,a,b)<EPS||Math.abs(abD)<EPS&&pointSegmentDistance(d,a,b)<EPS||Math.abs(cdA)<EPS&&pointSegmentDistance(a,c,d)<EPS||Math.abs(cdB)<EPS&&pointSegmentDistance(b,c,d)<EPS;
}
function segmentDistance(a,b,c,d){
 return intersects(a,b,c,d)?0:Math.min(pointSegmentDistance(a,c,d),pointSegmentDistance(b,c,d),pointSegmentDistance(c,a,b),pointSegmentDistance(d,a,b));
}
function inside(points,p){
 let result=false;
 for(let i=0,j=points.length-1;i<points.length;j=i++){
  const a=points[j],b=points[i];
  if(p[0]>=Math.min(a[0],b[0])-EPS&&p[0]<=Math.max(a[0],b[0])+EPS&&p[1]>=Math.min(a[1],b[1])-EPS&&p[1]<=Math.max(a[1],b[1])+EPS&&pointSegmentDistance(p,a,b)<EPS)return true;
  if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])result=!result;
 }
 return result;
}
function flattened(path){
 if(cache.has(path))return cache.get(path);
 const points=[];
 const emit=p=>{if(!points.length||distance(points.at(-1),p)>EPS){if(points.length>=20000)fail('Kontur ist für die sichere Flächenprüfung zu komplex.');points.push(p);}};
 const bounds=parseContourPath(path,emit);
 if(points.length>1&&distance(points[0],points.at(-1))<EPS)points.pop();
 if(points.length<3)fail('Kontur hat keine nutzbare Fläche.');
 const edges=points.map((a,i)=>{const b=points[(i+1)%points.length];return {a,b,i,minX:Math.min(a[0],b[0]),maxX:Math.max(a[0],b[0]),minY:Math.min(a[1],b[1]),maxY:Math.max(a[1],b[1])};});
 const sorted=[...edges].sort((a,b)=>a.minX-b.minX);
 for(let i=0;i<sorted.length;i++)for(let j=i+1;j<sorted.length&&sorted[j].minX<=sorted[i].maxX+EPS;j++){
  const a=sorted[i],b=sorted[j],gap=Math.abs(a.i-b.i);
  if(gap===1||gap===points.length-1||a.maxY<b.minY-EPS||b.maxY<a.minY-EPS)continue;
  if(intersects(a.a,a.b,b.a,b.b))fail('Außenkontur überschneidet oder berührt sich selbst.');
 }
 const value={bounds,points,edges};
 if(cache.size>=32)cache.delete(cache.keys().next().value);cache.set(path,value);return value;
}
export function flattenContourPath(path){return flattened(path).points.map(p=>[...p]);}

// Reuse the physical-path command/curve parser for one closed artwork subpath.
// Unlike a plate outline, artwork may self-intersect. Its caller owns compound
// fill rules and supplies a tolerance in the path's coordinate system.
export function flattenClosedSvgPath(path,{toleranceMm=.0001}={}){
 if(!Number.isFinite(toleranceMm)||toleranceMm<=0||toleranceMm>1)fail('Ungültige Pfadtoleranz.');
 const points=[];
 parseContourPath(path,p=>{
  if(!points.length||distance(points.at(-1),p)>EPS){
   if(points.length>=20000)fail('Motiv-Unterpfad ist zu komplex.');
   points.push(p);
  }
 },null,toleranceMm,true);
 if(points.length>1&&distance(points[0],points.at(-1))<EPS)points.pop();

 return points;
}
export function validateContourGeometry(g){
 validateContourOutline(g?.outlinePath,g?.width,g?.height);
 flattened(g.outlinePath);
 if(g.holes!==undefined&&(!Array.isArray(g.holes)||g.holes.length>64||g.holes.some(h=>!h||![h.x,h.y,h.diameter].every(Number.isFinite)||h.diameter<=0||h.diameter>100)))fail('Ungültiges Bohrbild.');
 if(g.cornerRadiusMm!==undefined&&g.cornerRadiusMm!==0)fail('Freie Kontur benötigt keinen zusätzlichen Eckenradius.');
 for(const key of ['safeMarginMm','holeKeepoutMm'])if(g[key]!==undefined&&(!Number.isFinite(g[key])||g[key]<0||g[key]>Math.min(100,g.width/2,g.height/2)))fail('Ungültiger Sicherheitsabstand.');
 return g;
}
function optionsFor(g,options={}){
 const marginMm=options.marginMm??g.safeMarginMm??2,keepoutMm=options.keepoutMm??g.holeKeepoutMm??0;
 if(!Number.isFinite(marginMm)||marginMm<0||!Number.isFinite(keepoutMm)||keepoutMm<0)fail('Ungültiger Sicherheitsabstand.');
 return {marginMm,keepoutMm,holes:options.holes===false?[]:(g.holes||[])};
}
export function contourContainsPoint(g,x,y,options={}){
 const {marginMm,keepoutMm,holes}=optionsFor(g,options),{points,edges}=flattened(g.outlinePath),p=[x,y];
 if(!Number.isFinite(x)||!Number.isFinite(y)||!inside(points,p))return false;
 const reserve=marginMm>0?CONTOUR_TOLERANCE_MM:0;
 if(edges.some(e=>pointSegmentDistance(p,e.a,e.b)+EPS<marginMm+reserve))return false;
 return !holes.some(h=>Math.hypot(x-h.x,y-h.y)+EPS<h.diameter/2+keepoutMm);
}
// Points follow the perimeter (not the diagonals). Checking every whole edge,
// including distances and intersections, catches concave bites between corners.
export function contourContainsPolygon(g,input,options={}){
 const polygon=input.map(p=>Array.isArray(p)?p:[p.x,p.y]);
 if(polygon.length<3||polygon.some(p=>!p.every(Number.isFinite)))return false;
 const {marginMm,keepoutMm,holes}=optionsFor(g,options),{points,edges}=flattened(g.outlinePath);
 if(polygon.some(p=>!inside(points,p)))return false;
 const required=marginMm+CONTOUR_TOLERANCE_MM;
 for(let i=0;i<polygon.length;i++){
  const a=polygon[i],b=polygon[(i+1)%polygon.length];
  const minX=Math.min(a[0],b[0])-required,maxX=Math.max(a[0],b[0])+required,minY=Math.min(a[1],b[1])-required,maxY=Math.max(a[1],b[1])+required;
  if(edges.some(e=>e.maxX>=minX&&e.minX<=maxX&&e.maxY>=minY&&e.minY<=maxY&&segmentDistance(a,b,e.a,e.b)+EPS<required))return false;
 }
 for(const h of holes){
  const p=[h.x,h.y],r=h.diameter/2+keepoutMm;
  if(inside(polygon,p)||polygon.some((a,i)=>pointSegmentDistance(p,a,polygon[(i+1)%polygon.length])+EPS<r))return false;
 }
 return true;
}
export function contourObjectCorners(o){
 const a=(o.rotation||0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
 return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>[o.x+x*o.w/2*c-y*o.h/2*s,o.y+x*o.w/2*s+y*o.h/2*c]);
}
const xml=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function circlePath(h,r=h.diameter/2){return `M${h.x-r} ${h.y}a${r} ${r} 0 1 0 ${2*r} 0a${r} ${r} 0 1 0 ${-2*r} 0Z`;}
export function contourPathWithHoles(g){
 validateContourGeometry(g);
 return g.outlinePath+(g.holes||[]).map(h=>circlePath(h)).join('');
}
// A mask represents the true erosion even when narrow necks disappear or the
// inset splits into islands. It cannot be represented by scaling the outer path.
// bounds is a conservative box; all placement must use the predicates above.
export function contourSafeAreaSvg(g,id='contour-safe',options={}){
 validateContourGeometry(g);
 if(!/^[A-Za-z][A-Za-z0-9_-]*$/.test(id))fail('Ungültige Maskenkennung.');
 const {marginMm,keepoutMm,holes}=optionsFor(g,options),[x,y,w,h]=contourPathBounds(g.outlinePath);
 const bounds={left:x+marginMm,top:y+marginMm,right:x+w-marginMm,bottom:y+h-marginMm};
 const outline=xml(g.outlinePath);
 const defs=`<mask id="${id}" maskUnits="userSpaceOnUse" stroke="none" x="0" y="0" width="${g.width}" height="${g.height}" style="mask-type:luminance"><rect width="${g.width}" height="${g.height}" fill="black"/><path d="${outline}" fill="white"/>${marginMm>0?`<path d="${outline}" fill="none" stroke="black" stroke-width="${2*marginMm}" stroke-linejoin="round" stroke-linecap="round"/>`:''}${holes.map(h=>`<circle cx="${h.x}" cy="${h.y}" r="${h.diameter/2+keepoutMm}" fill="black"/>`).join('')}</mask>`;
 return {defs,attribute:`mask="url(#${id})"`,bounds};
}


// Exact reflection for the reverse face: controls and arc sweep are reflected,
// with no change to the physical dimensions and no polyline output.
export function mirrorContourPath(path,width){
 if(!Number.isFinite(width)||width<=0)fail('Ungültige Spiegelbreite.');
 const commands=[];
 parseContourPath(path,null,(cmd,values)=>{
  const v=[...values];
  if(cmd==='A'){v[2]=-v[2];v[4]=1-v[4];v[5]=width-v[5];}
  else for(let i=0;i<v.length;i+=2)v[i]=width-v[i];
  commands.push(cmd+v.map(n=>Object.is(n,-0)?0:n).join(' '));
 });
 return commands.join('');
}

// Absolute commands for native vector backends. Values follow SVG command order;
// H/V/S/T are normalized to L/C/Q. The source curve is never polygonized.
export function contourPathCommands(path){
 const commands=[];parseContourPath(path,null,(command,values)=>commands.push({command,values:[...values]}));return commands;
}
// Closest outer-boundary point for preview bleed. Distance/point are based on the
// same 0.002 mm polyline as containment (holes remain separate physical circles).
export function contourNearestBoundaryPoint(g,x,y){
 if(!Number.isFinite(x)||!Number.isFinite(y))fail('Ungültiger Abfragepunkt.');
 const {points,edges}=flattened(g.outlinePath);let best=null;
 for(const e of edges){
  const dx=e.b[0]-e.a[0],dy=e.b[1]-e.a[1],s=dx*dx+dy*dy,t=s?Math.max(0,Math.min(1,((x-e.a[0])*dx+(y-e.a[1])*dy)/s)):0;
  const px=e.a[0]+t*dx,py=e.a[1]+t*dy,d=Math.hypot(x-px,y-py);
  if(!best||d<best.distance)best={x:px,y:py,distance:d,inside:inside(points,[x,y]),toleranceMm:CONTOUR_TOLERANCE_MM};
 }
 return best;
}

// Orient an original front geometry once for a physical design surface.
// Callers already holding a surface geometry must keep using it directly.
export function surfaceGeometry(geometry,surfaceId){
  if(surfaceId!=='back')return geometry;
  return {...geometry,...(geometry.shape==='contour'?{outlinePath:mirrorContourPath(geometry.outlinePath,geometry.width)}:{}),holes:(geometry.holes||[]).map(h=>({...h,x:Number((geometry.width-h.x).toFixed(6))}))};
}

// Exact closest distance to an ellipse for a point inside it. Bisection solves
// the normal on the closest quadrant; the axis case avoids the singularity.
export function ellipseEdgeDistance(x,y,a,b){
 x=Math.abs(x);y=Math.abs(y);
 if(a<b){[a,b]=[b,a];[x,y]=[y,x];}
 if(Math.abs(a-b)<1e-6)return a-Math.hypot(x,y);
 if(y<1e-6){const z=a*x/(a*a-b*b);return z<1?Math.hypot(a*z-x,b*Math.sqrt(1-z*z)):a-x;}
 let low=-b*b,high=0;
 for(let i=0;i<90;i++){const t=(low+high)/2,v=(a*x/(t+a*a))**2+(b*y/(t+b*b))**2;if(v>1)low=t;else high=t;}
 const t=(low+high)/2;
 return Math.hypot(a*a*x/(t+a*a)-x,b*b*y/(t+b*b)-y);
}
