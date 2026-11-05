// Astra #161/db4f4a4: one category selector, product-specific bestsellers first.
export const BESTSELLER_CATEGORY='__bestsellers';
export function filterMotifBrowser(available,popular,category=BESTSELLER_CATEGORY,query='',score){
 const needle=String(query).trim().toLocaleLowerCase('de');
 const byKey=new Map(available.map(item=>[item.key,item]));
 const selected=needle ? available : category===BESTSELLER_CATEGORY
  ? [...new Set(popular.map(item=>item.key))].map(key=>byKey.get(key)).filter(Boolean)
  : available.filter(item=>!category||item.category===category);
 const rank=item=>score?score(item,needle):(!needle||(item.name+' '+item.category).toLocaleLowerCase('de').includes(needle)?1:0);
 return selected.map((item,index)=>({item,index,rank:rank(item)})).filter(item=>item.rank>0).sort((a,b)=>b.rank-a.rank||a.index-b.index).map(({item})=>item);
}
