import {insideContour} from './print-export-model.mjs';
import {contourContainsPolygon} from '../../platform/sources/app/shared/models/contour-geometry.mjs';
import {UV_PRINT_PALETTE} from '../../workshop/process-profiles.mjs';
// Customer setting in nominal font millimetres, not the height of each glyph.
// K10: the minimum comes from the process profile (minTextMm); 4 mm stays the
// default where no profile is known.
export const DEFAULT_MIN_TEXT_MM=4;
const minimum=min=>Number.isFinite(min)&&min>0?min:DEFAULT_MIN_TEXT_MM;
export function textSizeMm(value, minMm=DEFAULT_MIN_TEXT_MM) {
  const min=minimum(minMm);
  return Math.max(min, Math.min(100, Math.round((Number(value) || min)*100)/100));
}

export function physicalTextSize(object, physicalScale=1) {
  return Math.round(object.size*physicalScale);
}

export function designTextSize(physicalMm, physicalScale=1, minMm=DEFAULT_MIN_TEXT_MM) {
  if(!Number.isFinite(physicalScale)||physicalScale<=0)throw Error('Ungültiger Größenmaßstab.');
  return textSizeMm(physicalMm,minMm)/physicalScale;
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

// K10: the UV palette lives in the process profile (workshop/process-profiles.mjs).
export const PRINT_PALETTES = UV_PRINT_PALETTE.map(([name,colors])=>[name,colors.map(c=>[...c])]);
// Palette groups restricted to the hex list a process profile (or product selection) allows.
export function paletteGroups(allowed, groups=PRINT_PALETTES) {
  if (allowed === null || allowed === undefined) return groups.map(([name,colors])=>[name,colors.map(c=>[...c])]);
  const wanted = new Set(allowed.map(c=>String(c).toLowerCase())), labels = new Map(groups.flatMap(([,colors])=>colors.map(([label,hex])=>[hex.toLowerCase(),label])));
  const listed = groups.map(([name,colors])=>[name,colors.filter(([,hex])=>wanted.has(hex.toLowerCase())).map(c=>[...c])]).filter(([,colors])=>colors.length);
  const extra = [...wanted].filter(hex=>!labels.has(hex)).map(hex=>[hex.toUpperCase(),hex]);
  return extra.length ? [...listed,['Weitere Profilfarben',extra]] : listed;
}

export function transformedCorners(object, bounds) {
  const angle = (object.rotation || 0) * Math.PI / 180;
  return [[bounds.x,bounds.y],[bounds.x+bounds.width,bounds.y],
    [bounds.x+bounds.width,bounds.y+bounds.height],[bounds.x,bounds.y+bounds.height]]
    .map(([x,y])=>({x:object.x+x*Math.cos(angle)-y*Math.sin(angle),
      y:object.y+x*Math.sin(angle)+y*Math.cos(angle)}));
}

export function fitsSurface(object, bounds, surface) {
    surface={x:0,y:0,...surface};
  if(surface.shape==='contour')return contourContainsPolygon(surface.geometry||surface,transformedCorners(object,bounds));
  const epsilon = 0.001;
  return transformedCorners(object,bounds).every(({x,y})=>{
      if(surface.cornerRadiusMm>0)return insideContour({...surface,holes:[]},x-surface.x,y-surface.y);
    if(surface.shape==='ellipse') {
      const rx=surface.width/2, ry=surface.height/2;
      return ((x-surface.x-rx)/rx)**2+((y-surface.y-ry)/ry)**2<=1+epsilon;
    }
    return x>=surface.x-epsilon && y>=surface.y-epsilon &&
      x<=surface.x+surface.width+epsilon && y<=surface.y+surface.height+epsilon;
  });
}

// Keep position and rotation. Do not silently move or shrink below the minimum (profile minTextMm, default 4 mm).
export function fittingTextSize(object, bounds, surface, physicalScale=1, minMm=DEFAULT_MIN_TEXT_MM) {
  const min=minimum(minMm);
  let physical=textSizeMm(object.size*physicalScale,min);
  for(;;) {
    const size=designTextSize(physical,physicalScale,min);
    const scale=size/object.size;
    const b=Object.fromEntries(Object.entries(bounds).map(([k,v])=>[k,v*scale]));
    if(fitsSurface(object,b,surface))return size;
    if(physical===min)break;
    physical=Math.max(min,Math.round((physical-1)*100)/100);
  }
  return null;
}
