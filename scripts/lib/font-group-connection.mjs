import {createFontGroupConnection} from '../../app/workshop/font-group-connection.mjs';
import {createGallerySyncActivation} from '../../app/workshop/gallery-shop-sync-activation.mjs';
import {createGallerySyncShopifyTransport} from '../../app/workshop/gallery-shop-sync-transport.mjs';
import {createCatalogFontSets} from '../../app/workshop/catalog-fontsets.mjs';
import {workshopResources} from '../../app/workshop/catalog.mjs';

// Private host integration only; never build this configuration from an HTTP
// request. Reuse the host's existing authenticated GraphQL reader/workshop.
// There is no customer route, startup call, automatic batch or Shopify writer.
export function createFontGroupShopConnection({workshop, tenantId = workshop?.tenantId, shopDomain,
  katalogRoot, targets, approvedSets, graphql, runtimeFonts = workshopResources().fonts,
  personalizationPricingFor, executionEnabled = false, clock = Date.now} = {}) {
  if (!workshop || typeof graphql !== 'function' || typeof katalogRoot !== 'string' || !katalogRoot)
    throw Object.assign(Error('Vorhandene Werkstatt, Katalogpfad und authentifizierter Shopify-Lesezugriff fehlen.'), {code: 'font_connection_configuration', status: 422});
  const catalogFontSets = createCatalogFontSets({root: katalogRoot, profiles: workshop.profiles,
    fontLibrary: workshop.fonts, repository: workshop.repository, runtimeFonts});
  const activation = createGallerySyncActivation({workshop, tenantId, shopDomain, personalizationPricingFor, clock, approvalMode: 'preserve'});
  const transport = createGallerySyncShopifyTransport({shopDomain, graphql, writesEnabled: false, clock});
  return createFontGroupConnection({workshop, tenantId, shopDomain, activation, transport, catalogFontSets,
    targets, approvedSets, executionEnabled});
}
