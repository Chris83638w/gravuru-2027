import {randomUUID} from 'node:crypto';
import {MAX_CUSTOMER_PHOTO} from './customer-photo.mjs';
import {tenantOption,ensureTenantColumns,TENANT_COLUMN} from './tenant.mjs';
import {isVerifiedAccountVectorLogo,vectorLogoMetadata} from './customer-vector-logo-media.mjs';

// Ü8.2 (K7): Entwürfe im Shopify-Kundenkonto. Verallgemeinerung des
// Token-Entwurfs (acrylic-draft-store.mjs): Eigentümer ist der angemeldete
// Shopify-Kunde (Shop + Kunden-ID), nicht ein Browser-Token. Der Entwurf ist das
// Vertragsformat aus contract.mjs (serverseitig geprüft, bevor er hier landet),
// Fotos liegen als Originale (und bearbeitete Fassung) beim Entwurf. 90 Tage,
// höchstens 50 je Kunde. Ein Kunde sieht ausschließlich eigene Entwürfe.
export const CUSTOMER_DRAFT_TTL_DAYS=90;
export const CUSTOMER_DRAFT_LIMIT=50;
export const CUSTOMER_DRAFT_PHOTO_LIMIT=4;
export const CUSTOMER_DRAFT_PREVIEW_BYTES=512*1024;
export const CUSTOMER_DRAFT_BYTES_PER_CUSTOMER=256*1024*1024;
const fail=(status,message)=>{throw Object.assign(new Error(message),{status,code:'customer_draft'});};
const hidden=()=>fail(404,'Dieser Entwurf ist nicht verfügbar.');
const SHOP=/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/,CUSTOMER=/^gid:\/\/shopify\/Customer\/[1-9][0-9]{0,19}$/,ID=/^cdraft_[a-f0-9-]{36}$/,UPLOAD=/^[A-Za-z0-9_-]{1,64}$/;
const MIME={'image/jpeg':b=>b[0]===0xff&&b[1]===0xd8&&b[2]===0xff,'image/png':b=>b.subarray(0,8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])),'image/webp':b=>b.subarray(0,4).toString('latin1')==='RIFF'&&b.subarray(8,12).toString('latin1')==='WEBP'};
const isPng=MIME['image/png'];
const principalOf=p=>{if(!p||typeof p!=='object'||!SHOP.test(p.shopDomain||'')||!CUSTOMER.test(p.customerId||''))hidden();return {shop:p.shopDomain,customer:p.customerId};};
const text=(value,max,label)=>{if(typeof value!=='string'||!value.trim()||value.length>max||/[\u0000-\u001f\u007f]/.test(value))fail(422,label);return value.trim();};
export function createCustomerDraftStore({database:db,clock=Date.now,tenantId}){
  const tenant=tenantOption({tenantId});
  db.exec(`CREATE TABLE IF NOT EXISTS customer_drafts(id TEXT PRIMARY KEY,shop TEXT NOT NULL,customer_id TEXT NOT NULL,product_id TEXT NOT NULL,profile_revision TEXT NOT NULL,title TEXT NOT NULL,draft TEXT NOT NULL,photo_refs TEXT NOT NULL,preview BLOB,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,expires_at TEXT NOT NULL,${TENANT_COLUMN});
    CREATE INDEX IF NOT EXISTS customer_drafts_owner ON customer_drafts(shop,customer_id,updated_at);
    CREATE TABLE IF NOT EXISTS customer_draft_photos(draft_id TEXT NOT NULL,upload_id TEXT NOT NULL,kind TEXT NOT NULL,name TEXT NOT NULL,mime TEXT NOT NULL,original BLOB NOT NULL,edited BLOB,${TENANT_COLUMN},PRIMARY KEY(draft_id,upload_id));
    CREATE TRIGGER IF NOT EXISTS customer_draft_owner_fixed BEFORE UPDATE OF id,shop,customer_id,created_at,tenant_id ON customer_drafts BEGIN SELECT RAISE(ABORT,'Customer draft ownership is immutable'); END;`);
  ensureTenantColumns(db,['customer_drafts','customer_draft_photos']);
  const stamp=ms=>new Date(ms).toISOString();
  const transaction=fn=>{db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(error){db.exec('ROLLBACK');throw error;}};
  const purge=()=>db.prepare('DELETE FROM customer_drafts WHERE expires_at<=? AND tenant_id=?').run(stamp(clock()),tenant);
  // Fotos verwaister Entwürfe verschwinden mit ihnen (kein FK-Pragma nötig, bewusst explizit).
  const purgePhotos=()=>db.prepare('DELETE FROM customer_draft_photos WHERE tenant_id=? AND draft_id NOT IN (SELECT id FROM customer_drafts WHERE tenant_id=?)').run(tenant,tenant);
  const own=(owner,id)=>{
    const row=ID.test(id||'')&&db.prepare('SELECT * FROM customer_drafts WHERE id=? AND tenant_id=?').get(id,tenant);
    if(!row||row.shop!==owner.shop||row.customer_id!==owner.customer||row.expires_at<=stamp(clock()))hidden();
    return row;
  };
  const summary=row=>({id:row.id,title:row.title,productId:row.product_id,profileRevision:row.profile_revision,createdAt:row.created_at,updatedAt:row.updated_at,expiresAt:row.expires_at,photoCount:JSON.parse(row.photo_refs).length,previewAvailable:row.preview!==null});
  const photoRefs=(rows,draft)=>rows.map(r=>({uploadId:r.upload_id,kind:r.kind,name:r.name,mime:r.mime,edited:r.edited!==null,...(r.mime==='image/svg+xml'?{vectorLogo:vectorLogoMetadata(draft.design.objects.find(o=>o.uxUploadId===r.upload_id)?.uxVectorLogo)}:{})}));
  function checkPhotos(photos,draft){
    if(photos===undefined)return [];
    if(!Array.isArray(photos)||photos.length>CUSTOMER_DRAFT_PHOTO_LIMIT)fail(422,'Höchstens vier Fotos oder Logos je Entwurf.');
    const seen=new Set();
    return photos.map(p=>{
      if(p?.mime==='image/svg+xml'){
        const objects=draft.design?.objects?.filter(o=>o.uxUploadId===p.uploadId)||[];
        if(!UPLOAD.test(p.uploadId||'')||seen.has(p.uploadId)||p.kind!=='logo'||!isVerifiedAccountVectorLogo(p)||!objects.length||objects.some(o=>o.type!=='image'||o.uxUploadKind!=='logo'||JSON.stringify(vectorLogoMetadata(o.uxVectorLogo))!==JSON.stringify(vectorLogoMetadata(p.vectorLogo)))||typeof p.name!=='string'||p.name.length>160)fail(422,'Das Vektorlogo benötigt die bestätigte und serverseitig geprüfte Schwarzfassung.');
        seen.add(p.uploadId);
        return {uploadId:p.uploadId,kind:'logo',name:p.name.replace(/[\u0000-\u001f\u007f]/g,''),mime:p.mime,original:p.original,edited:p.edited};
      }
      if(!p||typeof p!=='object'||!UPLOAD.test(p.uploadId||'')||seen.has(p.uploadId)||!['photo','logo'].includes(p.kind)||!Buffer.isBuffer(p.original)||!p.original.length||p.original.length>MAX_CUSTOMER_PHOTO||!MIME[p.mime]?.(p.original)||
        (p.edited!==undefined&&(!Buffer.isBuffer(p.edited)||!p.edited.length||p.edited.length>MAX_CUSTOMER_PHOTO||!isPng(p.edited)))||(p.name!==undefined&&(typeof p.name!=='string'||p.name.length>160)))fail(422,'Ungültiges Foto: JPG, PNG oder WebP bis 15 MB, bearbeitete Fassung als PNG.');
      seen.add(p.uploadId);
      return {uploadId:p.uploadId,kind:p.kind,name:(p.name||'').replace(/[\u0000-\u001f\u007f]/g,'').slice(0,160),mime:p.mime,original:p.original,edited:p.edited??null};
    });
  }
  function checkPreview(preview){
    if(preview===undefined||preview===null)return null;
    if(!Buffer.isBuffer(preview)||!preview.length||preview.length>CUSTOMER_DRAFT_PREVIEW_BYTES||!isPng(preview))fail(422,'Die Entwurfsvorschau muss ein PNG bis 512 KB sein.');
    return preview;
  }
  function checkInput(input){
    if(!input||typeof input!=='object'||Array.isArray(input))fail(422,'Entwurfsdaten fehlen.');
    const productId=text(input.productId,120,'Produkt fehlt.'),profileRevision=text(input.profileRevision,160,'Produktstand fehlt.');
    if(!input.draft||typeof input.draft!=='object'||Array.isArray(input.draft))fail(422,'Entwurf fehlt.');
    const draft=JSON.stringify(input.draft);if(Buffer.byteLength(draft)>2_000_000)fail(422,'Entwurf ist zu groß.');
    return {productId,profileRevision,title:text(input.title,80,'Bitte einen Titel mit höchstens 80 Zeichen angeben.'),draft,photos:checkPhotos(input.photos,input.draft),preview:checkPreview(input.preview)};
  }
  const usage=owner=>db.prepare('SELECT count(*) AS count FROM customer_drafts WHERE shop=? AND customer_id=? AND expires_at>? AND tenant_id=?').get(owner.shop,owner.customer,stamp(clock()),tenant).count;
  const bytes=(owner,except=null)=>db.prepare('SELECT coalesce(sum(length(p.original))+sum(coalesce(length(p.edited),0)),0) AS total FROM customer_draft_photos p JOIN customer_drafts d ON d.id=p.draft_id AND d.tenant_id=p.tenant_id WHERE d.tenant_id=? AND d.shop=? AND d.customer_id=? AND d.id IS NOT ?').get(tenant,owner.shop,owner.customer,except).total;
  function storePhotos(id,photos,owner){
    const incoming=photos.reduce((sum,p)=>sum+p.original.length+(p.edited?.length||0),0);
    if(bytes(owner,id)+incoming>CUSTOMER_DRAFT_BYTES_PER_CUSTOMER)fail(413,'Die gespeicherten Fotos deines Kundenkontos sind zu umfangreich. Bitte ältere Entwürfe löschen.');
    db.prepare('DELETE FROM customer_draft_photos WHERE draft_id=? AND tenant_id=?').run(id,tenant);
    for(const p of photos)db.prepare('INSERT INTO customer_draft_photos(draft_id,upload_id,kind,name,mime,original,edited,tenant_id) VALUES(?,?,?,?,?,?,?,?)').run(id,p.uploadId,p.kind,p.name,p.mime,p.original,p.edited,tenant);
  }
  return {
    limit:CUSTOMER_DRAFT_LIMIT,ttlDays:CUSTOMER_DRAFT_TTL_DAYS,
    purgeExpired(){return transaction(()=>{const removed=purge().changes;purgePhotos();return removed;});},
    list(principal){
      const owner=principalOf(principal);purge();
      return db.prepare('SELECT * FROM customer_drafts WHERE shop=? AND customer_id=? AND tenant_id=? ORDER BY updated_at DESC,rowid DESC').all(owner.shop,owner.customer,tenant).map(summary);
    },
    get(principal,id){
      const owner=principalOf(principal),row=own(owner,id);
      const draft=JSON.parse(row.draft);
      return {...summary(row),draft,photos:photoRefs(db.prepare('SELECT upload_id,kind,name,mime,edited FROM customer_draft_photos WHERE draft_id=? AND tenant_id=? ORDER BY rowid').all(id,tenant),draft)};
    },
    preview(principal,id){const row=own(principalOf(principal),id);if(row.preview===null)hidden();return Buffer.from(row.preview);},
    photo(principal,id,uploadId,variant='original'){
      own(principalOf(principal),id);
      const row=UPLOAD.test(uploadId||'')&&db.prepare('SELECT * FROM customer_draft_photos WHERE draft_id=? AND upload_id=? AND tenant_id=?').get(id,uploadId,tenant);
      if(!row||!['original','edited'].includes(variant)||variant==='edited'&&row.edited===null)hidden();
      return variant==='edited'?{mime:row.mime==='image/svg+xml'?'image/svg+xml':'image/png',bytes:Buffer.from(row.edited)}:{mime:row.mime,bytes:Buffer.from(row.original)};
    },
    create(principal,input){
      const owner=principalOf(principal),data=checkInput(input);
      return transaction(()=>{
        purge();
        if(usage(owner)>=CUSTOMER_DRAFT_LIMIT)fail(409,'Höchstens '+CUSTOMER_DRAFT_LIMIT+' Entwürfe je Kundenkonto. Bitte zuerst einen älteren Entwurf löschen.');
        const id='cdraft_'+randomUUID(),now=clock(),at=stamp(now),expires=stamp(now+CUSTOMER_DRAFT_TTL_DAYS*86_400_000);
        db.prepare('INSERT INTO customer_drafts(id,shop,customer_id,product_id,profile_revision,title,draft,photo_refs,preview,created_at,updated_at,expires_at,tenant_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,owner.shop,owner.customer,data.productId,data.profileRevision,data.title,data.draft,JSON.stringify(data.photos.map(p=>p.uploadId)),data.preview,at,at,expires,tenant);
        storePhotos(id,data.photos,owner);
        return summary(own(owner,id));
      });
    },
    // Überschreibt einen eigenen Entwurf; Produkt und Produktstand bleiben fest, die Frist beginnt neu.
    save(principal,id,input){
      const owner=principalOf(principal),data=checkInput(input);
      return transaction(()=>{
        const row=own(owner,id);
        if(row.product_id!==data.productId||row.profile_revision!==data.profileRevision)fail(409,'Dieser Entwurf gehört zu einem anderen Produkt oder Produktstand. Bitte als neuen Entwurf speichern.');
        const now=clock();
        db.prepare('UPDATE customer_drafts SET title=?,draft=?,photo_refs=?,preview=?,updated_at=?,expires_at=? WHERE id=? AND tenant_id=?').run(data.title,data.draft,JSON.stringify(data.photos.map(p=>p.uploadId)),data.preview,stamp(now),stamp(now+CUSTOMER_DRAFT_TTL_DAYS*86_400_000),id,tenant);
        storePhotos(id,data.photos,owner);
        return summary(own(owner,id));
      });
    },
    remove(principal,id){
      const owner=principalOf(principal);
      return transaction(()=>{own(owner,id);db.prepare('DELETE FROM customer_draft_photos WHERE draft_id=? AND tenant_id=?').run(id,tenant);db.prepare('DELETE FROM customer_drafts WHERE id=? AND tenant_id=?').run(id,tenant);return {id,deleted:true};});
    },
  };
}
