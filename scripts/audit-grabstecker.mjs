// Source audit for #139. Read-only: validate all sizes against the cutting drawing.
import fs from 'node:fs';
import path from 'node:path';
import {validateFamily,familyProductConfig} from '../app/workshop/product-families.mjs';
import {nativeContour} from '../app/workshop/acrylic-artwork.mjs';
const root=process.argv[2];if(!root)throw Error('Usage: node scripts/audit-grabstecker.mjs <katalog>');
const family=JSON.parse(fs.readFileSync(path.join(root,'familien/edelstahl/grabstecker-edelstahl.json')));
const drawing=JSON.parse(fs.readFileSync(path.join(root,'schneidvorlagen/grabstecker/grabstecker.json')));
validateFamily(family);
const results=family.sizes.map(size=>{
 const source=drawing.groessen[size.key.replace('GS-V2A-','')];
 if(!source||source.outline!==size.outlinePath||source.widthMm!==size.widthMm||source.heightMm!==size.heightMm||source.kopfBisMm!==size.workingArea?.headHeightMm||source.ansichtBisMm!==size.workingArea?.previewHeightMm||JSON.stringify(source.innenausschnitte)!==JSON.stringify(size.cutoutPaths||[]))throw Error('Source mismatch '+size.key);
 const config=familyProductConfig({...family,sizes:[size],groups:family.groups.filter(g=>g.key===size.groupKey)},size,1),text=config.profile.designs[0].objects[0],contour=nativeContour(config.profile.geometry);
 if(text.y+text.h/2>source.kopfBisMm||text.size<1||contour.heightMm!==source.heightMm||contour.contours[0].d!==source.outline||contour.holeCount!==source.innenausschnitte.length)throw Error('Wrong head or production contour '+size.key);
 return {sizeKey:size.key,headHeightMm:source.kopfBisMm,workingHeightMm:source.ansichtBisMm,productionHeightMm:contour.heightMm,cutouts:contour.holeCount,ok:true};
});
console.log(JSON.stringify({count:results.length,results},null,2));
