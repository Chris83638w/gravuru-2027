import {prepareConfig} from '../configurator/variant-m/contract.mjs';
import {isLayeredDoorbell,validateDoorbellDefinition,selectedDoorbellProfile} from '../configurator/variant-m/doorbell-selection.mjs';
import {validateStudio} from '../platform/sources/app/shared/models/studio-products.mjs';
import {measureText} from '../platform/sources/app/shared/models/doorbell-preview.mjs';
import {workshopResources} from './catalog.mjs';

// Production/sales approval is external and revision-bound. This adapter validates
// a real generic family without weakening the historical review-only AOSU specimen.
export function nativeDoorbellConfig(input){
 if(!isLayeredDoorbell(input))throw Error('Ein versioniertes natives Funkklingelmodell ist erforderlich.');
 const c=structuredClone(input);validateDoorbellDefinition(c);
 if(!Number.isSafeInteger(c.extraMotifCents)||c.extraMotifCents<0||!c.localResources||typeof c.localResources.fonts!=='object'||!Array.isArray(c.localResources.motifs))throw Error('Funkklingel: Verbindliche Preise und native Ressourcen fehlen.');
 const texts=c.doorbell.formats.flatMap(f=>f.profile.designs.flatMap(d=>d.objects.filter(o=>o.type==='text')));
 // Library fonts are delivered by the existing lazy resource endpoint. Validate
 // with those exact server resources without copying megabytes into each record.
 const fonts=texts.some(o=>!c.localResources.fonts[o.font])?workshopResources(c.localResources).fonts:c.localResources.fonts;
 for(const o of texts)measureText(o,fonts);
 c.profile=selectedDoorbellProfile(c);
 const validated=prepareConfig(c);
 const extraFontIds=Object.keys(fonts);
 // All format/position/frame combinations use the same validation as a customer
 // draft. Their device cut geometry is never inferred from the display PNG.
 for(const f of c.doorbell.formats)for(const position of ['standard','opposite'])for(const frame of f.profile.frames){
  const p=selectedDoorbellProfile(validated,{format:f.key,position,frame:frame.key});
  validateStudio(p,p,{extraFontIds,motifs:c.localResources.motifs});
 }
 return validated;
}

