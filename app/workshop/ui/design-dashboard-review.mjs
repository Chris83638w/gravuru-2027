// Session review rules shared by the dashboard and its UI regression tests.
export const designKey=row=>JSON.stringify([row.lieferform2?.reihe??row.reihe??'',row.id]);

export function releaseIssue(row,seen){
 if(!row.lieferform2)return 'Keine Lieferform 2 vorhanden.';
 if(row.released)return 'Bereits freigegeben.';
 const missing=(row.fonts??[]).filter(f=>f.status==='fehlt').map(f=>f.name);
 if(missing.length)return 'Schrift fehlt: '+missing.join(', ')+'.';
 if(!seen.has(designKey(row)))return 'Zuerst die Vorschau in dieser Sitzung öffnen und prüfen.';
 return null;
}

export function eligibleReleaseRows(rows,seen){
 const keys=new Set();
 return rows.filter(row=>{const key=designKey(row);if(keys.has(key)||releaseIssue(row,seen))return false;keys.add(key);return true;});
}

export function retainVisibleSelection(selection,rows,seen){
 return new Set(eligibleReleaseRows(rows,seen).map(designKey).filter(key=>selection.has(key)));
}

// The caller supplies the confirmed, eligible rows. Each design receives the same
// existing PATCH; a failure does not repeat earlier successes or stop later rows.
export async function releaseDesigns(rows,{patch,onSuccess=()=>{}}){
 const succeeded=[],failed=[],keys=new Set();
 for(const row of rows){
  const key=designKey(row);if(keys.has(key))continue;keys.add(key);
  let result;
  try{result=await patch(row);}catch(error){failed.push({key,row,error});continue;}
  succeeded.push({key,row,result});onSuccess(row,result);
 }
 return {succeeded,failed};
}
