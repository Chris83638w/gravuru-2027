// Deterministic patch builder for the exact pinned upstream file. It does not
// write to any application; tests and a later reviewed integration call it explicitly.
import {createHash} from 'node:crypto';
export const UPSTREAM_ACRYLIC_DRAFT_SHA256='ebd846e8faff8e3b1620cbf99bcd3272ac8450005a39f313f4e5d5e83d9bd938';
export function patchAcrylicDraftStore(source){
  const sha=createHash('sha256').update(source).digest('hex');
  if(sha!==UPSTREAM_ACRYLIC_DRAFT_SHA256)throw Error('Unrecognized acrylic-draft-store source; review the new upstream before patching.');
  const once=(from,to)=>{if(source.split(from).length!==2)throw Error('Patch anchor is missing or ambiguous.');source=source.replace(from,to);};
  once("import {isNativeReviewSchema}","import {createNativePhotoReopeningStore} from './photo-persistence/server/native-photo-reopening-store.mjs';\nimport {isNativeReviewSchema}");
  once("  const transaction = fn => {","  const photoReopening = createNativePhotoReopeningStore({database:db,tenantId:tenant});\n  const transaction = fn => {");
  once("    create(bundle) {\n      const m = validate(bundle);","    photoReopeningCapability: () => photoReopening.capability(),\n    preparePhotoReopening: value => photoReopening.prepare(value),\n    reopening(id, token, version) {\n      const row = auth(id, token), revision = version ?? row.revision;\n      if (!Number.isSafeInteger(revision) || revision < 1 || revision > row.revision) fail(404, 'Entwurfsrevision nicht vorhanden.');\n      return photoReopening.read(id, revision);\n    },\n    create(bundle, reopeningTicket) {\n      const m = validate(bundle);\n      if (reopeningTicket !== undefined) photoReopening.assertPrepared(bundle, reopeningTicket);");
  once("        revision(id, 1, m.id, at);","        revision(id, 1, m.id, at);\n        if (reopeningTicket !== undefined) photoReopening.capture({draftId:id,revision:1,bundle,ticket:reopeningTicket});");
  once("    save(id, token, expectedRevision, bundle) {","    save(id, token, expectedRevision, bundle, reopeningTicket) {\n      if (reopeningTicket !== undefined) photoReopening.assertPrepared(bundle, reopeningTicket);");
  once("        const row = auth(id, token);","        const row = auth(id, token);\n        if (reopeningTicket === undefined && photoReopening.has(id, row.revision)) fail(422, 'Die vorhandene Fotowiederöffnung muss in jeder neuen Revision erhalten bleiben.');");
  once("        return publicRow(auth(id, token));","        if (reopeningTicket !== undefined) photoReopening.capture({draftId:id,revision:version,bundle,ticket:reopeningTicket});\n        return publicRow(auth(id, token));");
  return source;
}
