// K8 (Ü9.1): „Bearbeiten“ aus dem Warenkorb. Lädt genau die Konfigurations-Revision aus dem
// unveränderlichen Prüfstand (kein neues Datenmodell) als Entwurfsdokument für den Editor.
// Zugriff nur mit dem privaten Entwurfstoken; die Konfigurations-ID allein öffnet nichts.
import {readReviewPackage} from './review-package.mjs';
import {NATIVE_REVIEW_SCHEMAS} from './native-review-schema.mjs';
import {CART_CONFIG_ID} from './cart-configuration.mjs';
import {DRAFT_SCHEMA} from '../configurator/variant-m/contract.mjs';

const fail = (status, code, message) => {throw Object.assign(new Error(message), {status, code});};
const IMAGE_TYPES = {jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp'};

function open({drafts, configId, rev, draftToken}) {
  if (typeof configId !== 'string' || !CART_CONFIG_ID.test(configId) || !Number.isSafeInteger(rev) || rev < 1) fail(404, 'cart_configuration', 'Diese Konfigurations-Revision ist nicht bekannt.');
  const revision = drafts.cartConfigurations.revision(configId, rev);
  if (!revision.draftId.startsWith('adraft_')) fail(409, 'cart_edit_unsupported', 'Entwürfe von Formprodukten werden aus dem Warenkorb noch nicht geladen.');
  const draft = drafts.acrylicDrafts.get(revision.draftId, draftToken);
  const {manifest} = drafts.review(revision.snapshotId);
  const {files} = readReviewPackage(drafts.downloadSnapshot(revision.snapshotId, 'package'), manifest.packageSha256, NATIVE_REVIEW_SCHEMAS);
  return {revision, draft, manifest, files};
}

export function loadCartRevision({drafts, repository, configId, rev, draftToken}) {
  const {revision, draft, manifest, files} = open({drafts, configId, rev, draftToken});
  const input = JSON.parse(files.get('produkt-und-gestaltung.json')), sources = JSON.parse(files.get('konfigurator-quellen.json'));
  const profile = sources.profile, state = input.state;
  if (!profile?.id || !Array.isArray(state?.design?.objects)) fail(409, 'cart_edit_unsupported', 'Dieser Prüfstand enthält keine ladbare Gestaltung.');
  const latest = drafts.cartConfigurations.latest(configId);
  const current = repository.get(draft.productId), hints = [];
  if (current.status === 'archived') hints.push('Dieses Produkt ist nicht mehr verfügbar. Die Gestaltung kann nicht bearbeitet werden.');
  else if (current.revision !== draft.productRevision) hints.push('Das Produkt wurde inzwischen geändert. Die gespeicherte Gestaltung passt nicht mehr zum aktuellen Stand; bitte neu gestalten.');
  if (latest.rev !== rev) hints.push('Im Warenkorb liegt bereits Revision ' + latest.rev + ' dieser Gestaltung. Geladen wurde Revision ' + rev + '.');
  return {
    configuration: {id: configId, rev, latestRev: latest.rev, cartLineId: revision.lineId},
    draft: {id: draft.id, revision: draft.revision, productId: draft.productId, productRevision: draft.productRevision, designId: draft.designId},
    quantity: state.price?.quantity ?? manifest.selection?.price?.quantity ?? 1,
    document: {schema: DRAFT_SCHEMA, profileId: profile.id, profileRevision: profile.revision, productId: profile.binding?.productId ?? null,
      design: state.design, options: state.options},
    photos: (manifest.photos || []).map(p => ({uploadId: p.uploadId, width: p.width, height: p.height,
      ...(p.edited ? {edited: {width: p.edited.width, height: p.edited.height}} : {})})),
    hints,
  };
}

// Originalbild (oder bearbeitete Fassung) einer Revision für die Wiederherstellung im Editor.
export function loadCartRevisionPhoto({drafts, configId, rev, draftToken, uploadId, edited = false}) {
  const {manifest, files} = open({drafts, configId, rev, draftToken});
  const photo = (manifest.photos || []).find(p => p.uploadId === uploadId);
  const entry = edited ? photo?.edited : photo;
  if (!photo || !entry?.path) fail(404, 'cart_edit_photo', 'Dieses Bild gehört nicht zur Revision.');
  const bytes = files.get(entry.path), extension = entry.path.split('.').pop();
  if (!bytes || !IMAGE_TYPES[extension]) fail(404, 'cart_edit_photo', 'Dieses Bild gehört nicht zur Revision.');
  return {bytes: Buffer.from(bytes), contentType: IMAGE_TYPES[extension], width: entry.width, height: entry.height};
}
