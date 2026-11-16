import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {designReviewMaterial, designReviewMaterialMatches, designReviewCategory, designReviewApprovalKey, resolveDesignReviewTarget, validatedDesignReviewTargets, indexDesignReviewProducts} from './design-review-targets.mjs';
import {nativeDesignReviewFingerprint} from './design-review-approvals.mjs';
import {createDesignReviewFingerprintCache} from './design-review-fingerprint-cache.mjs';

// Catalogue size keys include the material/family. They survive a repeat import
// even if a private installation assigns a different product database ID.
export const slateReviewApprovalKey = (id, sizeKey) => JSON.stringify(['slate', id, sizeKey || 'unprepared']);
export const reviewSizeLabel = mm => Array.isArray(mm) ? mm.map(n => Number((n / 10).toFixed(2))).join(' × ') + ' cm' : 'Format offen';

export function slateReviewApprovalTargets(pack, imported) {
  const products = indexDesignReviewProducts(imported);
  return pack.originals.flatMap(row => {
    const category = designReviewCategory(row);
    return (row.targets?.length ? row.targets : [{mm: row.sourcePlateMm}]).map(target => {
      const resolved = resolveDesignReviewTarget(row, target, imported, products), material = designReviewMaterial(row, target);
      return {key: designReviewApprovalKey(row, target.sizeKey, target), id: row.id, categoryKey: category.key, categoryLabel: category.label,
        material: material.label, materialKey: material.key, materialKind: material.kind, format: reviewSizeLabel(target.mm), sizeKey: target.sizeKey || null, mm: target.mm,
        familyId: target.familyId || null, familyLabel: target.familyLabel || null,
        productId: resolved?.productId || null, productKey: resolved?.productKey || null, designId: resolved?.designId || target.nativeDesignId || 'katalog-' + row.id,
        reason: target.reason || row.reason || row.error || 'Konfi-Aufbereitung noch offen.'};
    });
  });
}

// Fingerprint actual deployed renderer sources once, not hundreds of rendered
// SVGs on every gallery request. A renderer change requires a fresh visual OK.
export function rendererSignature() {
  const seen = new Set(), files = [];
  function visit(file) {
    if (seen.has(file)) return;
    seen.add(file);
    const bytes = fs.readFileSync(file), source = bytes.toString('utf8');
    files.push([path.relative(fileURLToPath(new URL('../../', import.meta.url)), file).replaceAll('\\', '/'), bytes]);
    if (!file.endsWith('.mjs') && !file.endsWith('.js')) return;
    for (const match of source.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g)) {
      const next = path.resolve(path.dirname(file), match[1]);
      if (fs.existsSync(next) && fs.statSync(next).isFile()) visit(next);
    }
  }
  visit(fileURLToPath(new URL('../../app/workshop/product-preview.mjs', import.meta.url)));
  // The HTTP adapter embeds the actual material/photo resources before drawing.
  const adapter = fileURLToPath(new URL('../../app/workshop/http.mjs', import.meta.url));
  files.push(['app/workshop/http.mjs', fs.readFileSync(adapter)]);
  const hash = createHash('sha256');
  for (const [name, bytes] of files.sort((a, b) => a[0].localeCompare(b[0]))) hash.update(name).update('\0').update(bytes).update('\0');
  return hash.digest('hex');
}

// This version is only a derived-cache namespace. It never enters or changes
// fingerprint-v1. A cache/validator/fingerprint implementation change is a miss.
export function reviewCacheImplementationSignature() {
  const seen=new Set(), hash=createHash('sha256');
  function visit(file){
    if(seen.has(file))return;seen.add(file);
    const bytes=fs.readFileSync(file);hash.update(path.relative(fileURLToPath(new URL('../../',import.meta.url)),file).replaceAll('\\','/')).update('\0').update(bytes).update('\0');
    if(!/\.(?:mjs|js)$/.test(file))return;
    for(const match of bytes.toString('utf8').matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g)){
      const next=path.resolve(path.dirname(file),match[1]);if(fs.existsSync(next)&&fs.statSync(next).isFile())visit(next);
    }
  }
  visit(fileURLToPath(import.meta.url));
  for(const relative of ['../../app/workshop/repository.mjs','../../app/workshop/design-assets.mjs','../../app/workshop/font-library.mjs'])visit(fileURLToPath(new URL(relative,import.meta.url)));
  return hash.digest('hex');
}
export function reviewFingerprintCacheScope({tenant,storeIdentity,rendererVersion,implementationVersion}){
  if(!/^[a-z0-9][a-z0-9-]{0,39}$/.test(tenant||'')||![storeIdentity,rendererVersion,implementationVersion].every(v=>/^[a-f0-9]{64}$/.test(v||'')))return null;
  return createHash('sha256').update(JSON.stringify(['private-native-review-cache/v1',tenant,storeIdentity,rendererVersion,implementationVersion])).digest('hex');
}

export function createSlateApprovalTargetSource({pack, imported, workshop, cacheFile=null}) {
  if (workshop) validatedDesignReviewTargets(pack, imported);
  const targets = slateReviewApprovalTargets(pack, imported), byKey = new Map(targets.map(t => [t.key, t]));
  if (byKey.size !== targets.length) throw Error('Duplicate review target');
  const heads = new Map(), records = new Map(), fingerprints = new Map(), rendererVersion = rendererSignature();
  const tenant=workshop?.tenantId??workshop?.repository?.tenantId;
  const storeIdentity=workshop?.repository?.cacheIdentity?.();
  const scope=workshop?.tenantId&&workshop?.repository?.tenantId&&workshop.tenantId!==workshop.repository.tenantId?null:
    reviewFingerprintCacheScope({tenant,storeIdentity,rendererVersion,implementationVersion:reviewCacheImplementationSignature()});
  const persistent=createDesignReviewFingerprintCache({filename:cacheFile,scope});
  const resourceHashes=new Map();
  const remember = record => {
    records.delete(record.id); records.set(record.id, record);
    while (records.size > 2) records.delete(records.keys().next().value);
    return record;
  };
  const headFor = id => {
    if (!heads.has(id)) {
      // Older injected repositories can still perform the full read; only the
      // real tenant-filtered head API enables document-free warm requests.
      const head = typeof workshop.repository.head === 'function' ? workshop.repository.head(id)
        : (({id, revision, status}) => ({id, revision, status}))(remember(workshop.repository.get(id)));
      if (head?.id !== id || !Number.isSafeInteger(head.revision) || head.revision < 1 || !['draft','active','archived'].includes(head.status)) throw Error('Ungültiger Produktkopf.');
      heads.set(id, head);
    }
    return heads.get(id);
  };
  const recordFor = head => {
    const cached = records.get(head.id);
    const record = cached?.revision === head.revision ? remember(cached) : remember(workshop.repository.get(head.id));
    if (record.id !== head.id || record.revision !== head.revision || record.status !== head.status) throw Error('Produktstand wurde während der Prüfung geändert.');
    return record;
  };
  const identity = target => JSON.stringify([target.productId,target.designId,target.id,target.familyId,target.materialKey,target.materialKind,target.mm]);
  // Group cold fingerprint work by document so a two-record cache reads each
  // product once even when the gallery's original order interleaves sizes.
  const targetKeys = [...targets].sort((a,b) => String(a.productId || '').localeCompare(String(b.productId || '')) || a.key.localeCompare(b.key)).map(t => t.key);
  const asset = id => workshop.assets.read(id);
  const resourceUrl = url => {
    const match = url.match(/^\/api\/workshop\/material-surfaces\/([a-f0-9]{64})\.png$/);
    if (match) return workshop.assets.materialSurface(match[1]);
    throw Error('Die Bildquelle ist noch nicht mit der Freigabeprüfung verbunden.');
  };
  const resourceDigest=value=>value instanceof Uint8Array?createHash('sha256').update('bytes\0').update(value).digest('hex'):
    typeof value==='string'?createHash('sha256').update('string\0').update(value).digest('hex'):null;
  const immutableResource=(kind,key)=>kind==='asset'?/^[a-f0-9]{64}$/.test(key):/^\/api\/workshop\/material-surfaces\/[a-f0-9]{64}\.png$/.test(key);
  const resourceValue=(kind,key)=>kind==='asset'?asset(key):resourceUrl(key);
  const resourcesMatch=proofs=>(proofs||[]).every(proof=>{
    if(!immutableResource(proof.kind,proof.key))return false;
    const key=proof.kind+'\0'+proof.key;
    if(!resourceHashes.has(key))resourceHashes.set(key,resourceDigest(resourceValue(proof.kind,proof.key)));
    return resourceHashes.get(key)===proof.sha256;
  });
  return {
    targets,
    beginRead() { heads.clear(); resourceHashes.clear(); },
    flushCache:()=>persistent.flush(),
    cacheStatus:()=>persistent.status(),
    listTargets: () => [...targetKeys],
    describeTarget: key => byKey.has(key) ? {...byKey.get(key)} : null,
    resolveTarget(key) {
      const target = byKey.get(key);
      if (!target) return null;
      const metadata = {...target};
      if (!workshop || !target.productId) return {available: false, fingerprint: null, metadata};
      try {
        const head = headFor(target.productId), targetIdentity = identity(target);
        if (head.status === 'archived') throw Error('Archivierte Vorlage.');
        metadata.productRevision = head.revision;
        const diskKey=createHash('sha256').update(JSON.stringify([head.id,head.revision,targetIdentity])).digest('hex');
        let cached = fingerprints.get(key);
        if (cached?.revision !== head.revision || cached?.targetIdentity !== targetIdentity) cached = null;
        if(!cached){const saved=persistent.get(diskKey);if(saved)cached={...saved,revision:head.revision,targetIdentity};}
        if(cached&&!resourcesMatch(cached.resources)){cached=null;fingerprints.delete(key);}
        if (cached) {
          fingerprints.set(key,cached);
          metadata.previewUrl = '/api/workshop/products/' + encodeURIComponent(head.id) + '/preview.svg?' + new URLSearchParams({designId: target.designId, revision: String(head.revision), reviewFingerprint:cached.fingerprint});
          return {available:true, fingerprint:cached.fingerprint, metadata};
        }
        const record = recordFor(head), profile = record.document.config?.profile;
        if (record.status === 'archived' || record.document.config.reviewOnly !== true || !designReviewMaterialMatches(profile?.material, {key:target.materialKey,kind:target.materialKind}) ||
            !target.mm || Math.abs(profile.geometry.width - target.mm[0]) > 1e-6 || Math.abs(profile.geometry.height - target.mm[1]) > 1e-6)
          throw Error('Vorlage oder Format ist nicht mehr mit diesem Prüfstand verbunden.');
        metadata.productRevision = record.revision;
        // Native revisions and SHA-addressed assets are immutable. Reuse their
        // proven fingerprint; a save gets a new revision and is hashed again.
        const design = profile.designs.find(d => d.id === target.designId);
        if (!design || target.materialKey !== 'slate' && design.katalog?.designId !== target.id || target.familyId && design.katalog?.target?.familyId !== target.familyId) throw Error('Native source identity or family changed');
        const localFonts = design?.objects.filter(o => o.type === 'text').every(o => Object.hasOwn(record.document.config.localResources.fonts, o.font));
        const resourceInputs=new Map();let immutableResources=true;
        const resolveResource=(kind,key)=>{
          const value=resourceValue(kind,key),sha256=resourceDigest(value);
          if(!sha256||!immutableResource(kind,key))immutableResources=false;
          else{resourceInputs.set(kind+'\0'+key,{kind,key,sha256});resourceHashes.set(kind+'\0'+key,sha256);}
          return value;
        };
        cached = {revision:record.revision, targetIdentity, fingerprint:nativeDesignReviewFingerprint({document: record.document, designId: target.designId, rendererVersion,
          resourceResolvers: {asset:id=>resolveResource('asset',id), url:url=>resolveResource('url',url), font: id => workshop.fonts.resources()[id]}}),resources:[...resourceInputs.values()]};
        if (localFonts&&immutableResources) {
          fingerprints.set(key,cached);
          persistent.put(diskKey,{fingerprint:cached.fingerprint,resources:cached.resources});
        }
        const fingerprint = cached.fingerprint;
        metadata.previewUrl = '/api/workshop/products/' + encodeURIComponent(record.id) + '/preview.svg?' + new URLSearchParams({designId: target.designId, revision: String(record.revision), reviewFingerprint:fingerprint});
        return {available: true, fingerprint, metadata};
      } catch (error) {
        metadata.reason = error.status && error.status < 500 ? error.message : 'Vorlage oder benötigte Ressource kann noch nicht vollständig geprüft werden.';
        return {available: false, fingerprint: null, metadata};
      }
    },
  };
}
