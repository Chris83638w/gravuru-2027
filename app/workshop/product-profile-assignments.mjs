// Optional on older form products: absence keeps their previous unrestricted choices.
export const CHOICE_TYPES=['fonts','motifs','colors','bestsellers'];
export const inheritedProfiles=()=>Object.fromEntries(CHOICE_TYPES.map(type=>[type,{mode:'inherit',profileId:null}]));
export function validateProfileAssignments(value){
 const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
 if(!exact(value,CHOICE_TYPES)||CHOICE_TYPES.some(type=>{const a=value[type];return !exact(a,['mode','profileId'])||!['inherit','empty','override'].includes(a.mode)||(a.mode==='override'?!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(a.profileId||''):a.profileId!==null);}))throw Object.assign(Error('Ungültige Produkt-Profilzuordnung: Vererben, ausdrücklich leer oder Profil-ID verwenden.'),{status:422,code:'invalid_assignment'});
 return value;
}

export function applyBatchProfiles(document,row){
 const text=v=>String(v??'').trim();
 for(const [column,type] of [['font_profile','fonts'],['motif_profile','motifs']]){
  const value=text(row[column]);if(!value)continue;
  document.profileAssignments??=inheritedProfiles();
  document.profileAssignments[type]=['inherit','empty'].includes(value)?{mode:value,profileId:null}:{mode:'override',profileId:value};
 }
 const id=text(row.production_profile_id),revision=text(row.production_profile_revision);
 if(!id&&!revision)return;
 if(id==='empty'&&!revision){document.productionProfile=null;return;}
 if(!/^mfg_[a-f0-9-]+$/.test(id)||!/^[1-9][0-9]*$/.test(revision)||!Number.isSafeInteger(Number(revision)))throw Error('Fertigungsprofil benötigt production_profile_id und eine feste production_profile_revision. Zum Entfernen nur empty in production_profile_id eintragen.');
 document.productionProfile={id,revision:Number(revision)};
}
