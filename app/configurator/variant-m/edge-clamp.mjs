// Elemente bleiben auf der Platte (Chris 20.10.2026): „Die Kunden können alle Elemente bis an den Rand
// setzen, aber nicht weiter.“ Gilt für Ziehen, Skalieren, Drehen und Pfeiltasten, weil die Lage vor jedem
// Zeichnen geprüft wird. Maßgeblich ist die Außenbox des (gedrehten) Elements; ist sie größer als die
// Platte, wird das Element auf der Platte zentriert.

export function boundingSize(o){
  const a=(Number(o.rotation)||0)*Math.PI/180,w=Math.max(0,Number(o.w)||0),h=Math.max(0,Number(o.h)||0);
  return {w:Math.abs(w*Math.cos(a))+Math.abs(h*Math.sin(a)),h:Math.abs(w*Math.sin(a))+Math.abs(h*Math.cos(a))};
}

const clampAxis=(c,size,max,margin)=>{
  const lo=margin+size/2,hi=max-margin-size/2;
  return lo>hi?max/2:Math.min(hi,Math.max(lo,c));
};

// Gibt true zurück, wenn das Element verschoben wurde.
export function clampToPlate(o,width,height,margin=0){
  if(!o||o.uxHidden||o.locked||o.uxLocked||o.role==='guide'||o.uxDecoration&&o.customerEditable===false)return false;
  if(!(width>0&&height>0)||!Number.isFinite(o.x)||!Number.isFinite(o.y))return false;
  const b=boundingSize(o),x=clampAxis(o.x,b.w,width,margin),y=clampAxis(o.y,b.h,height,margin);
  const moved=Math.abs(x-o.x)>1e-6||Math.abs(y-o.y)>1e-6;
  if(moved){o.x=Math.round(x*100)/100;o.y=Math.round(y*100)/100;}
  return moved;
}

export function installEdgeClamp(el){
  const clampAll=self=>{const s=self.state;if(!s?.objects)return;for(const o of s.objects)clampToPlate(o,s.width,s.height);};
  const render=el.render;
  el.render=function(...args){clampAll(this);return render.apply(this,args);};
}
