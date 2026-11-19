import {createHash} from 'node:crypto';
import {readReviewPackage} from '../../app/workshop/review-package.mjs';
import {NATIVE_REVIEW_SCHEMAS} from '../../app/workshop/native-review-schema.mjs';
import {customerTextLine} from '../../app/configurator/variant-m/text-summary.mjs';

const digest = value => createHash('sha256').update(value).digest('hex');
const fail = (status,message) => { throw Object.assign(Error(message),{status}); };

export function createReviewCart(workshop, products, db) {
  db.exec(`CREATE TABLE IF NOT EXISTS beta_cart_lines (
    cart TEXT NOT NULL, id TEXT NOT NULL, revision INTEGER NOT NULL, snapshot TEXT NOT NULL,
    line TEXT NOT NULL, png BLOB NOT NULL, PRIMARY KEY (cart,id,revision)
  ); CREATE TABLE IF NOT EXISTS beta_cart_receipts (offer TEXT PRIMARY KEY, result TEXT NOT NULL)`);
  const drafts = workshop.customerDrafts;
  function cartId(key) {
    if (!/^[a-f0-9]{64}$/.test(key || '')) fail(403,'Der private Testwarenkorb fehlt.');
    return digest(key);
  }
  function view(key) {
    const items = db.prepare('SELECT line FROM beta_cart_lines WHERE cart=? ORDER BY rowid').all(cartId(key)).map(row=>JSON.parse(row.line));
    return {items,totalCents:items.reduce((sum,item)=>sum+item.totalCents,0)};
  }
  function snapshot(key,id,rev) {
    const row = db.prepare('SELECT snapshot FROM beta_cart_lines WHERE cart=? AND id=? AND revision=?').get(cartId(key),id,rev);
    if (!row) fail(404,'Diese Position gehört nicht zum Testwarenkorb.');
    return row.snapshot;
  }
  function preview(key,id,rev) {
    const row = db.prepare('SELECT png FROM beta_cart_lines WHERE cart=? AND id=? AND revision=?').get(cartId(key),id,rev);
    if (!row) fail(404,'Die persönliche Vorschau ist nicht verfügbar.');
    return Buffer.from(row.png);
  }
  function remove(key,id,rev) {
    db.prepare('DELETE FROM beta_cart_lines WHERE cart=? AND id=? AND revision=?').run(cartId(key),id,rev);
    return view(key);
  }
  function submit(key, body, token) {
    const cart = cartId(key);
    const {draftId,expectedRevision,quantity,product} = body;
    if (body.configId || body.cartRevision || body.cartLineId) fail(422,'Bitte die neue Gestaltung beim Produkt beginnen.');
    const draft = drafts.acrylicDrafts.get(draftId,token);
    const selected = products.get(product);
    if (!selected || selected.id !== draft.productId || selected.revision !== draft.productRevision || draft.revision !== expectedRevision)
      fail(409,'Der gesicherte Produktstand hat sich geändert.');
    const {manifest} = drafts.review(draft.snapshotId);
    const {price,options,labels} = manifest.selection;
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity !== price.quantity || price.unitCents * quantity !== price.totalCents)
      fail(409,'Menge und gespeicherter Preis stimmen nicht überein.');
    const offer = digest(JSON.stringify([cart,draft.snapshotId]));
    db.exec('BEGIN IMMEDIATE');
    try {
      const receipt = db.prepare('SELECT result FROM beta_cart_receipts WHERE offer=?').get(offer);
      if (receipt) {
        db.exec('COMMIT');
        return JSON.parse(receipt.result);
      }
      const saved = readReviewPackage(drafts.downloadSnapshot(draft.snapshotId,'package'),manifest.packageSha256,NATIVE_REVIEW_SCHEMAS);
      const image = saved.files.get('gestaltung-kundenansicht.png') || saved.files.get('gestaltung-referenz.png');
      if (!image || image.length > 6*1024*1024 || !image.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))
        fail(422,'Im gesicherten Entwurf fehlt die persönliche Vorschau.');
      const {state} = JSON.parse(saved.files.get('produkt-und-gestaltung.json'));
      const config = JSON.parse(saved.files.get('konfigurator-quellen.json'));
      const template = config.profile.designs.find(item => item.id === state.design.id);
      const lettering = customerTextLine(state.design.objects,template);
      const {id,rev} = drafts.cartConfigurations.assign({draftId:draft.id,draftRevision:draft.revision,snapshotId:draft.snapshotId,offerId:'offer_' + offer,productId:draft.productId});
      const line = {id,rev,product,productName:manifest.product.name,design:state.design.name || state.design.id,lettering,
        options:labels,variant:JSON.stringify([product,Object.entries(options).sort()]),quantity,unitCents:price.unitCents,totalCents:price.totalCents,
        print:manifest.product.method === 'print',imageSha256:digest(image)};
      db.prepare('INSERT INTO beta_cart_lines(cart,id,revision,snapshot,line,png) VALUES(?,?,?,?,?,?)')
        .run(cart,id,rev,draft.snapshotId,JSON.stringify(line),image);
      const result = {id,rev,handoff:offer,totalCents:price.totalCents};
      db.prepare('INSERT INTO beta_cart_receipts VALUES(?,?)').run(offer,JSON.stringify(result));
      db.exec('COMMIT');
      return result;
    } catch (error) { db.exec('ROLLBACK'); throw error; }
  }
  return {view,submit,snapshot,preview,remove};
}
