// Preserve original cubic/line geometry while making nested evenodd contours
// compatible with a nonzero-only importer. Sampling determines nesting only;
// the delivered paths retain the original Bezier control points.
export function normalizeEvenOdd(d){
 const ts=d.match(/[a-df-zA-DF-Z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g);
 const arity={M:2,L:2,H:1,V:1,C:6,Z:0};let i=0,cmd='',p=[0,0],start=[0,0],sub=null,subs=[];
 while(i<ts.length){
  if(/^[a-z]$/i.test(ts[i]))cmd=ts[i++];
  const u=cmd.toUpperCase(),relative=u!==cmd,n=arity[u];if(n===undefined)throw Error('Nesting conversion does not support '+cmd);
  if(u==='Z'){if(p[0]!==start[0]||p[1]!==start[1])sub.segs.push({kind:'L',from:p,to:start});p=start;cmd='';continue;}
  const v=ts.slice(i,i+n).map(Number);i+=n;const point=(x,y)=>[x+(relative?p[0]:0),y+(relative?p[1]:0)];
  if(u==='M'){p=point(v[0],v[1]);start=p;sub={start:p,segs:[]};subs.push(sub);cmd=relative?'l':'L';continue;}
  const to=u==='H'?[v[0]+(relative?p[0]:0),p[1]]:u==='V'?[p[0],v[0]+(relative?p[1]:0)]:point(v[n-2],v[n-1]);
  const seg={kind:u==='C'?'C':'L',from:p,to};if(u==='C'){seg.c1=point(v[0],v[1]);seg.c2=point(v[2],v[3]);}sub.segs.push(seg);p=to;
 }
 const polygons=subs.map(s=>{const points=[s.start];for(const seg of s.segs){if(seg.kind==='L')points.push(seg.to);else for(let j=1;j<=24;j++){const t=j/24,a=1-t;points.push([0,1].map(k=>a*a*a*seg.from[k]+3*a*a*t*seg.c1[k]+3*a*t*t*seg.c2[k]+t*t*t*seg.to[k]));}}return points;});
 const area=ps=>ps.reduce((sum,p,j)=>{const q=ps[(j+1)%ps.length];return sum+p[0]*q[1]-q[0]*p[1];},0)/2;
 const inside=(p,ps)=>{let hit=false;for(let a=0,b=ps.length-1;a<ps.length;b=a++){const x=ps[a],y=ps[b];if((x[1]>p[1])!==(y[1]>p[1])&&p[0]<(y[0]-x[0])*(p[1]-x[1])/(y[1]-x[1])+x[0])hit=!hit;}return hit;};
 const num=v=>Number(v.toFixed(7));const xy=p=>p.map(num).join(' ');
 return subs.map((s,idx)=>{const depth=polygons.filter((poly,j)=>j!==idx&&inside(s.start,poly)).length,want=depth%2?-1:1,reverse=Math.sign(area(polygons[idx]))!==want;
  const segs=reverse?[...s.segs].reverse().map(s=>({...s,from:s.to,to:s.from,c1:s.c2,c2:s.c1})):s.segs;
  return 'M '+xy(segs[0]?.from??s.start)+' '+segs.map(s=>s.kind==='C'?'C '+xy(s.c1)+' '+xy(s.c2)+' '+xy(s.to):'L '+xy(s.to)).join(' ')+' Z';
 }).join(' ');
}
