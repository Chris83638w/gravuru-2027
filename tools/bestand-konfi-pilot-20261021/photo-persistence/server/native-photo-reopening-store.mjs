import {createHash} from 'node:crypto';
import {validatePhotoReopening,PHOTO_REOPENING_SCHEMA,PHOTO_REOPENING_LIMITS} from '../photo-reopening.mjs';
import {snapshotNativeInput} from './native-input-binding.mjs';

export const NATIVE_PHOTO_REOPENING_CAPABILITY=Object.freeze({schema:'gravuru-photo-persistence-capability/v1',packetSchema:PHOTO_REOPENING_SCHEMA,
  contractVersion:1,atomicWithNativeDraft:true,privateDraftTokenRequired:true,expectedRevisionRequired:true,active:false});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=(status,code,message)=>{throw Object.assign(Error(message),{status,code});};
const copy=value=>JSON.parse(JSON.stringify(value));
const canonical=v=>Array.isArray(v)?'['+v.map(canonical).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}':JSON.stringify(v);
function bundleIdentity(bundle){
  const m=bundle?.manifest;
  if(!['gravuru-native-review/v1','gravuru-acrylic-review/v1'].includes(m?.schema)||typeof m.id!=='string'||
    typeof m.product?.id!=='string'||!Number.isSafeInteger(m.product.revision)||typeof m.source?.designId!=='string'||! /^[a-f0-9]{64}$/.test(m.source.nativeInputSha256||'')||
    !Buffer.isBuffer(bundle.package)||sha(bundle.package)!==m.packageSha256)fail(422,'photo_bundle','Serverseitiger nativer Prüfstand fehlt.');
  return {snapshotId:m.id,packageSha256:m.packageSha256,productId:m.product.id,productRevision:m.product.revision,designId:m.source.designId,nativeInputSha256:m.source.nativeInputSha256};
}
function sameIdentity(a,b){return ['snapshotId','packageSha256','productId','productRevision','designId','nativeInputSha256'].every(k=>a[k]===b[k]);}

/** One extension table in the EXISTING native-draft DatabaseSync connection.
 *  No connection, filesystem directory, HTTP route, service or credential is created.
 *  preparePhoto is the existing production decoder, required explicitly per preparation.
 *  The capture method MUST run in the outer acrylic-draft-store transaction.
 */
export function createNativePhotoReopeningStore({database:db,tenantId}){
  if(!db?.prepare||!db?.exec||typeof tenantId!=='string'||!/^[a-z0-9][a-z0-9-]{0,39}$/.test(tenantId))throw TypeError('Existing database and explicit tenant required.');
  db.exec(`CREATE TABLE IF NOT EXISTS native_photo_reopening (
    tenant_id TEXT NOT NULL, draft_id TEXT NOT NULL, revision INTEGER NOT NULL CHECK(revision>=1),
    snapshot_id TEXT NOT NULL, packet_schema TEXT NOT NULL, packet_sha256 TEXT NOT NULL,
    package_sha256 TEXT NOT NULL, packet_json TEXT NOT NULL CHECK(json_valid(packet_json)),
    input_json TEXT NOT NULL CHECK(json_valid(input_json)), created_at TEXT NOT NULL,
    PRIMARY KEY(tenant_id,draft_id,revision), UNIQUE(tenant_id,snapshot_id));
    CREATE TRIGGER IF NOT EXISTS native_photo_reopening_immutable BEFORE UPDATE ON native_photo_reopening
      BEGIN SELECT RAISE(ABORT,'Photo reopening revisions are immutable'); END;
    CREATE TRIGGER IF NOT EXISTS native_photo_reopening_no_delete BEFORE DELETE ON native_photo_reopening
      BEGIN SELECT RAISE(ABORT,'Photo reopening requires explicit retention'); END;`);
  const prepared=new WeakMap();
  function ticketFor(bundle,ticket){
    const record=ticket&&prepared.get(ticket);
    if(!record||!sameIdentity(record.identity,bundleIdentity(bundle)))fail(422,'photo_ticket','Kein passendes intern vorbereitetes Fotopaket.');
    return record;
  }
  return {
    // Wiring this helper alone is not evidence that HTTP/ownership checks are deployed.
    capability:()=>({...NATIVE_PHOTO_REOPENING_CAPABILITY}),
    async prepare({packet,model,input,bundle,preparePhoto}){
      if(typeof preparePhoto!=='function')fail(503,'photo_decoder_required','Der vorhandene serverseitige Bilddecoder ist erforderlich.');
      const identity=bundleIdentity(bundle);
      // Snapshot first; no caller mutation can exchange input, package or product during decoding.
      const packetJSON=JSON.stringify(packet),inputJSON=JSON.stringify(input);
      if(typeof packetJSON!=='string'||Buffer.byteLength(packetJSON)>PHOTO_REOPENING_LIMITS.maxJsonBytes||
        typeof inputJSON!=='string'||Buffer.byteLength(inputJSON)>100*1024*1024)fail(413,'photo_persistence_size','Privates Fotopaket überschreitet die Grenze.');
      const savedPacket=JSON.parse(packetJSON),savedInput=JSON.parse(inputJSON),savedModel=copy(model);
      if(!savedPacket.nativeInputSha256)fail(422,'photo_native_binding','Serverpersistenz benötigt die Bindung an den nativen Input.');
      if(savedPacket.nativeInputSha256!==identity.nativeInputSha256||snapshotNativeInput(savedInput).sha256!==identity.nativeInputSha256)
        fail(409,'photo_review_input_mismatch','Serverprüfstand und Fotowiederöffnung stammen aus unterschiedlichen Eingaben.');
      const checked=await validatePhotoReopening({packet:savedPacket,model:savedModel,nativeInput:savedInput});
      const b=checked.binding;
      if(identity.productId!==b.productId||identity.productRevision!==b.productRevision||identity.designId!==b.designId)fail(409,'photo_bundle_binding','Fotopaket und Prüfstand gehören nicht zusammen.');
      // No privilege or fixed template change is accepted through candidate metadata.
      if(checked.gates.blockers.some(b=>b.code!=='server_photo_persistence_not_deployed'))fail(422,'photo_candidate_rights','Vorlagenrechte oder feste Felder unterscheiden sich.');
      const dimensions=new Map();
      for(const [id,blob] of checked.blobs){
        const original=Buffer.from(await blob.arrayBuffer()),decoded=await preparePhoto(original.toString('base64'));
        if(!Buffer.isBuffer(decoded?.original)||!decoded.original.equals(original)||
          ![decoded.width,decoded.height].every(v=>Number.isSafeInteger(v)&&v>0))fail(422,'photo_decoder_result','Bilddecoder bestätigt nicht dieselben Originalbytes und Abmessungen.');
        dimensions.set(id,{width:decoded.width,height:decoded.height});
      }
      for(const media of checked.media)if(media.metadata.width!==undefined){
        const size=dimensions.get(media.edited?.blobId??media.original.blobId);
        if(media.metadata.width!==size.width||media.metadata.height!==size.height)fail(422,'photo_dimensions','Bildabmessungen passen nicht zu den dekodierten Bytes.');
      }
      const ticket=Object.freeze({kind:'native-photo-reopening-prepared/v1'});
      prepared.set(ticket,{identity,packetJSON,inputJSON,packetSha256:checked.packetSha256});
      return ticket;
    },
    assertPrepared(bundle,ticket){ticketFor(bundle,ticket);},
    has(draftId,revision){return !!db.prepare('SELECT 1 FROM native_photo_reopening WHERE tenant_id=? AND draft_id=? AND revision=?').get(tenantId,draftId,revision);},
    capture({draftId,revision,bundle,ticket}){
      if(db.isTransaction!==true)fail(500,'photo_transaction_required','Fotopaket muss innerhalb derselben Entwurfstransaktion gespeichert werden.');
      const entry=ticketFor(bundle,ticket);
      const row=db.prepare(`SELECT d.product_id,d.product_revision,d.design_id,r.snapshot_id
        FROM acrylic_customer_drafts d JOIN acrylic_customer_revisions r ON r.draft_id=d.id AND r.tenant_id=d.tenant_id
        WHERE d.id=? AND d.tenant_id=? AND r.revision=?`).get(draftId,tenantId,revision);
      if(!row||row.snapshot_id!==entry.identity.snapshotId||row.product_id!==entry.identity.productId||row.product_revision!==entry.identity.productRevision||row.design_id!==entry.identity.designId)
        fail(409,'photo_revision_binding','Private Entwurfsrevision und Fotopaket gehören nicht zusammen.');
      // Verify the native archive was captured on this SAME connection, in this transaction.
      const review=db.prepare('SELECT manifest,package FROM form_review_snapshots WHERE id=? AND tenant_id=?').get(row.snapshot_id,tenantId);
      if(!review||JSON.parse(review.manifest).packageSha256!==entry.identity.packageSha256||JSON.parse(review.manifest).source?.nativeInputSha256!==entry.identity.nativeInputSha256||sha(Buffer.from(review.package))!==entry.identity.packageSha256)
        fail(409,'photo_snapshot_missing','Der native Prüfstand fehlt in derselben Datenbanktransaktion.');
      db.prepare(`INSERT INTO native_photo_reopening(tenant_id,draft_id,revision,snapshot_id,packet_schema,packet_sha256,package_sha256,packet_json,input_json,created_at)
        VALUES(?,?,?,?,?,?,?,?,?,?)`).run(tenantId,draftId,revision,row.snapshot_id,PHOTO_REOPENING_SCHEMA,entry.packetSha256,entry.identity.packageSha256,entry.packetJSON,entry.inputJSON,new Date().toISOString());
    },
    // Internal read only. Public access MUST go through patched draftStore.reopening(id,token,...).
    read(draftId,revision){
      const row=db.prepare(`SELECT p.*,d.product_id,d.product_revision,d.design_id,r.snapshot_id AS current_snapshot
        FROM native_photo_reopening p JOIN acrylic_customer_drafts d ON d.id=p.draft_id AND d.tenant_id=p.tenant_id
        JOIN acrylic_customer_revisions r ON r.draft_id=p.draft_id AND r.tenant_id=p.tenant_id AND r.revision=p.revision
        WHERE p.tenant_id=? AND p.draft_id=? AND p.revision=?`).get(tenantId,draftId,revision);
      if(!row)fail(404,'photo_reopening_missing','Für diese private Entwurfsrevision gibt es keine Fotowiederöffnung.');
      if(row.current_snapshot!==row.snapshot_id)fail(409,'photo_revision_binding','Fotopaket gehört nicht zur Entwurfsrevision.');
      const packet=JSON.parse(row.packet_json),input=JSON.parse(row.input_json),binding=packet.binding;
      const {integrity,...content}=packet;
      if(packet.schema!==PHOTO_REOPENING_SCHEMA||packet.integrity?.sha256!==row.packet_sha256||
        sha(Buffer.from(canonical(content)))!==row.packet_sha256||sha(Buffer.from(canonical(input)))!==packet.nativeInputSha256||
        binding?.productId!==row.product_id||binding.productRevision!==row.product_revision||binding.designId!==row.design_id)fail(500,'photo_store_corrupt','Gespeicherte Fotobindung ist beschädigt.');
      return {schema:'gravuru-private-photo-reopening-response/v1',draftId,revision,snapshotId:row.snapshot_id,packet,input,
        persistedCapability:{...NATIVE_PHOTO_REOPENING_CAPABILITY,active:false,storedAtomically:true},
        // Persisted != publicly deployable/production-authorized.
        nativeSendAllowed:false,stateApplicationAllowed:false,checkoutAllowed:false,productionAllowed:false};
    }
  };
}
