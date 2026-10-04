// Shared by workshop, customer preview and future exports. Coordinates are centred mm.
export function photoShape(o){
 const {w,h}=o;
 if(o.photoShape==='arch'){
  const radius=w/2,top=-h/2,spring=top+radius,k=.5522847498307936*radius;
  return `<path d="M${-radius} ${h/2}V${spring}C${-radius} ${spring-k} ${-k} ${top} 0 ${top}C${k} ${top} ${radius} ${spring-k} ${radius} ${spring}V${h/2}Z"`;
 }
 return ['circle','ellipse'].includes(o.photoShape)?`<ellipse rx="${w/2}" ry="${h/2}"`:`<rect x="${-w/2}" y="${-h/2}" width="${w}" height="${h}"`;
}
