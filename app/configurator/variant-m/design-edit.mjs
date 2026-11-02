import {setTextSize} from '../../platform/sources/app/shared/models/text-paths.mjs';
// Shared by the correction form, suggestions and the embedded M editor.
export const roundEdit = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
export const editorTextSize = value => Math.max(1,Math.min(100,roundEdit(Number(value)||1)));
export function roundDesign(design) {
 const copy=structuredClone(design);
 for(const o of copy.objects)for(const key of ['x','y','w','h','size','rotation'])if(Number.isFinite(o[key]))o[key]=roundEdit(o[key]);
 return copy;
}
export function fitObject(object,{width,height}) {
 const o=structuredClone(object),angle=(o.rotation||0)*Math.PI/180;
 const bounds=()=>[Math.abs(o.w*Math.cos(angle))+Math.abs(o.h*Math.sin(angle)),Math.abs(o.w*Math.sin(angle))+Math.abs(o.h*Math.cos(angle))];
 const [bw,bh]=bounds(),scale=Math.min(1,(width-.04)/bw,(height-.04)/bh);
 if(scale<1){o.w*=scale;o.h*=scale;if(o.type==='text'){const size=Math.floor(o.size*scale*100)/100,ratio=size/o.size;o.w=object.w*ratio;o.h=object.h*ratio;setTextSize(o,size);}}
 const [w,h]=bounds();o.x=Math.max(w/2+.01,Math.min(width-w/2-.01,o.x));o.y=Math.max(h/2+.01,Math.min(height-h/2-.01,o.y));
 return roundDesign({objects:[o]}).objects[0];
}

