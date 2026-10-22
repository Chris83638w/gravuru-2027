// User's 21.10.2026 layout corrections. Original paths and fonts are retained.
export const retiredSteelDesigns=new Set(['TS-Edelstahl-D2','TS-Edelstahl-D70','TS-Edelstahl-D71']);
export const steelHoleClearanceMm=4;
export function correctSteelLayout(id,texts,motifs){
 const n=Number(id.split('-D')[1]);
 const resize=(f,s)=>{f.widthMm*=s;f.heightMm*=s;if(f.type==='text')f.sizeMm*=s;};
 const center=(f,x=45)=>f.xMm=x-f.widthMm/2;
 if([3,4].includes(n)){
  const line=motifs[0],ordered=[...texts].sort((a,b)=>a.yMm-b.yMm),upper=ordered[0],lower=ordered[1];
  upper.yMm=line.yMm-upper.heightMm-3;lower.yMm=line.yMm+line.heightMm+3;
  if(n===3){center(upper,line.xMm+line.widthMm/2);center(lower,line.xMm+line.widthMm/2);}else{upper.xMm=line.xMm;lower.xMm=line.xMm+line.widthMm-lower.widthMm;}
 }
 if(n===5){const mid=motifs[0].xMm+motifs[0].widthMm/2;for(const f of texts)center(f,mid);}
 if([13,47].includes(n)){
  const m=motifs[0];if(n===13){resize(m,.85);for(const f of texts)resize(f,.82);}
  const ordered=[...texts].sort((a,b)=>a.yMm-b.yMm),tw=Math.max(...texts.map(f=>f.widthMm)),th=ordered.reduce((sum,f)=>sum+f.heightMm,0)+3*(texts.length-1),height=Math.max(th,m.heightMm);
  m.xMm=0;m.yMm=(height-m.heightMm)/2;let y=(height-th)/2;
  for(const f of ordered){f.xMm=m.widthMm+4+(tw-f.widthMm)/2;f.yMm=y;y+=f.heightMm+3;}
 }
 if(n===20){for(const f of texts){resize(f,.72);center(f);}const t=[...texts].sort((a,b)=>a.yMm-b.yMm);t[0].yMm=13;t[1].yMm=27;}
 if(n===57)motifs[0].yMm+=5;
 if(n===61)[...texts].sort((a,b)=>a.yMm-b.yMm)[0].yMm+=4;
 const all=[...motifs,...texts],boxes=all.map(f=>[f.xMm,f.yMm,f.widthMm,f.heightMm]);
 if(n===20)boxes.push([0,0,90,60]);
 let minX=Math.min(...boxes.map(b=>b[0]))-.01,minY=Math.min(...boxes.map(b=>b[1]))-.01,maxX=Math.max(...boxes.map(b=>b[0]+b[2]))+.01,maxY=Math.max(...boxes.map(b=>b[1]+b[3]))+.01;
 if([57,61].includes(n))minY-=6;
 return {fields:all.map(f=>({...f,xMm:f.xMm-minX,yMm:f.yMm-minY})),w:maxX-minX,h:maxY-minY,footer:[14,15].includes(n)};
}
export function settleSteelFlowers(fields,row,holes,safeBox){
 const flowers=fields.filter(f=>f.type==='motif');if(!flowers.length)return;
 const x=Math.min(...flowers.map(f=>f.xMm)),y=Math.min(...flowers.map(f=>f.yMm)),right=Math.max(...flowers.map(f=>f.xMm+f.widthMm)),bottom=Math.max(...flowers.map(f=>f.yMm+f.heightMm));
 let lo=0,hi=Math.max(0,row.heightMm-bottom);for(let i=0;i<22;i++){const dy=(lo+hi)/2;if(safeBox(x,y+dy,right-x,bottom-y,row,holes))lo=dy;else hi=dy;}
 for(const f of flowers)f.yMm+=lo*.999;
}
