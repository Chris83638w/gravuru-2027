import {createHash} from 'node:crypto';
import {readReviewPackage} from '../../app/workshop/review-package.mjs';
import {NATIVE_REVIEW_SCHEMAS} from '../../app/workshop/native-review-schema.mjs';
import {customerTextLine} from '../../app/configurator/variant-m/text-summary.mjs';

const fail = (status,message) => { throw Object.assign(Error(message),{status}); };

export function createReviewCart(workshop, products) {
  const carts = new Map();
  const drafts = workshop.customerDrafts;
  const ledger = drafts.cartConfigurations;

  function cartFor(key) {
    if (!/^[a-f0-9]{64}$/.test(key || '')) fail(403,'Der private Testwarenkorb fehlt.');
    return carts.get(key);
  }
  function view(key) {
    const items = (cartFor(key)?.items || []).map(({snapshotId,...line}) => line);
    return {items, totalCents:items.reduce((total,item) => total + item.totalCents,0)};
  }
  function snapshot(key,id,rev) {
    const item = cartFor(key)?.items.find(line => line.id === id && line.rev === rev);
    if (!item) fail(404,'Diese Position gehört nicht zum Testwarenkorb.');
    return item.snapshotId;
  }
  function submit(key, body, token) {
    const cart = cartFor(key) || {items:[],seen:new Map()};
    const {draftId,expectedRevision,quantity,configId,cartRevision,product} = body;
    const draft = drafts.acrylicDrafts.get(draftId,token);
    const selected = products.get(product);
    if (!selected || selected.id !== draft.productId || selected.revision !== draft.productRevision || draft.revision !== expectedRevision)
      fail(409,'Der gesicherte Produktstand hat sich geändert.');
    const {manifest} = drafts.review(draft.snapshotId);
    const price = manifest.selection.price;
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity !== price.quantity || price.unitCents * quantity !== price.totalCents)
      fail(409,'Menge und gespeicherter Preis stimmen nicht überein.');
    const offer = createHash('sha256').update(JSON.stringify([key,draft.snapshotId,configId || '',cartRevision || 0])).digest('hex');
    if (cart.seen.has(offer)) return cart.seen.get(offer);
    const previous = configId ? cart.items.findIndex(line => line.id === configId && line.rev === cartRevision) : -1;
    if (configId && (previous < 0 || ledger.revision(configId,cartRevision).draftId !== draft.id))
      fail(409,'Diese Warenkorbposition wurde inzwischen geändert.');
    const saved = readReviewPackage(drafts.downloadSnapshot(draft.snapshotId,'package'),manifest.packageSha256,NATIVE_REVIEW_SCHEMAS);
    const state = JSON.parse(saved.files.get('produkt-und-gestaltung.json')).state;
    const config = JSON.parse(saved.files.get('konfigurator-quellen.json'));
    const template = config.profile.designs.find(item => item.id === state.design.id);
    const lettering = customerTextLine(state.design.objects,template);
    const {id,rev} = ledger.assign({draftId:draft.id,draftRevision:draft.revision,snapshotId:draft.snapshotId,offerId:'offer_' + offer,productId:draft.productId});
    const line = {id,rev,product,productName:manifest.product.name,design:state.design.name || state.design.id,lettering,
      quantity,unitCents:price.unitCents,totalCents:price.totalCents,print:manifest.product.method === 'print',snapshotId:draft.snapshotId};
    if (previous < 0) cart.items.push(line);
    else cart.items[previous] = line;
    const result = {id,rev,handoff:offer,totalCents:price.totalCents};
    cart.seen.set(offer,result);
    carts.set(key,cart);
    return result;
  }
  return {view,submit,snapshot};
}
