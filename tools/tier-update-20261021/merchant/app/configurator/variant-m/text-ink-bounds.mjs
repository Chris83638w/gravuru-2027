// Bounds of the actual font paths, shared by the editor and draft validation.
// Advance widths and line spacing are layout metrics, not printed ink.
const cache=new WeakMap();
function segments(path){
 const t=path.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/gi)||[],out=[];
 let i=0,cmd='',p=[0,0],start=p,control=null,previous='';
 const lengths={M:2,L:2,H:1,V:1,Q:4,T:2,C:6,S:4};
 while(i<t.length){
  if(/^[a-z]$/i.test(t[i]))cmd=t[i++];
  const c=cmd.toUpperCase(),relative=cmd!==c;
  if(c==='Z'){out.push([p,start]);p=start;control=null;previous=c;cmd='';continue;}
  const count=lengths[c];if(!count||i+count>t.length)throw Error('Unbekannte Schriftpfadgeometrie.');
  const v=t.slice(i,i+count).map(Number);i+=count;if(!v.every(Number.isFinite))throw Error('Ungültiger Schriftpfad.');
  const point=(x,y)=>[x+(relative?p[0]:0),y+(relative?p[1]:0)];let end,curve;
  if(c==='H')end=[v[0]+(relative?p[0]:0),p[1]];
  else if(c==='V')end=[p[0],v[0]+(relative?p[1]:0)];
  else end=point(...v.slice(-2));
  if(c==='M'){p=end;start=end;cmd=relative?'l':'L';control=null;previous=c;continue;}
  if(c==='Q')curve=[p,point(v[0],v[1]),end];
  else if(c==='C')curve=[p,point(v[0],v[1]),point(v[2],v[3]),end];
  else if(c==='T')curve=[p,previous==='Q'||previous==='T'?[2*p[0]-control[0],2*p[1]-control[1]]:p,end];
  else if(c==='S')curve=[p,previous==='C'||previous==='S'?[2*p[0]-control[0],2*p[1]-control[1]]:p,point(v[0],v[1]),end];
  else curve=[p,end];
  out.push(curve);control=curve.length>2?curve.at(-2):null;p=end;previous=c;
 }
 return out;
}
function roots(points,axis){
 const p=points.map(v=>v[axis]);
 if(p.length===3){const d=p[0]-2*p[1]+p[2];return Math.abs(d)>1e-12?[(p[0]-p[1])/d]:[];}
 if(p.length!==4)return [];
 const a=-p[0]+3*p[1]-3*p[2]+p[3],b=2*(p[0]-2*p[1]+p[2]),c=p[1]-p[0];
 if(Math.abs(a)<1e-12)return Math.abs(b)>1e-12?[-c/b]:[];
 const d=b*b-4*a*c;return d>=0?[(-b+Math.sqrt(d))/(2*a),(-b-Math.sqrt(d))/(2*a)]:[];
}
function at(points,t){let p=points;while(p.length>1)p=p.slice(1).map((q,i)=>q.map((v,a)=>p[i][a]*(1-t)+v*t));return p[0];}
export function textInkBounds(o,fonts){
 const face=fonts[o.font]?.[o.bold?'bold':'regular']||fonts[o.font]?.regular;if(!face)throw Error('Schrift fehlt.');
 let paths=cache.get(face);if(!paths){paths=new Map();cache.set(face,paths);}
 const scale=o.size/face.units,lines=o.text.split('\n'),points=[],skew=o.italic?Math.tan(-Math.PI/15):0;
 for(const [row,line]of lines.entries()){
  const glyphs=[...line].map(c=>{const g=face.glyphs[c];if(!g)throw Error('Schriftzeichen fehlt.');return g;});
  let x=-(glyphs.reduce((sum,g)=>sum+g.a,0)*scale+Math.max(0,glyphs.length-1)*(o.letterSpacing||0))/2;
  const baseline=(row-(lines.length-1)/2)*o.size*1.2+o.size*.35;
  for(const g of glyphs){
   if(!paths.has(g.d))paths.set(g.d,segments(g.d));
   for(const segment of paths.get(g.d)){
    const curve=segment.map(([px,py])=>{const y=baseline-py*scale;return [x+px*scale+skew*y,y];});
    for(const t of [0,1,...roots(curve,0),...roots(curve,1)].filter(t=>t>=0&&t<=1))points.push(at(curve,t));
   }
   x+=g.a*scale+(o.letterSpacing||0);
  }
 }
 if(!points.length)return {x:-o.w/2,y:-o.h/2,width:o.w,height:o.h};
 const b=points.reduce((b,[x,y])=>({left:Math.min(b.left,x),top:Math.min(b.top,y),right:Math.max(b.right,x),bottom:Math.max(b.bottom,y)}),{left:Infinity,top:Infinity,right:-Infinity,bottom:-Infinity});
 return {x:b.left,y:b.top,width:b.right-b.left,height:b.bottom-b.top};
}
export function inkObject(o,fonts){
 const b=textInkBounds(o,fonts),a=(o.rotation||0)*Math.PI/180,dx=b.x+b.width/2,dy=b.y+b.height/2;
 return {...o,x:o.x+dx*Math.cos(a)-dy*Math.sin(a),y:o.y+dx*Math.sin(a)+dy*Math.cos(a),w:b.width,h:b.height};
}
export function containTextInk(o,fonts,area){
 let ink=inkObject(o,fonts),a=(o.rotation||0)*Math.PI/180;
 const extent=()=>({w:Math.abs(ink.w*Math.cos(a))+Math.abs(ink.h*Math.sin(a)),h:Math.abs(ink.w*Math.sin(a))+Math.abs(ink.h*Math.cos(a))});
 let {w,h}=extent();const scale=Math.min(1,(area.right-area.left)/w,(area.bottom-area.top)/h);
 if(scale<1){o.size*=scale;o.w*=scale;o.h*=scale;ink=inkObject(o,fonts);({w,h}=extent());}
 o.x+=Math.min(area.right-w/2,Math.max(area.left+w/2,ink.x))-ink.x;
 o.y+=Math.min(area.bottom-h/2,Math.max(area.top+h/2,ink.y))-ink.y;return o;
}
