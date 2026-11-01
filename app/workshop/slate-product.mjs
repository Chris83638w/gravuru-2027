import {prepareConfig, resolvedOptions, selectedProfile, quote} from '../configurator/variant-m/contract.mjs';
import {validateGeometryHoles} from '../platform/sources/app/shared/models/design-content.mjs';
import {measureText} from '../platform/sources/app/shared/models/doorbell-preview.mjs';

const fail = message => {throw Error(message);};
const cents = value => Number.isSafeInteger(value) && value >= 0 && value <= 100000000;

// The existing native renderer already supports these profiles. Keep original
// vector motifs, embedded font outlines and element IDs; never flatten a design.
// This adapter only admits review products, not a Shopify or production release.
export function nativeSlateConfig(input) {
  const p = input?.profile;
  if (!p || input.acrylic || p.kind !== 'universal-product' || p.material?.kind !== 'slate' ||
      p.processing?.profileId !== 'slate-engraving' || !['rect','ellipse','contour'].includes(p.geometry?.shape) ||
      input.reviewOnly !== true || p.binding?.kind !== 'local-review' ||
      p.features?.orderEnabled !== false || p.features?.productionConfirmed !== false) {
    fail('Schiefer benötigt eine native Gravurvorlage mit bestätigter Geometrie ohne Bestell- oder Maschinenfreigabe.');
  }
  const groups = p.optionGroups;
  if (!Array.isArray(groups) || groups.length !== 1 || groups[0].id !== 'mounting' ||
      !Array.isArray(groups[0].values) || !groups[0].values.length ||
      !groups[0].values.some(value => value.id === groups[0].defaultValueId) ||
      groups[0].values.some(value => !Array.isArray(value.holes))) {
    fail('Schiefer benötigt eine eindeutige Befestigungsauswahl mit ausdrücklichen Bohrbildern.');
  }
  if (!cents(input.basePriceCents) || !cents(input.extraMotifCents) ||
      !cents(input.photo?.extraPriceCents) || !Number.isSafeInteger(input.photo?.includedCount) ||
      input.photo.includedCount < 0 || input.photo.includedCount > 4) {
    fail('Schieferpreise und enthaltene Fotos müssen vollständig und centgenau vorliegen.');
  }
  if (!p.designs?.some(design => design.id === p.defaultDesignId)) fail('Das Standarddesign fehlt.');
  const config = prepareConfig(input);
  if (config.profile.designs.length !== p.designs.length) fail('Eine Originalvorlage widerspricht der Fotofreigabe.');
  for (const design of config.profile.designs) {
    for (const object of design.objects.filter(object => object.type === 'text')) {
      measureText(object, config.localResources?.fonts || {});
    }
  }
  for (const value of config.profile.optionGroups[0].values) {
    const options = resolvedOptions(config, {mounting: value.id});
    validateGeometryHoles(selectedProfile(config, options));
    for (const design of config.profile.designs) {
      const price = quote(config, design.objects, design.id, options);
      if (!cents(price.unitCents)) fail('Der vollständige Schieferpreis liegt außerhalb des gültigen Bereichs.');
    }
  }
  return config;
}
