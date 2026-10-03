// Explicitly local, externally supplied review assets. No Shopify/public release.
import {measureText} from '../../platform/sources/app/shared/models/doorbell-preview.mjs';
import {validateDesignContent} from '../../platform/sources/app/shared/models/design-content.mjs';
import {isArtworkResource} from './artwork-resource.mjs';

export function localFontIds(config) {
  if (!config.localResources) return [];
  if (config.reviewOnly !== true || config.profile.binding?.kind !== 'local-review' || config.profile.features?.orderEnabled !== false) throw Error('Eigene Schriftressourcen sind nur im lokalen Prüfprodukt erlaubt.');
  const resources=config.localResources;
  if(resources.scope!=='local-review-only'||!resources.fonts||!Array.isArray(resources.motifs))throw Error('Lokale Ressourcen unvollständig.');
  const ids=Object.keys(resources.fonts);
  if(ids.length>64)throw Error('Lokale Schriftanzahl ungültig.');
  for(const name of ids){
    const f=resources.fonts[name]?.regular;
    if(!f||!Number.isFinite(f.units)||f.units<=0||!f.glyphs)throw Error('Lokale Schrift ungültig.');
    for(const [character,g] of Object.entries(f.glyphs))if([...character].length!==1||!Number.isFinite(g.a)||typeof g.d!=='string'||!/^[MmLlHhVvCcSsQqTtAaZz\d.,+eE\s-]*$/.test(g.d))throw Error('Lokale Schrift enthält ungültige Pfade.');
  }
  for(const m of resources.motifs){
    if(m.artwork!==undefined){if(!isArtworkResource(m))throw Error('Importierte Designressource ist ungültig.');continue;}
    if(m.embeddedOnly!==undefined&&typeof m.embeddedOnly!=='boolean')throw Error('Vorlagenmotiv-Kennzeichnung ist ungültig.');
    if(!/^[\w.-]{1,120}$/.test(m.key)||!Array.isArray(m.bounds)||m.bounds.length!==4||!m.bounds.every(Number.isFinite)||m.bounds[2]<=0||m.bounds[3]<=0||typeof m.svgFragment!=='string'||!m.svgFragment.match(/^(?:<path d="[MmLlHhVvCcSsQqTtAaZz\d.,+eE\s-]+" fill="(?:currentColor|none)" fill-rule="(?:evenodd|nonzero)"(?: stroke="currentColor" stroke-width="\d+(?:\.\d+)?")?\/>)+$/))throw Error('Lokales Motiv enthält nicht erlaubte Inhalte.');
  }
  return ids;
}

export function makeLocalPilot(bundle,reference) {
  if(bundle?.schema!=='gravuru-local-pdf-pilot/v1'||bundle.design?.id!=='GT-S-22x14-D201'||bundle.source?.sha256?.length!==64)throw Error('Unbekanntes Pilotpaket.');
  if(bundle.geometry?.width!==220||bundle.geometry?.height!==140)throw Error('Pilotmaße müssen 220 × 140 mm sein.');
  if(!Object.keys(bundle.resources?.fonts||{}).length)throw Error('Lokale Schriftanzahl ungültig.');
  const config=structuredClone(reference),p=config.profile;
  p.id='local-gt-s-22x14-d201';p.name='Gedenktafel · 22 × 14 cm · D201';p.revision=bundle.revision;
  p.binding={kind:'local-review',productId:'local-GT-S-22x14',sourceDesignId:bundle.design.id};
  p.geometry={width:220,height:140,shape:'rect',cornerRadiusMm:0,safeMarginMm:0,holes:[]};
  p.features={...p.features,orderEnabled:false,productionConfirmed:false};
  // Same mounting variants, diameter and edge offsets; keep center holes centered.
  for(const group of p.optionGroups||[])for(const v of group.values||[])for(const h of v.holes||[]){
    h.x=h.x===150?110:h.x>150?h.x-80:h.x;
    h.y=h.y===100?70:h.y>100?h.y-60:h.y;
  }
  p.designs=[structuredClone(bundle.design)];
  config.reviewOnly=true;config.basePriceCents=null;config.extraMotifCents=null;
  config.localResources=structuredClone(bundle.resources);config.photo={enabled:true,mode:'upload-only'};
  config.localSource=structuredClone(bundle.source);
  const ids=localFontIds(config);
  validateDesignContent(p.designs[0],{universal:true,extraFontIds:ids});
  for(const o of p.designs[0].objects)if(o.type==='text')measureText(o,config.localResources.fonts);
  return config;
}
