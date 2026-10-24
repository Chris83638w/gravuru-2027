// PDF encoding of the shared, validated original SVG commands. Millimetres, y down.
// Curves stay curves; only elliptic arcs are approximated by cubic segments <=22.5°.
import {contourPathCommands} from '../../platform/sources/app/shared/models/contour-geometry.mjs';
const num=v=>String(Number(v.toFixed(8)));
export function contourPdfPath(outline){
 const out=[];let x=0,y=0;
 const line=(px,py)=>{out.push(num(px)+' '+num(py)+' l');x=px;y=py;};
 const cubic=(p1,p2,p3)=>{out.push([...p1,...p2,...p3].map(num).join(' ')+' c');[x,y]=p3;};
 for(const {command:c,values:v} of contourPathCommands(outline)){
  if(c==='M'){[x,y]=v;out.push(v.map(num).join(' ')+' m');}
  else if(c==='L')line(...v);
  else if(c==='C')cubic(v.slice(0,2),v.slice(2,4),v.slice(4));
  else if(c==='Q'){const [cx,cy,ex,ey]=v;cubic([x+2*(cx-x)/3,y+2*(cy-y)/3],[ex+2*(cx-ex)/3,ey+2*(cy-ey)/3],[ex,ey]);}
  else if(c==='Z')out.push('h');
  else if(c==='A'){
   let [rx,ry,degrees,large,sweep,ex,ey]=v;
   if(x===ex&&y===ey)continue;
   if(!rx||!ry){line(ex,ey);continue;}
   const phi=degrees*Math.PI/180,co=Math.cos(phi),si=Math.sin(phi),dx=(x-ex)/2,dy=(y-ey)/2;
   const xp=co*dx+si*dy,yp=-si*dx+co*dy,lambda=xp*xp/(rx*rx)+yp*yp/(ry*ry);
   if(lambda>1){const k=Math.sqrt(lambda);rx*=k;ry*=k;}
   const den=rx*rx*yp*yp+ry*ry*xp*xp,k=(large===sweep?-1:1)*Math.sqrt(Math.max(0,(rx*rx*ry*ry-den)/den));
   const cxp=k*rx*yp/ry,cyp=-k*ry*xp/rx,cx=co*cxp-si*cyp+(x+ex)/2,cy=si*cxp+co*cyp+(y+ey)/2;
   const ux=(xp-cxp)/rx,uy=(yp-cyp)/ry,vx=(-xp-cxp)/rx,vy=(-yp-cyp)/ry;
   const start=Math.atan2(uy,ux);let delta=Math.atan2(ux*vy-uy*vx,ux*vx+uy*vy);
   if(!sweep&&delta>0)delta-=2*Math.PI;if(sweep&&delta<0)delta+=2*Math.PI;
   const count=Math.max(1,Math.ceil(Math.abs(delta)/(Math.PI/8))),step=delta/count;
   const p=t=>[cx+rx*co*Math.cos(t)-ry*si*Math.sin(t),cy+rx*si*Math.cos(t)+ry*co*Math.sin(t)];
   const d=t=>[-rx*co*Math.sin(t)-ry*si*Math.cos(t),-rx*si*Math.sin(t)+ry*co*Math.cos(t)];
   for(let i=0;i<count;i++){const a=start+i*step,b=a+step,f=4/3*Math.tan(step/4),pa=p(a),pb=p(b),da=d(a),db=d(b);cubic(pa.map((v,j)=>v+f*da[j]),pb.map((v,j)=>v-f*db[j]),i===count-1?[ex,ey]:pb);}
  }
 }
 return out.join('\n');
}
