import {prepareConfig,variantCombinations,selectedProfile,quote} from '../configurator/variant-m/contract.mjs';
import {validateGeometryHoles} from '../platform/sources/app/shared/models/design-content.mjs';
import {validateContourGeometry} from './contour-path.mjs';

const fail=message=>{throw Error(message);};
const cents=n=>Number.isSafeInteger(n)&&n>=0&&n<=100000000;
// Fixed-size catalogue plates. The existing acrylic pedestal pilot keeps its
// separate size/base price contract; family prices use the common quote only.
export function nativeFamilyAcrylicConfig(input){
 const p=input?.profile,source=input?.familyAcrylic;
 const clearCross=source?.familyId==='uv-gedenkkreuze-acryl-klar'&&p?.material?.variant==='klar'&&p.material.thicknessMm===5&&p.material.engravingSide==='back'&&p.processing?.profileId==='color-print';
 if(source?.schema!=='gravuru-family-acrylic/v1'||typeof source.familyId!=='string'||!source.familyId||typeof source.sizeKey!=='string'||!source.sizeKey||input.acrylic||input.doorbell||input.steelFormats||p?.kind!=='universal-product'||p.material?.kind!=='acrylic'||!(['anthrazit','schwarz','satiniert'].includes(p.material.variant)||clearCross)||!['front','back'].includes(p.material.engravingSide)||!['acrylic-engraving','color-print'].includes(p.processing?.profileId)||input.reviewOnly!==true||p.binding?.kind!=='local-review'||p.features?.orderEnabled!==false||p.features?.productionConfirmed!==false)fail('Acryl-Familie benötigt einen festen Katalogstand, Material, Gravurseite und eine lokale Prüfvorlage.');
 if(!cents(input.basePriceCents)||!cents(input.extraMotifCents)||!cents(input.photo?.extraPriceCents)||!Number.isSafeInteger(input.photo?.includedCount)||input.photo.includedCount<0||input.photo.includedCount>4)fail('Acryl-Familienpreise und Fotoangaben müssen vollständig sein.');
 const groups=p.optionGroups;
 if(!Array.isArray(groups)||groups[0]?.id!=='mounting'||!groups[0].values?.length||groups[0].values.some(v=>!Array.isArray(v.holes)))fail('Acryl-Familie benötigt ausdrückliche Bohrbilder je Befestigung.');
 if(p.backingPreview){
  const b=p.backingPreview,g=b.geometry,o=b.offsetMm;
  if(!Number.isFinite(o)||o<0||o>100||!Number.isFinite(b.thicknessMm)||b.thicknessMm<=0||g?.width!==p.geometry.width+2*o||g?.height!==p.geometry.height+2*o||g.shape!=='contour'||g.holes?.length!==0)fail('Rückplatte und Front müssen zum festen Familienmaß passen.');
  validateContourGeometry(g);
 }
 const c=prepareConfig(input);
 if(c.profile.designs.length!==p.designs.length)fail('Eine Vorlage widerspricht der Fotofreigabe.');
 for(const options of variantCombinations(c)){
  validateGeometryHoles(selectedProfile(c,options));
  for(const d of c.profile.designs)if(!cents(quote(c,d.objects,d.id,options).unitCents))fail('Acryl-Gesamtpreis außerhalb des gültigen Bereichs.');
 }
 return c;
}
