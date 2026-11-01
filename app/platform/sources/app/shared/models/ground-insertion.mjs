// Issue #76, 01.11.2026: 50 mm below ground, artwork 5 mm above it.
// Opt-in catalogue dimensions in mm; physical cutting geometry stays complete.
export function validateGroundInsertion(geometry){
 const g=geometry.groundInsertion;if(g===undefined)return;
 if(!g||typeof g!=='object'||Array.isArray(g)||Object.keys(g).some(k=>!['depthMm','clearanceMm'].includes(k))||
    !Number.isFinite(g.depthMm)||g.depthMm<=0||!Number.isFinite(g.clearanceMm)||g.clearanceMm<0||
    !Number.isFinite(geometry.height)||g.depthMm+g.clearanceMm>=geometry.height)
  throw Error('Erdteil und Gestaltungsabstand benötigen gültige Maße innerhalb der Plattenhöhe.');
}
export function visiblePlateHeight(geometry){return geometry.height-(geometry.groundInsertion?.depthMm??0);}
export function groundArtworkBottom(geometry){return geometry.groundInsertion?visiblePlateHeight(geometry)-geometry.groundInsertion.clearanceMm:Infinity;}
export function aboveGround(points,geometry,reserve=0){const bottom=groundArtworkBottom(geometry);return points.every(p=>(Array.isArray(p)?p[1]:p.y)<=bottom-reserve+1e-9);}
export const GROUND_ISSUE='Element ragt in den Erdteil oder seinen Gestaltungsabstand hinein.';
