// Shared by workshop, customer preview and future exports. Coordinates are centred mm.
export function photoArchCurves({w,h}){
 const r=w/2,top=-h/2,spring=top+r,k=.5522847498307936*r;
 return [[[-r,spring],[-r,spring-k],[-k,top],[0,top]],[[0,top],[k,top],[r,spring-k],[r,spring]]];
}
export function photoShape(o){
 const {w,h}=o;
 if(o.photoShape==='arch'){
  const curves=photoArchCurves(o);
  return `<path d="M${-w/2} ${h/2}V${curves[0][0][1]}${curves.map(points=>'C'+points.slice(1).map(p=>p.join(' ')).join(' ')).join('')}V${h/2}Z"`;
 }
 return ['circle','ellipse'].includes(o.photoShape)?`<ellipse rx="${w/2}" ry="${h/2}"`:`<rect x="${-w/2}" y="${-h/2}" width="${w}" height="${h}"`;
}
