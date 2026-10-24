// Elemente bleiben auf der Platte (Chris 20.10.2026): „Die Kunden können alle Elemente bis an den Rand
// setzen, aber nicht weiter.“ Gilt für Ziehen, Skalieren, Drehen und Pfeiltasten, weil die Lage vor jedem
// Zeichnen geprüft wird. Maßgeblich ist die Außenbox des (gedrehten) Elements; ist sie größer als die
// Platte, wird das Element auf der Platte zentriert.
// Chris 21.10.2026: Bei Text zählen die Buchstaben, nicht der Textrahmen mit Zeilenabstand – sonst lässt sich
// ein Name nicht ganz nach oben setzen.
import {transformedCorners,fitsSurface} from './usability-model.mjs';

export function boundingSize(o){
  const a=(Number(o.rotation)||0)*Math.PI/180,w=Math.max(0,Number(o.w)||0),h=Math.max(0,Number(o.h)||0);
  return {w:Math.abs(w*Math.cos(a))+Math.abs(h*Math.sin(a)),h:Math.abs(w*Math.sin(a))+Math.abs(h*Math.cos(a))};
}

const clampAxis=(c,size,max,margin)=>{
  const lo=margin+size/2,hi=max-margin-size/2;
  return lo>hi?max/2:Math.min(hi,Math.max(lo,c));
};

// Gibt true zurück, wenn das Element verschoben wurde.
export function clampToPlate(o,width,height,margin=0,bounds=null){
  if(!o||o.uxHidden||o.locked||o.uxLocked||o.role==='guide'||o.uxDecoration&&o.customerEditable===false)return false;
  if(!(width>0&&height>0)||!Number.isFinite(o.x)||!Number.isFinite(o.y))return false;
  let x,y;
  if(bounds&&bounds.width>0&&bounds.height>0){
   const c=transformedCorners({...o,x:0,y:0},bounds),xs=c.map(p=>p.x),ys=c.map(p=>p.y);
   const loX=margin-Math.min(...xs),hiX=width-margin-Math.max(...xs),loY=margin-Math.min(...ys),hiY=height-margin-Math.max(...ys);
   x=loX>hiX?(loX+hiX)/2:Math.min(hiX,Math.max(loX,o.x));y=loY>hiY?(loY+hiY)/2:Math.min(hiY,Math.max(loY,o.y));
  }else{const b=boundingSize(o);x=clampAxis(o.x,b.w,width,margin);y=clampAxis(o.y,b.h,height,margin);}
  const moved=Math.abs(x-o.x)>1e-6||Math.abs(y-o.y)>1e-6;
  if(moved){o.x=Math.round(x*100)/100;o.y=Math.round(y*100)/100;}
  return moved;
}

// A contour move is limited with the same polygon test as fitting and validation.
// No bounding rectangle or independent offset calculation is used here.
export function clampToContour(o,geometry,bounds=null,previous=null){
 if(!o||o.uxHidden||o.locked||o.uxLocked||o.role==='guide'||o.uxDecoration&&o.customerEditable===false)return false;
 const box=bounds||{x:-o.w/2,y:-o.h/2,width:o.w,height:o.h};
 const fits=position=>fitsSurface({...o,...position},box,geometry);
 if(fits(o))return false;
 const anchor=[previous,{x:geometry.width/2,y:geometry.height/2}].find(p=>p&&fits(p));
 if(!anchor)return false; // Oversized objects remain visibly invalid; never invent a fitting shape.
 const target={x:o.x,y:o.y},at=t=>({x:anchor.x+(target.x-anchor.x)*t,y:anchor.y+(target.y-anchor.y)*t});
 let low=0,high=1;
 for(let i=0;i<30;i++){const mid=(low+high)/2;if(fits(at(mid)))low=mid;else high=mid;}
 const position=at(low),changed=Math.abs(position.x-o.x)>1e-6||Math.abs(position.y-o.y)>1e-6;
 if(changed){o.x=position.x;o.y=position.y;}return changed;
}

export function installEdgeClamp(el){
  const validPositions=new Map();let geometryKey='';
  const glyphs=o=>{if(o.type!=='text'||o.uxHidden||!String(o.text??'').trim()||!el.uxTextBounds)return null;try{return el.uxTextBounds(o);}catch{return null;}};
  const clampAll=self=>{const s=self.state;if(!s?.objects)return;
    const geometry=self.uxProfileGeometry?.();
    if(geometry?.shape==='contour'){
      const key=JSON.stringify(geometry);if(key!==geometryKey){validPositions.clear();geometryKey=key;}
      const ids=new Set(s.objects.map(o=>o.id));for(const id of validPositions.keys())if(!ids.has(id))validPositions.delete(id);
      for(const o of s.objects){const bounds=glyphs(o);clampToContour(o,geometry,bounds,validPositions.get(o.id));
        if(fitsSurface(o,bounds||{x:-o.w/2,y:-o.h/2,width:o.w,height:o.h},geometry))validPositions.set(o.id,{x:o.x,y:o.y});}
    }else for(const o of s.objects)clampToPlate(o,s.width,s.height,0,glyphs(o));
  };
  const render=el.render;
  el.render=function(...args){clampAll(this);return render.apply(this,args);};
}
