// Deterministic local editing only. Original uploads are retained separately.
import {designTextSize} from './usability-model.mjs';
export function removeConnectedBackground(data,width,height,seedX,seedY,tolerance=35){
  if(data.length!==width*height*4)throw Error('Ungültige Bildgröße.');
  const x=Math.max(0,Math.min(width-1,Math.floor(seedX))),y=Math.max(0,Math.min(height-1,Math.floor(seedY)));
  const seed=y*width+x,base=seed*4,target=[data[base],data[base+1],data[base+2]],seen=new Uint8Array(width*height),queue=new Uint32Array(width*height);
  let head=0,tail=1,count=0;queue[0]=seed;seen[seed]=1;
  const limit=3*tolerance*tolerance;
  while(head<tail){const n=queue[head++],i=n*4;
    if((data[i]-target[0])**2+(data[i+1]-target[1])**2+(data[i+2]-target[2])**2>limit)continue;
    data[i+3]=0;count++;
    const px=n%width;for(const v of [px>0?n-1:-1,px<width-1?n+1:-1,n-width,n+width])if(v>=0&&v<seen.length&&!seen[v]){seen[v]=1;queue[tail++]=v;}
  }return count;
}
export function fittedSize(width,height,max=1600){
  if(!(width>0&&height>0&&max>0))throw Error('Ungültige Bildmaße.');
  const scale=Math.min(1,max/Math.max(width,height));return {width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale))};
}
export function scaleObject(object,factor,physicalScale=1,minTextMm=undefined){
  if(!Number.isFinite(factor)||factor<=0)throw Error('Ungültige Skalierung.');
  if(object.type==='text')return {...object,size:designTextSize(object.size*factor*physicalScale,physicalScale,minTextMm)};
  const safe=Math.max(.05,Math.min(20,factor));return {...object,w:Math.max(1,object.w*safe),h:Math.max(1,object.h*safe)};
}

// Preserve available crop pixels without inventing resolution. Safety matches the
// 20-MP photo intake; very long edges are bounded for browser canvas support.
export function editedPhotoSize(width,height,{aspect=width/height,zoom=1,angle=0}={}){
  if(![width,height,aspect,zoom,angle].every(Number.isFinite)||width<=0||height<=0||aspect<=0||zoom<1||zoom>4||angle%90!==0)throw Error('Ungültiger Fotozuschnitt.');
  const rotated=Math.abs(angle%180)===90,sw=rotated?height:width,sh=rotated?width:height;
  const availableHeight=Math.min(sh,sw/aspect)/zoom,availableWidth=availableHeight*aspect;
  const scale=Math.min(1,8192/Math.max(availableWidth,availableHeight),Math.sqrt(20_000_000/(availableWidth*availableHeight)));
  return {width:Math.max(1,Math.floor(availableWidth*scale)),height:Math.max(1,Math.floor(availableHeight*scale)),limited:scale<1};
}
