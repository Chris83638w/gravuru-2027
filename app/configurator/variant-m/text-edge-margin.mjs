// Chris 13.11.2026 („Langer Name wird bis ganz an den Rand gezogen“): Beim automatischen
// Einpassen bleibt Text mindestens TEXT_EDGE_MM vom Schildrand entfernt – Rechteck, abgerundet,
// rund/oval und Kontur. Gilt nur für Text; Motive und Linien dürfen bis an den Rand (Entscheidung 3.21/5.9).
export const TEXT_EDGE_MM=2;

// Abstand eines Punktes im Innern der Ellipse (Halbachsen a, b, Mittelpunkt 0) zum Rand.
function edgeDistance(a,b,px,py,t){
 const d=s=>Math.hypot(px-a*Math.cos(s),py-b*Math.sin(s));
 let best=t,low=t-Math.PI/2,high=t+Math.PI/2,step=(high-low)/32;
 for(let s=low;s<=high;s+=step)if(d(s)<d(best))best=s;
 low=best-step;high=best+step;
 for(let i=0;i<30;i++){const m1=low+(high-low)/3,m2=high-(high-low)/3;if(d(m1)<d(m2))high=m2;else low=m1;}
 return d((low+high)/2);
}
// Eine um d verkleinerte Ellipse hält an den Enden langer Ovale weniger als d Abstand zum Rand.
// Deshalb so weit verkleinern, dass der kleinste Abstand überall mindestens margin beträgt.
const ellipseInsets=new Map();
export function ellipseInset(a,b,margin){
 const key=a+','+b+','+margin;if(ellipseInsets.has(key))return ellipseInsets.get(key);
 const worst=d=>{let w=Infinity;for(let i=0;i<240;i++){const t=i/240*2*Math.PI;w=Math.min(w,edgeDistance(a,b,(a-d)*Math.cos(t),(b-d)*Math.sin(t),t));}return w;};
 let low=margin,high=Math.min(3*margin,Math.min(a,b)-.25);
 if(!(high>low)||worst(low)>=margin-1e-3){ellipseInsets.set(key,low);return low;}
 for(let i=0;i<14;i++){const mid=(low+high)/2;if(worst(mid)>=margin)high=mid;else low=mid;}
 ellipseInsets.set(key,high);return high;
}

export function insetTextSurface(surface,margin=TEXT_EDGE_MM){
 if(!surface||!(margin>0))return surface;
 const base={x:0,y:0,...surface};
 if(base.shape==='contour'){
  const geometry=base.geometry||base,inset={...geometry,safeMarginMm:Math.max(geometry.safeMarginMm??0,margin)};
  return base.geometry?{...base,geometry:inset}:{...base,safeMarginMm:inset.safeMarginMm};
 }
 const limit=Math.max(0,Math.min(base.width,base.height)/2-.5);
 let m=Math.min(margin,limit);if(!(m>0))return surface;
 if(base.shape==='ellipse')m=Math.min(limit,ellipseInset(base.width/2,base.height/2,m));
 return {...base,x:base.x+m,y:base.y+m,width:base.width-2*m,height:base.height-2*m,
  ...(base.cornerRadiusMm>0?{cornerRadiusMm:Math.max(0,base.cornerRadiusMm-m)}:{})};
}
