// Elemente bleiben auf der Platte (Chris 20.10.2026): „Die Kunden können alle Elemente bis an den Rand
// setzen, aber nicht weiter.“ Gilt für Ziehen, Skalieren, Drehen und Pfeiltasten, weil die Lage vor jedem
// Zeichnen geprüft wird. Maßgeblich ist die Außenbox des (gedrehten) Elements; ist sie größer als die
// Platte, wird das Element auf der Platte zentriert.
// Chris 21.10.2026: Bei Text zählen die Buchstaben, nicht der Textrahmen mit Zeilenabstand – sonst lässt sich
// ein Name nicht ganz nach oben setzen.
// Chris 20.11.2026: Diese Sperre gilt nur noch für Edelstahl (und unverändert für Klingelschilder). Bei allen anderen
// Produkten darf der Kunde über den Rand gestalten; siehe keepCentreOnPlate unten und edgeFree in design-content.mjs.
import {transformedCorners,fitsSurface} from './usability-model.mjs';
import {embeddedMotifFits} from '../../platform/sources/app/shared/models/embedded-motif-fit.mjs';
import {objectSurface} from './surfaces.mjs';
import {textOutlineFits} from '../../platform/sources/app/shared/models/text-outline-fit.mjs';
import {edgeFree,pointOnPlate,surfaceObjectIssue,isBoundaryIssue} from '../../platform/sources/app/shared/models/design-content.mjs';

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
  // Keep the geometric result: rounding can push an edge back outside the plate.
  if(moved){o.x=x;o.y=y;}
  return moved;
}

// Native doorbells engrave only the acrylic overlay (Chris, 01.11.2026).
// Translate the existing clamp into that rectangle; keep size, rotation and rights.
export function clampToAcrylic(o,profile,bounds=null){
 const a=profile?.frames?.find(f=>f.key===profile.doorbellSelection?.frame)?.acrylic;
 if(profile?.doorbellSchema!=='gravuru-doorbell/v1'||!a||!o)return false;
 const local={...o,x:o.x-a.x,y:o.y-a.y};
 // Doorbell production validates the complete object box. Include glyph
 // overhang as well, so both the visible ink and the saved geometry fit.
 if(bounds){const left=Math.min(-o.w/2,bounds.x),top=Math.min(-o.h/2,bounds.y);bounds={x:left,y:top,width:Math.max(o.w/2,bounds.x+bounds.width)-left,height:Math.max(o.h/2,bounds.y+bounds.height)-top};}
 if(!clampToPlate(local,a.width,a.height,0,bounds))return false;
 o.x=local.x+a.x;o.y=local.y+a.y;return true;
}

// A contour move is limited with the same polygon test as fitting and validation.
// No bounding rectangle or independent offset calculation is used here.
export function clampToContour(o,geometry,bounds=null,previous=null,fonts){
 if(!o||o.uxHidden||o.locked||o.uxLocked||o.role==='guide'||o.uxDecoration&&o.customerEditable===false)return false;
 const box=bounds||{x:-o.w/2,y:-o.h/2,width:o.w,height:o.h};
 const fits=position=>fitsSurface({...o,...position},box,geometry)||textOutlineFits({...o,...position},geometry,fonts)===true;
 if(fits(o))return false;
 const anchor=[previous,{x:geometry.width/2,y:geometry.height/2}].find(p=>p&&fits(p));
 if(!anchor)return false; // Oversized objects remain visibly invalid; never invent a fitting shape.
 const target={x:o.x,y:o.y},at=t=>({x:anchor.x+(target.x-anchor.x)*t,y:anchor.y+(target.y-anchor.y)*t});
 let low=0,high=1;
 for(let i=0;i<30;i++){const mid=(low+high)/2;if(fits(at(mid)))low=mid;else high=mid;}
 const position=at(low),changed=Math.abs(position.x-o.x)>1e-6||Math.abs(position.y-o.y)>1e-6;
 if(changed){o.x=position.x;o.y=position.y;}return changed;
}

// Freier Rand (Chris 20.11.2026, außer Edelstahl und Klingelschilder; siehe edgeFree): Das Element darf über den Rand
// ragen, die Vorschau schneidet es am Schild ab. Nur seine Mitte bleibt auf dem Schild, damit kein Element ganz
// verschwindet und sich nicht mehr greifen lässt. Liegt die Mitte außerhalb, kommt das Element auf der Linie zur
// Schildmitte so weit zurück, bis sie wieder aufliegt. Gibt true zurück, wenn das Element verschoben wurde.
export function keepCentreOnPlate(o,geometry){
 if(!o||o.uxHidden||o.locked||o.uxLocked||o.role==='guide'||o.uxDecoration&&o.customerEditable===false)return false;
 if(!Number.isFinite(o.x)||!Number.isFinite(o.y)||!(geometry?.width>0&&geometry?.height>0))return false;
 if(pointOnPlate(o,geometry))return false;
 // Zuerst je Achse an die Außenmaße: Wer am Rand entlang zieht, rutscht nicht zur Schildmitte.
 const target={x:Math.min(geometry.width,Math.max(0,o.x)),y:Math.min(geometry.height,Math.max(0,o.y))};
 if(pointOnPlate(target,geometry)){o.x=target.x;o.y=target.y;return true;}
 // Runde Ecke, Oval oder Kontur: von dort auf der Linie zur Schildmitte, bis die Mitte aufliegt.
 const anchor={x:geometry.width/2,y:geometry.height/2};
 if(!pointOnPlate(anchor,geometry))return false; // Kontur ohne Fläche in der Mitte: nichts erfinden.
 const at=t=>({x:anchor.x+(target.x-anchor.x)*t,y:anchor.y+(target.y-anchor.y)*t});
 let low=0,high=1;
 for(let i=0;i<30;i++){const mid=(low+high)/2;if(pointOnPlate(at(mid),geometry))low=mid;else high=mid;}
 const position=at(low);o.x=position.x;o.y=position.y;return true;
}

// Chris 20.11.2026 („Ja“ zum Befund am Edelstahl-Türschild): Die Randsperre misst Text an den gezeichneten Buchstaben
// (uxTextBounds), die Prüfung vor dem Warenkorb und der Server messen an den Umrissen der Schrift (customerLayoutIssue in
// contract.mjs: surfaceObjectIssue ohne Bohrlöcher). Am äußersten Rand wichen beide um Bruchteile eines Millimeters ab:
// Die Sperre ließ den Namen dort stehen, die Prüfung meldete „Bitte Gestaltung prüfen“. Nach der Randsperre gilt deshalb
// dieselbe Prüfung als letzte Instanz: Sperrt sie noch, rückt das Element auf dem kürzesten Weg (erst nur waagerecht oder nur
// senkrecht, sonst beides) so weit zur Schildmitte, bis sie nicht mehr sperrt. Passt es nirgends, bleibt es, wo es ist –
// dann meldet es die Prüfung vor dem Warenkorb wie bisher.
export function settleInside(o,geometry,blocked){
 if(!o||o.uxHidden||o.locked||o.uxLocked||o.role==='guide'||o.uxDecoration&&o.customerEditable===false)return false;
 if(!(geometry?.width>0&&geometry?.height>0)||!Number.isFinite(o.x)||!Number.isFinite(o.y)||!blocked(o))return false;
 const start={x:o.x,y:o.y},centre={x:geometry.width/2,y:geometry.height/2};
 const along=(moveX,moveY)=>{
  const at=t=>({x:start.x+(moveX?(centre.x-start.x)*t:0),y:start.y+(moveY?(centre.y-start.y)*t:0)});
  if(blocked({...o,...at(1)}))return null;
  let low=0,high=1;
  for(let i=0;i<24;i++){const mid=(low+high)/2;if(blocked({...o,...at(mid)}))low=mid;else high=mid;}
  return at(high);
 };
 const distance=p=>Math.hypot(p.x-start.x,p.y-start.y);
 let position=[along(true,false),along(false,true)].filter(Boolean).sort((a,b)=>distance(a)-distance(b))[0];
 if(!position){
  position=along(true,true);if(!position)return false;
  // Beide Richtungen nötig: jede für sich wieder so weit zurück zum Ausgangspunkt, wie die Prüfung es zulässt.
  for(const axis of ['x','y']){
   const at=t=>({...position,[axis]:position[axis]+(start[axis]-position[axis])*t});
   let low=0,high=1;
   for(let i=0;i<24;i++){const mid=(low+high)/2;if(blocked({...o,...at(mid)}))high=mid;else low=mid;}
   position=at(low);
  }
 }
 o.x=position.x;o.y=position.y;return true;
}

export function installEdgeClamp(el,{profile=null,motifs=[]}={}){
  const surfacePositions=new Map(),starts=new Map();
  let choosingTemplate=null;
  const choose=el.chooseDesign;
  if(typeof choose==='function')el.chooseDesign=function(id,...args){
    choosingTemplate=id;try{return choose.call(this,id,...args);}finally{
      // Inactive back objects are not visited by the render clamp. Reset their
      // session marker too, but only for a newly loaded authentic instance.
      if(this.state?.designId===id)for(const o of this.state.objects||[]){
        const original=starts.get(id+'\0'+o.id);
        if(original&&original.instance!==o&&signature(o)===original.signature){original.changed=false;original.instance=o;}
      }
      choosingTemplate=null;
    }
  };
  const signature=o=>JSON.stringify([o.type,o.motif,o.templateOrigin,objectSurface(o),o.x,o.y,o.w,o.h,o.rotation]);
  for(const design of profile?.designs||[])for(const o of design.objects||[]){
    const resource=motifs.find(m=>m.key===o.motif&&m.embeddedOnly===true);
    if(o.type==='motif'&&o.templateOrigin===true&&resource)starts.set(design.id+'\0'+o.id,{signature:signature(o),resource,fragment:resource.svgFragment,bounds:JSON.stringify(resource.bounds),changed:false});
  }
  const unchangedStart=(o,state,geometry)=>{
    const original=starts.get(state.designId+'\0'+o.id);
    if(!original)return false;
    // chooseDesign loads a fresh copy from the authentic profile. A return to
    // that template can preserve its start again; merely undoing a drag cannot.
    if(choosingTemplate===state.designId&&original.instance!==o&&signature(o)===original.signature)original.changed=false;
    original.instance=o;if(original.changed)return false;
    if(signature(o)!==original.signature||original.resource.svgFragment!==original.fragment||JSON.stringify(original.resource.bounds)!==original.bounds){original.changed=true;return false;}
    // Only the authentic, unchanged imported start position is preserved.
    // After the first geometry edit the existing customer clamp owns placement.
    return embeddedMotifFits(o,{...geometry,safeMarginMm:geometry?.safeMarginMm??0,holes:[]},original.resource)===true;
  };
  const glyphs=o=>{if(o.type!=='text'||o.uxHidden||!String(o.text??'').trim()||!el.uxTextBounds)return null;try{return el.uxTextBounds(o);}catch{return null;}};
  // Letzte Instanz nach der Randsperre: dieselbe Lageprüfung wie vor dem Warenkorb und am Server (settleInside oben).
  const settle=(self,o,chosen,geometry)=>{
    const strict=chosen||profile;if(!strict?.geometry)return false;
    const resources={motifs,fonts:self.fontData},checked={...strict,geometry:{...strict.geometry,holes:[]}};
    return settleInside(o,geometry,candidate=>isBoundaryIssue(surfaceObjectIssue(candidate,checked,resources)));
  };
  const clampAll=self=>{const s=self.state;if(!s?.objects)return;
    const doorbell=self.uxSelectedProfile?.();
    if(doorbell?.doorbellSchema==='gravuru-doorbell/v1'){
      for(const o of s.objects)clampToAcrylic(o,doorbell,glyphs(o));
      return;
    }
    const geometry=self.uxProfileGeometry?.();
    if(edgeFree(doorbell||profile)){
      // uxProfileGeometry zeigt schon zur aktiven Seite; die andere Seite bleibt, wo sie ist.
      const shaped=geometry&&(geometry.shape==='contour'||geometry.shape==='ellipse'||geometry.cornerRadiusMm>0);
      const plate=shaped?geometry:{width:s.width,height:s.height,shape:'rect'},active=s.uxSurface==='back'?'back':'front';
      for(const o of s.objects)if(!shaped||objectSurface(o)===active)keepCentreOnPlate(o,plate);
      return;
    }
    if(geometry&&(geometry.shape==='contour'||geometry.shape==='ellipse'||geometry.cornerRadiusMm>0)){
      // uxProfileGeometry already faces the active side. Other surfaces must not move.
      const active=s.uxSurface==='back'?'back':'front',key=JSON.stringify(geometry);
      let cache=surfacePositions.get(active);
      if(cache?.geometryKey!==key){cache={geometryKey:key,positions:new Map()};surfacePositions.set(active,cache);}
      const objects=s.objects.filter(o=>objectSurface(o)===active),validPositions=cache.positions;
      const ids=new Set(objects.map(o=>o.id));for(const id of validPositions.keys())if(!ids.has(id))validPositions.delete(id);
      for(const o of objects){if(unchangedStart(o,s,geometry))continue;const bounds=glyphs(o);clampToContour(o,geometry,bounds,validPositions.get(o.id),self.fontData);settle(self,o,doorbell,geometry);
        if(fitsSurface(o,bounds||{x:-o.w/2,y:-o.h/2,width:o.w,height:o.h},geometry)||textOutlineFits(o,geometry,self.fontData)===true)validPositions.set(o.id,{x:o.x,y:o.y});}
    }else for(const o of s.objects)if(!unchangedStart(o,s,geometry)){clampToPlate(o,s.width,s.height,0,glyphs(o));settle(self,o,doorbell,geometry||{width:s.width,height:s.height});}
  };
  const render=el.render;
  el.render=function(...args){clampAll(this);return render.apply(this,args);};
}
