import {createHash} from 'node:crypto';
import {createConfiguratorModuleProfiles} from './configurator-module-profiles.mjs';
import {createProductGroupTemplates} from './product-group-templates.mjs';

const fail=(status,code,message)=>{throw Object.assign(Error(message),{status,code});};
const fingerprint=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');

// This adapter reuses saved native products. Its source IDs identify exact
// records, not new catalogue families or invented physical sizes. A catalogue
// host can provide its existing scope/target/offering registry instead.
export function nativeModuleSources(repository){
  const rows=()=>repository.moduleSources();
  return {
    scopes:()=>rows().map(r=>({lineId:'native-products',subcategoryId:r.id,label:r.name,sourceKeys:[r.id]})),
    targets:()=>rows().map(r=>({key:r.id,productId:r.id,familyId:r.id,sizeKey:r.id})),
    offeringFor(scope){
      const row=scope?.lineId==='native-products'&&rows().find(r=>r.id===scope.subcategoryId);
      return row?{familyIds:[row.id],fingerprint:fingerprint([row.id,row.revision])}:null;
    }
  };
}

/** Called ONLY after the existing merchant/session and CSRF guards. No Shopify
 * transport is supplied here: confirmed creation produces local drafts. */
export function createConfiguratorModuleManagement({filename,repository,tenantId,sourceRegistry=nativeModuleSources(repository)}){
  const profiles=createConfiguratorModuleProfiles({filename,tenantId});
  let groups;
  try{groups=createProductGroupTemplates({filename,repository,tenantId,moduleProfiles:profiles,targets:sourceRegistry.targets,offeringFor:sourceRegistry.offeringFor});}
  catch(error){profiles.close();throw error;}
  function dispatch(input,{actor='werkstatt'}={}){
    const action=input?.action;
    const fields={
      'profile-create':['document'],'profile-save':['id','expectedRevision','document'],
      'template-draft':['name','scope','sourceKeys'],'template-create':['document'],
      'template-save':['id','expectedRevision','document'],
      plan:['templateId','templateRevision','creationKey','products'],
      confirm:['planId','planHash','accepted'],execute:['planId','planHash','confirmationId']
    }[action];
    if(!fields||Object.keys(input).length!==fields.length+1||fields.some(k=>!Object.hasOwn(input,k)))fail(422,'module_action','Die Verwaltungsaktion ist unvollständig oder enthält unbekannte Felder.');
    const {action:_action,...data}=input;
    switch(action){
      case 'profile-create':return profiles.create(data.document,{actor});
      case 'profile-save':return profiles.save(data.id,data.document,data.expectedRevision,{actor});
      case 'template-draft':return groups.draft(data);
      case 'template-create':return groups.create(data.document,{actor});
      case 'template-save':return groups.save(data.id,data.document,data.expectedRevision,{actor});
      case 'plan':return groups.plan(data);
      case 'confirm':return groups.confirm(data,{actor});
      case 'execute':return groups.execute(data);
    }
  }
  return {profiles,groups,dispatch,
    overview:()=>({profiles:profiles.list(),sources:groups.sources(),templates:groups.list(),scopes:sourceRegistry.scopes(),localOnly:true,shopifyWrites:0}),
    close(){groups.close();profiles.close();}
  };
}
