// K8 (Ü9.1): „Bearbeiten“ aus dem Warenkorb. Lädt genau die Konfigurations-Revision aus dem
// unveränderlichen Prüfstand (kein neues Datenmodell) als Entwurfsdokument für den Editor.
// Zugriff nur mit dem privaten Entwurfstoken; die Konfigurations-ID allein öffnet nichts.
import {readReviewPackage} from './review-package.mjs';
import {NATIVE_REVIEW_SCHEMAS} from './native-review-schema.mjs';
import {CART_CONFIG_ID} from './cart-configuration.mjs';
import {DRAFT_SCHEMA} from '../configurator/variant-m/contract.mjs';
import {editorUi} from '../configurator/variant-m/toolbar-placement-model.mjs';

const fail = (status, code, message) => {throw Object.assign(new Error(message), {status, code});};
const IMAGE_TYPES = {jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp'};

function open({drafts, configId, rev, draftToken}) {
  if (typeof configId !== 'string' || !CART_CONFIG_ID.test(configId) || !Number.isSafeInteger(rev) || rev < 1) fail(404, 'cart_configuration', 'Diese Konfigurations-Revision ist nicht bekannt.');
  const revision = drafts.cartConfigurations.revision(configId, rev);
  const native = revision.draftId.startsWith('adraft_');
  const draft = native ? drafts.acrylicDrafts.get(revision.draftId, draftToken) : drafts.get(revision.draftId, draftToken);
  const {manifest} = drafts.review(revision.snapshotId);
  const saved = readReviewPackage(drafts.downloadSnapshot(revision.snapshotId, 'package'), manifest.packageSha256, native ? NATIVE_REVIEW_SCHEMAS : 'gravuru-form-review/v1');
  if (manifest.id !== revision.snapshotId || saved.manifest.id !== manifest.id ||
      JSON.stringify(saved.manifest) !== JSON.stringify(Object.fromEntries(Object.entries(manifest).filter(([k])=>k!=='packageSha256'))) ||
      manifest.product?.id !== draft.productId || manifest.product?.revision !== draft.productRevision || manifest.source?.designId !== draft.designId ||
      (!native && (manifest.source?.draftId !== draft.id || manifest.source?.draftRevision !== revision.draftRevision))) {
    fail(404, 'cart_private', 'Dieser Prüfstand gehört nicht zur zugänglichen Konfigurations-Revision.');
  }
  return {revision, draft, manifest, files:saved.files, native};
}

export function loadCartRevision({drafts, repository, configId, rev, draftToken}) {
  const {revision, draft, manifest, files, native} = open({drafts, configId, rev, draftToken});
  const input = JSON.parse(files.get('produkt-und-gestaltung.json'));
  const profile = native ? JSON.parse(files.get('konfigurator-quellen.json')).profile : null, state = input.state;
  if (native ? !profile?.id || !Array.isArray(state?.design?.objects) :
      input.schema !== 'gravuru-form-review-input/v1' || !input.product || !Array.isArray(input.customer?.fields) || input.designId !== draft.designId) fail(409, 'cart_edit_unsupported', 'Dieser Prüfstand enthält keine ladbare Gestaltung.');
  const latest = drafts.cartConfigurations.latest(configId);
  const current = repository.get(draft.productId), hints = [];
  if (current.status === 'archived') hints.push('Dieses Produkt ist nicht mehr verfügbar. Die Gestaltung kann nicht bearbeitet werden.');
  else if (current.revision !== draft.productRevision) hints.push('Das Produkt wurde inzwischen geändert. Die gespeicherte Gestaltung passt nicht mehr zum aktuellen Stand; bitte neu gestalten.');
  if (latest.rev !== rev) hints.push('Im Warenkorb liegt bereits Revision ' + latest.rev + ' dieser Gestaltung. Geladen wurde Revision ' + rev + '.');
  const quantity=native ? state?.price?.quantity ?? manifest.selection?.price?.quantity ?? 1 :
    drafts.orderIntake.offerSummary({offerId:revision.offerId,snapshotId:revision.snapshotId,productId:draft.productId,productRevision:draft.productRevision}).quantity;
  if(!Number.isSafeInteger(quantity)||quantity<1||quantity>99)fail(409,'cart_edit_unsupported','Die gespeicherte Bestellmenge ist nicht bestätigt.');
  const ui=native?editorUi(state.ui):undefined;
  return {
    editorKind:native ? 'native' : 'form',
    configuration: {id: configId, rev, latestRev: latest.rev, cartLineId: revision.lineId},
    draft: {id: draft.id, revision: draft.revision, productId: draft.productId, productRevision: draft.productRevision, designId: draft.designId},
    quantity,
    ...(native ? {document: {schema: DRAFT_SCHEMA, profileId: profile.id, profileRevision: profile.revision, productId: profile.binding?.productId ?? null,
      design: state.design, options: state.options,...(ui?{ui}:{})}} : {product:input.product,customer:input.customer,designId:input.designId,profiles:input.profiles}),
    photos: (manifest.photos || []).map(p => native ? ({uploadId: p.uploadId, width: p.width, height: p.height,
      ...(p.edited ? {edited: {width: p.edited.width, height: p.edited.height}} : {})}) :
      ({uploadId:p.fieldId,fieldId:p.fieldId,mediaId:p.mediaId ?? input.customer.fields.find(f=>f.id===p.fieldId)?.mediaId,
        width:p.width,height:p.height,crop:p.crop,tone:p.tone,hidden:input.customer.fields.find(f=>f.id===p.fieldId)?.deleted===true})),
    hints,
  };
}

// Originalbild (oder bearbeitete Fassung) einer Revision für die Wiederherstellung im Editor.
export function loadCartRevisionPhoto({drafts, configId, rev, draftToken, uploadId, edited = false}) {
  const {manifest, files, native} = open({drafts, configId, rev, draftToken});
  const matches = (manifest.photos || []).filter(p => (native ? p.uploadId : p.fieldId) === uploadId);
  const photo = matches.length === 1 ? matches[0] : null;
  const entry = edited ? photo?.edited : photo;
  if (!photo || !entry?.path) fail(404, 'cart_edit_photo', 'Dieses Bild gehört nicht zur Revision.');
  const bytes = files.get(entry.path), extension = entry.path.split('.').pop();
  if (!bytes || !IMAGE_TYPES[extension]) fail(404, 'cart_edit_photo', 'Dieses Bild gehört nicht zur Revision.');
  return {bytes: Buffer.from(bytes), contentType: IMAGE_TYPES[extension], width: entry.width, height: entry.height};
}
