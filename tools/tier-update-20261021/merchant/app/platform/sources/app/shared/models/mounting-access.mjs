// Physical mounting clearance is independent of printed or engraved artwork.
const intersectsDisk=(plate,hole,radius)=>{
 const dx=Math.max(plate.x-hole.x,0,hole.x-plate.x-plate.width);
 const dy=Math.max(plate.y-hole.y,0,hole.y-plate.y-plate.height);
 return Math.hypot(dx,dy)<radius;
};

export function mountingAccessIssues(profile,{frameKey,mountingKey}={}){
 if(profile.kind!=='layered-doorbell')return [];
 const mounting=profile.mounting,choice=mounting?.options?.find(o=>o.key===mountingKey);
 if(!choice?.visibleScrews)return [];
 const frame=profile.frames?.find(f=>f.key===frameKey);
 if(!frame)return [{code:'mounting-access',message:'Rahmen für die Schraubmontage fehlt.'}];
 const shaft=mounting.holeDiameterMm/2,head=(mounting.screwHeadDiameterMm||mounting.screwHeadPreviewDiameterMm)/2;
 if(!(shaft>0&&head>=shaft&&Number.isFinite(head)))return [{code:'mounting-access',message:'Maße von Bohrung und Schraubenkopf fehlen.'}];
 const layers=Array.isArray(frame.acrylicLayers)?frame.acrylicLayers:[frame.acrylic].filter(Boolean);
 if(!layers.length||layers.some(plate=>!plate||![plate.x,plate.y,plate.width,plate.height].every(Number.isFinite)||plate.width<=0||plate.height<=0))return [{code:'mounting-access',message:'Acrylgeometrie für die Schraubmontage fehlt.'}];
 if(!Array.isArray(mounting.holes)||!mounting.holes.length||mounting.holes.some(hole=>!hole||![hole.x,hole.y].every(Number.isFinite)))return [{code:'mounting-access',message:'Bohrbild für die Schraubmontage fehlt.'}];
 return (mounting.holes||[]).flatMap((hole,index)=>{
  const touching=layers.filter(plate=>intersectsDisk(plate,hole,head));
  if(!touching.length)return [];
  const message=`Befestigung ${index+1}: Eine Acrylplatte versperrt den Bereich des Schraubenkopfs.`;
  // Two acrylic plates at the same screw position need a separately specified
  // head recess and assembly order. Without that proof, the combination stops.
  if(touching.length>1)return [{code:'mounting-access',hole:{...hole,radius:head},message}];
  const plate=touching[0],fullHole=hole.x-shaft>=plate.x&&hole.x+shaft<=plate.x+plate.width&&hole.y-shaft>=plate.y&&hole.y+shaft<=plate.y+plate.height;
  if(profile.manufacturing?.mountingHoles?.acrylic==='only-where-full-hole-inside-acrylic'&&fullHole)return [];
  return [{code:'mounting-access',hole:{...hole,radius:head},message}];
 });
}

