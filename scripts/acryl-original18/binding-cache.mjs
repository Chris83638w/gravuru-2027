// Scope one native check + persist block, never the complete catalogue job.
// The core still owns validation and prices. Its opt-in cache does not retain
// repository reads, binding heads, profile readiness or Shopify evidence.
import {withShopPreparationCache} from '../../app/workshop/shop-preparation.mjs';

export function withBindingPreparationCache(work){
 return withShopPreparationCache(work);
}
