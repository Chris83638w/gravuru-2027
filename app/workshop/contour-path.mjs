// Physical outline bounds in millimetres. Independent of catalogue/design imports.
// One explicitly closed outer path; no markup, transformations or implicit subpaths.
const fail=message=>{throw new Error('Kontur: '+message);};
const COMMANDS='MmLlHhVvCcSsQqTtAaZz';
const NUMBER=/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/;
const TAU=2*Math.PI;
const mod=a=>(a%TAU+TAU)%TAU;

export function contourPathBounds(path){
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
 const curve=(points)=>{
  const dims=[points.map(p=>p[0]),points.map(p=>p[1])],ts=[];
  for(const v of dims){
   if(v.length===3){const den=v[0]-2*v[1]+v[2];if(den)ts.push((v[0]-v[1])/den);}
   else ts.push(...roots(-v[0]+3*v[1]-3*v[2]+v[3],2*(v[0]-2*v[1]+v[2]),v[1]-v[0]));
  }
  for(const t of ts)if(t>0&&t<1)add(...dims.map(v=>v.length===3?quadratic(...v,t):cubic(...v,t)));
  add(...points.at(-1));
 };
 const arc=(rx,ry,degrees,large,sweep,ex,ey)=>{
  if(rx<0||ry<0)fail('Bogenradien dürfen nicht negativ sein.');
  if(rx===0||ry===0||x===ex&&y===ey){add(ex,ey);return;}
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
   add(sx,sy);x=sx;y=sy;closed=true;continue;
  }
  if(++segments>10000)fail('zu viele Pfadsegmente.');
  const point=()=>{const px=number(),py=number();return relative?[x+px,y+py]:[px,py];};
  let nextControl=null;
  if(c==='M'){[x,y]=point();sx=x;sy=y;started=true;add(x,y);command=relative?'l':'L';segments--;}
  else if(c==='L'){[x,y]=point();add(x,y);}
  else if(c==='H'){const v=number();x=relative?x+v:v;add(x,y);}
  else if(c==='V'){const v=number();y=relative?y+v:v;add(x,y);}
  else if(c==='C'){const p1=point(),p2=point(),p3=point();curve([[x,y],p1,p2,p3]);[x,y]=p3;nextControl=p2;}
  else if(c==='S'){const p1=['C','S'].includes(previous)?[2*x-control[0],2*y-control[1]]:[x,y],p2=point(),p3=point();curve([[x,y],p1,p2,p3]);[x,y]=p3;nextControl=p2;}
  else if(c==='Q'){const p1=point(),p2=point();curve([[x,y],p1,p2]);[x,y]=p2;nextControl=p1;}
  else if(c==='T'){const p1=['Q','T'].includes(previous)?[2*x-control[0],2*y-control[1]]:[x,y],p2=point();curve([[x,y],p1,p2]);[x,y]=p2;nextControl=p1;}
  else if(c==='A'){const rx=number(),ry=number(),angle=number(),large=flag(),sweep=flag(),end=point();arc(rx,ry,angle,large,sweep,...end);[x,y]=end;}
  previous=c;control=nextControl;
 }
 if(!closed)fail('Pfad muss mit Z geschlossen sein.');
 const width=maxX-minX,height=maxY-minY;
 if(!(width>0&&height>0))fail('Außenkontur braucht eine positive Breite und Höhe.');
 return [minX,minY,width,height];
}

export function validateContourOutline(path,width,height,tolerance=.05){
 if(![width,height,tolerance].every(Number.isFinite)||width<=0||height<=0||tolerance<0)fail('ungültige Maße.');
 const bounds=contourPathBounds(path),epsilon=1e-9;
 if(Math.abs(bounds[0])>tolerance+epsilon||Math.abs(bounds[1])>tolerance+epsilon)fail('Pfadursprung muss bei 0/0 liegen (Toleranz '+tolerance+' mm).');
 if(Math.abs(bounds[2]-width)>tolerance+epsilon||Math.abs(bounds[3]-height)>tolerance+epsilon)fail('Pfadausdehnung stimmt nicht mit Breite/Höhe überein (Toleranz '+tolerance+' mm).');
 return bounds;
}
