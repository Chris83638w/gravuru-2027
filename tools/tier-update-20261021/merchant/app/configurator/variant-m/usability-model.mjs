// Customer setting in nominal font millimetres, not the height of each glyph.
export function textSizeMm(value) {
  return Math.max(4, Math.min(100, Math.round((Number(value) || 4)*100)/100));
}

export function physicalTextSize(object, physicalScale=1) {
  return Math.round(object.size*physicalScale*100)/100;
}

export function designTextSize(physicalMm, physicalScale=1) {
  if(!Number.isFinite(physicalScale)||physicalScale<=0)throw Error('Ungültiger Größenmaßstab.');
  return textSizeMm(physicalMm)/physicalScale;
}

export function canColorElement(object) {
  return !!object && !object.uxHidden && !object.uxLocked &&
    object.type !== 'photoSlot' && object.type !== 'photo' && object.uxUploadKind !== 'photo';
}

export function applyPrintColor(object, color) {
  if (!canColorElement(object)) return;
  object.color = color;
  if (object.type === 'motif') object.preserveColors = false;
  else delete object.preserveColors;
  if (object.uxUploadKind === 'logo') object.uxLogoTint = true;
}

export function restoreOriginalColors(object) {
  if (!canColorElement(object)) return;
  if (object.type === 'motif') object.preserveColors = true;
  if (object.uxUploadKind === 'logo') delete object.uxLogoTint;
}

export const PRINT_PALETTES = [
  ['Standardfarben', [['Schwarz','#191919'],['Weiß','#ffffff'],['Grau','#7b8385'],['Rot','#c93232'],['Orange','#e78626'],['Gelb','#efca37'],['Grün','#28734b'],['Blau','#245cac'],['Violett','#7847a6'],['Pink','#d8498a'],['Braun','#795137'],['Türkis','#21958f']]],
  ['Pastellfarben', [['Rosé','#edc4cf'],['Pfirsich','#f2ceba'],['Vanille','#f4e6b5'],['Mint','#c5e2cf'],['Salbei','#b9cdbc'],['Himmelblau','#bed9ed'],['Lavendel','#d5c9e9'],['Sand','#ded1bc']]]
];

export function transformedCorners(object, bounds) {
  const angle = (object.rotation || 0) * Math.PI / 180;
  return [[bounds.x,bounds.y],[bounds.x+bounds.width,bounds.y],
    [bounds.x+bounds.width,bounds.y+bounds.height],[bounds.x,bounds.y+bounds.height]]
    .map(([x,y])=>({x:object.x+x*Math.cos(angle)-y*Math.sin(angle),
      y:object.y+x*Math.sin(angle)+y*Math.cos(angle)}));
}

export function fitsSurface(object, bounds, surface) {
  const epsilon = 0.001;
  return transformedCorners(object,bounds).every(({x,y})=>{
    if(surface.shape==='ellipse') {
      const rx=surface.width/2, ry=surface.height/2;
      return ((x-surface.x-rx)/rx)**2+((y-surface.y-ry)/ry)**2<=1+epsilon;
    }
    return x>=surface.x-epsilon && y>=surface.y-epsilon &&
      x<=surface.x+surface.width+epsilon && y<=surface.y+surface.height+epsilon;
  });
}

// Keep position and rotation. Do not silently move or shrink below 4 mm.
export function fittingTextSize(object, bounds, surface, physicalScale=1) {
  let physical=textSizeMm(object.size*physicalScale);
  for(;;) {
    const size=designTextSize(physical,physicalScale);
    const scale=size/object.size;
    const b=Object.fromEntries(Object.entries(bounds).map(([k,v])=>[k,v*scale]));
    if(fitsSurface(object,b,surface))return size;
    if(physical===4)break;
    physical=Math.max(4,Math.round((physical-1)*100)/100);
  }
  return null;
}
