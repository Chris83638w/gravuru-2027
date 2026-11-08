import {createHash} from 'node:crypto';
import {designReviewTargetKey,designReviewMaterial,validatedDesignReviewTargets} from './design-review-targets.mjs';

const fail=message=>{throw Object.assign(Error(message),{status:409,code:'gallery_registration_conflict'});};
// The immutable delivery remains the baseline. Only the native atomic import
// journal may add targets; arbitrary products or browser mappings are excluded.
export function createGalleryReviewRegistry({pack:basePack,imported:baseImported,repository}){
  let cached=null,signature=null;
  return {
    read(){
      const items=repository?.importItems?.({prefix:'gallery-assignment:'})||[];
      const next=createHash('sha256').update(JSON.stringify(items)).digest('hex');
      if(cached&&signature===next)return cached;
      if(!items.length){signature=next;return cached={pack:basePack,imported:baseImported,signature:next};}
      const pack={...basePack,originals:basePack.originals.map(row=>({...row,targets:[...(row.targets||[])]})),products:[...basePack.products]},imported={...baseImported,products:[...baseImported.products]};
      const originals=new Map(pack.originals.map(row=>[row.id,row])),products=new Set(imported.products.map(p=>p.productId)),keys=new Set(pack.products.map(p=>p.key));
      for(const item of items){
        if(!/^gallery-assignment:[a-f0-9:._-]+$/.test(item.key)||!/^cfg_[a-f0-9-]{36}$/.test(item.id)||!/^[a-f0-9]{64}$/.test(item.fingerprint)||products.has(item.id)||keys.has(item.key)||!Array.isArray(item.registrations)||!item.registrations.length)fail('Die zusätzliche Familienzuordnung ist nicht eindeutig registriert.');
        const ids=[],nativeIds=new Set();
        for(const r of item.registrations){
          const row=originals.get(r.originalId);
          if(!row||r.schema!=='gravuru-gallery-design-assignment/v1'||typeof r.nativeDesignId!=='string'||nativeIds.has(r.nativeDesignId)||!r.familyId||!r.sizeKey||!Array.isArray(r.mm)||r.mm.length!==2||r.mm.some(n=>!Number.isFinite(n)||n<=0))fail('Die zusätzliche Zuordnung passt nicht zum Katalogoriginal.');
          const target={status:'prepared',productKey:item.key,nativeDesignId:r.nativeDesignId,reviewMaterial:r.reviewMaterial,familyId:r.familyId,familyLabel:r.familyLabel||r.familyId,sizeKey:r.sizeKey,mm:r.mm,...(r.visualReviewIssues?.length?{visualReviewIssues:structuredClone(r.visualReviewIssues)}:{})};
          designReviewMaterial(row,target);
          const key=designReviewTargetKey(row,target),existing=row.targets.findIndex(t=>designReviewTargetKey(row,t)===key);
          if(existing>=0&&row.targets[existing].status==='prepared')fail('Ein bereits vorbereitetes Familienziel darf nicht ersetzt werden.');
          if(existing>=0)row.targets[existing]={...target,sourceOpenReason:row.targets[existing].reason||null};else row.targets.push(target);
          ids.push(row.id);nativeIds.add(r.nativeDesignId);
        }
        if(new Set(ids).size!==ids.length)fail('Ein Original wurde mehrfach derselben nativen Gruppe zugeordnet.');
        const product={key:item.key,productId:item.id,revision:1,reviewOnly:true,designIds:ids,registrationSource:'native-import-journal'};
        pack.products.push(product);imported.products.push(product);products.add(item.id);keys.add(item.key);
      }
      validatedDesignReviewTargets(pack,imported);
      signature=next;return cached={pack,imported,signature:next};
    }
  };
}
