import {printArtwork,physicalGeometry} from './print-export.mjs';
import {acrylicSelection,acrylicOptions} from './acrylic-product.mjs';
import {insideContour} from './print-export-model.mjs';

// Search the actual visible artwork, including transparent template layers.
export function emptyPixelPosition(alpha,width,height,boxWidth,boxHeight,allowed=()=>true){
 const integral=new Uint32Array((width+1)*(height+1)),stride=width+1;
 for(let y=0;y<height;y++){let row=0;for(let x=0;x<width;x++){row+=alpha[(y*width+x)*4+3]>0||!allowed(x,y)?1:0;integral[(y+1)*stride+x+1]=integral[y*stride+x+1]+row;}}
 const hw=Math.ceil(boxWidth/2)+2,hh=Math.ceil(boxHeight/2)+2;let best=null,distance=Infinity;
 for(let y=hh;y<=height-hh;y+=2)for(let x=hw;x<=width-hw;x+=2){
  if(!allowed(x-hw,y-hh)||!allowed(x+hw,y-hh)||!allowed(x-hw,y+hh)||!allowed(x+hw,y+hh))continue;
  const occupied=integral[(y+hh)*stride+x+hw]-integral[(y-hh)*stride+x+hw]-integral[(y+hh)*stride+x-hw]+integral[(y-hh)*stride+x-hw];
  const d=(x-width/2)**2+(y-height/2)**2;if(!occupied&&d<distance){distance=d;best={x,y};}
 }
 return best;
}
export async function placeNewMotif({el,config,files,say},object){
 const before=JSON.stringify(el.state.objects),state={...el.state,selected:null,objects:el.state.objects.filter(o=>o.id!==object.id)};
 const facade={state,fontData:el.fontData,objectSVG:o=>el.objectSVG(o),uxObjectSVG:o=>el.uxObjectSVG(o)};
 const art=await printArtwork({el:facade,config,files}),g=physicalGeometry(config,state),scale=2;
 const canvas=document.createElement('canvas');canvas.width=Math.ceil(g.width*scale);canvas.height=Math.ceil(g.height*scale);
 const ctx=canvas.getContext('2d',{willReadFrequently:true}),url=URL.createObjectURL(new Blob([art.svg],{type:'image/svg+xml'})),img=new Image();
 try{img.src=url;await img.decode();ctx.drawImage(img,0,0,canvas.width,canvas.height);}finally{URL.revokeObjectURL(url);}
 if(before!==JSON.stringify(el.state.objects))return say('Die Gestaltung wurde während der Platzsuche geändert. Bitte die Position des neuen Motivs prüfen.');
 const sx=g.width/config.profile.geometry.width,sy=g.height/config.profile.geometry.height;
 const insertion=config.acrylic?acrylicSelection(acrylicOptions(state.mOptions),config.acrylic.pricing).base.insertionMm:0;
 const position=emptyPixelPosition(ctx.getImageData(0,0,canvas.width,canvas.height).data,canvas.width,canvas.height,object.w*sx*scale,object.h*sy*scale,(x,y)=>y/scale<g.height-insertion&&insideContour(g,x/scale,y/scale));
 if(position){object.x=position.x/scale/sx;object.y=position.y/scale/sy;el.sync();say('Motiv in einer freien Fläche platziert.');}
 else{el.state.objects=el.state.objects.filter(o=>o.id!==object.id);if(el.state.selected===object.id)el.state.selected=null;el.sync();say('Kein ausreichend freier Platz. Das Motiv wurde nicht hinzugefügt. Bitte zuerst Platz schaffen.');}
}
