// Session review rules shared by the dashboard and its UI regression tests.
export const designKey=row=>JSON.stringify([row.lieferform2?.reihe??row.reihe??'',row.id]);

export const releaseKey=row=>row.targetFamily?JSON.stringify([row.lieferform2?.reihe??row.reihe??'',row.id,row.targetFamily]):designKey(row);
export function targetReviewRows(rows){return rows.flatMap(row=>Array.isArray(row.ziele)?row.ziele.map(target=>({...row,targetFamily:target.familie,target,_design:row,released:target.released,freigabe:target.freigabe})): [row]);}
export function releaseIssue(row,seen){
 if(!row.lieferform2)return 'Keine Lieferform 2 vorhanden.';
 if(Array.isArray(row.ziele)&&!row.targetFamily)return 'Ein Familienziel auswählen.';
 if(row.target?.missing)return 'Familie fehlt.';
 if(row.targetFamily&&!['passt','prüfen','passt nicht'].includes(row.target?.fit?.status))return 'Zielvorschau zuerst laden und prüfen.';
 if(row.target?.fit?.status==='prüfen'&&row.target.openedChecksum!==row.target.checksum)return 'Dieses Ziel einzeln öffnen und die Befunde prüfen.';
 if(row.target?.fit?.status==='passt nicht')return 'Ziel passt nicht: '+(row.target.fit.issues??[]).join(' ');
 if(row.released)return 'Bereits freigegeben.';
 const missing=(row.fonts??[]).filter(f=>f.status==='fehlt').map(f=>f.name);
 if(missing.length)return 'Schrift fehlt: '+missing.join(', ')+'.';
 if(!seen.has(releaseKey(row)))return 'Zuerst die Vorschau in dieser Sitzung öffnen und prüfen.';
 return null;
}

export function eligibleReleaseRows(rows,seen){
 const keys=new Set();
 return rows.filter(row=>{const key=releaseKey(row);if(keys.has(key)||releaseIssue(row,seen))return false;keys.add(key);return true;});
}

export function retainVisibleSelection(selection,rows,seen){
 return new Set(eligibleReleaseRows(rows,seen).map(releaseKey).filter(key=>selection.has(key)));
}

// The caller supplies the confirmed, eligible rows. Each design receives the same
// existing PATCH; a failure does not repeat earlier successes or stop later rows.
export async function releaseDesigns(rows,{patch,onSuccess=()=>{},onProgress=()=>{},signal}){
 const succeeded=[],failed=[],cancelled=[],results=[],keys=new Set();
 const unique=rows.filter(row=>{const key=releaseKey(row);if(keys.has(key))return false;keys.add(key);return true;});
 const progress=active=>onProgress({total:unique.length,completed:succeeded.length+failed.length,rejected:failed.length,active,results:[...results]});
 progress(null);
 for(let index=0;index<unique.length;index++){
  if(signal?.aborted){for(const row of unique.slice(index)){const item={key:releaseKey(row),row,status:'cancelled'};cancelled.push(item);results.push(item);}break;}
  const row=unique[index],key=releaseKey(row);progress(row);
  let result;
  // Do not abort a PATCH already sent: its server write may have committed.
  // Wait for its result and cancel only requests that have not started.
  try{result=await patch(row);}catch(error){const item={key,row,error,status:'rejected'};failed.push(item);results.push(item);progress(null);continue;}
  const item={key,row,result,status:'ok'};succeeded.push(item);results.push(item);onSuccess(row,result);progress(null);
 }
 progress(null);return {succeeded,failed,cancelled,results};
}

export function bulkReleaseIssue(row,seen){return releaseIssue(row,seen)||(row.targetFamily&&row.target?.fit?.status!=='passt'?'Nur Ziele mit „passt“ sind gemeinsam freigebbar.':null);}
