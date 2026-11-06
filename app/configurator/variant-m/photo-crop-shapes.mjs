// The mask is applied to preview and exported pixels by the same canvas path.
export const PHOTO_CROP_ASPECTS=Object.freeze({square:1,circle:1,portrait:3/4,landscape:4/3,heart:1,oval:3/4,star:1,cloud:4/3});
export function clipPhotoShape(ctx,shape,width,height){
 if(!['circle','heart','oval','star','cloud'].includes(shape))return false;
 ctx.save();ctx.scale(width,height);ctx.beginPath();
 if(shape==='circle'||shape==='oval')ctx.ellipse(.5,.5,.5,.5,0,0,Math.PI*2);
 if(shape==='heart'){
  ctx.moveTo(.5,.97);ctx.bezierCurveTo(.42,.87,.02,.59,.02,.29);
  ctx.bezierCurveTo(.02,-.02,.36,-.05,.5,.2);
  ctx.bezierCurveTo(.64,-.05,.98,-.02,.98,.29);
  ctx.bezierCurveTo(.98,.59,.58,.87,.5,.97);
 }
 if(shape==='star')for(let i=0;i<10;i++){
  const a=-Math.PI/2+i*Math.PI/5,r=i%2?.22:.49,x=.5+Math.cos(a)*r,y=.5+Math.sin(a)*r;
  i?ctx.lineTo(x,y):ctx.moveTo(x,y);
 }
 if(shape==='cloud'){
  ctx.moveTo(.22,.91);ctx.bezierCurveTo(-.06,.91,-.06,.49,.15,.45);
  ctx.bezierCurveTo(.1,.2,.28,.07,.45,.18);
  ctx.bezierCurveTo(.55,-.08,.85,.05,.86,.31);
  ctx.bezierCurveTo(1.08,.32,1.04,.69,.91,.72);
  ctx.bezierCurveTo(.94,.91,.76,1,.65,.9);
  ctx.bezierCurveTo(.52,1.04,.37,1.01,.3,.9);
  ctx.bezierCurveTo(.27,.91,.25,.91,.22,.91);
 }
 ctx.closePath();ctx.restore();ctx.clip();return true;
}
