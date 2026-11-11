import {isScalableSizes} from './scalable-sizes.mjs';
import {resolvedOptions,selectedProfile} from './contract.mjs';
import {ACRYLIC_BASES,acrylicBaseImageUrl} from './acrylic-product.mjs';
import {baseAnchors} from './acrylic-base-anchors.mjs';

export const isScalableAcrylicScene=config=>isScalableSizes(config)&&!config.acrylic&&config.profile?.material?.kind==='acrylic'&&config.profile?.processing?.profileId==='color-print';
// Existing scene/slot calibration. These are image pixels, never product mm.
const SOURCE={width:1086,height:1448,plateLeft:86,plateTop:50,plateWidth:912,plateHeight:1196};
const square=SOURCE.height;
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));

// Pure presentation projection. Native selectedProfile/resolvedOptions remain
// authoritative for dimensions and allowed bases; no price calculation here.
export function scalableAcrylicSceneLayout(config,values={}){
 if(!isScalableAcrylicScene(config))return null;
 const options=resolvedOptions(config,values),profile=selectedProfile(config,options),g=profile.geometry;
 if(![g.width,g.height].every(n=>Number.isFinite(n)&&n>0))throw Error('Ungültige Acrylglas-Geometrie.');
 const plateHeight=SOURCE.plateHeight,plateWidth=plateHeight*g.width/g.height;
 const plate={left:(square-plateWidth)/2,top:SOURCE.plateTop,width:plateWidth,height:plateHeight};
 const xScale=plateWidth/SOURCE.plateWidth;
 const backdrop={left:plate.left-SOURCE.plateLeft*xScale,top:0,width:SOURCE.width*xScale,height:square};
 const base=ACRYLIC_BASES.find(b=>b.id===options.base&&b.asset),anchor=base&&baseAnchors[base.asset];
 let stand=null;
 if(anchor){
  const scale=plate.width/(anchor.right-anchor.left),slot=plate.top+plate.height-base.insertionMm*plate.height/g.height;
  stand={id:base.id,url:acrylicBaseImageUrl(base.asset),flat:!!base.flat,
   left:plate.left+plate.width/2-(anchor.left+anchor.right)/2*scale,top:slot-anchor.slot*scale,
   width:anchor.width*scale,height:anchor.height*scale,slot,
   frontClip:`inset(${anchor.slot/anchor.height*100}% 0 0 0)`,
   backClip:`inset(${(anchor.bodyTop-8)/anchor.height*100}% 0 ${100-anchor.slot/anchor.height*100}% 0)`};
 }
 return {square,options,geometry:g,plate,backdrop,stand};
}

// Extend only the narrow beige edges horizontally. The central glass image
// maps onto the current physical plate ratio; artwork itself is never stretched.
export function scalableAcrylicBackdrop(layout,url='/acrylic-assets/scene-empty-v2.webp'){
 const {backdrop:b,square:s}=layout,src=escape(url),image=`<image href="${src}" width="${SOURCE.width}" height="${SOURCE.height}"/>`;
 const left=Math.max(0,b.left),right=Math.min(s,b.left+b.width);
 return `<svg x="0" y="0" width="${left}" height="${s}" viewBox="0 0 60 ${SOURCE.height}" preserveAspectRatio="none">${image}</svg>`+
  `<image href="${src}" x="${b.left}" y="0" width="${b.width}" height="${s}" preserveAspectRatio="none"/>`+
  `<svg x="${right}" y="0" width="${s-right}" height="${s}" viewBox="1026 0 60 ${SOURCE.height}" preserveAspectRatio="none">${image}</svg>`;
}

// Change only the renderer's top-level plate face in the interactive preview.
// Nested photo masks, white artwork, production SVG and photo exports stay native.
export function transparentScalableAcrylicFace(root,geometry){
 for(const node of [...root.children])if(node.localName==='rect'&&!node.hasAttribute('data-object')&&
  Number(node.getAttribute('width'))===geometry.width&&Number(node.getAttribute('height'))===geometry.height&&
  !Number(node.getAttribute('x'))&&!Number(node.getAttribute('y'))){
  node.setAttribute('fill','transparent');node.setAttribute('stroke','none');
 }
 return root;
}
