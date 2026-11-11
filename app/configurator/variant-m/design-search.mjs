// Search only template metadata from the already authorised product revision.
// Customer canvas text, artwork paths and filenames are deliberately not indexed.
export const DESIGN_SEARCH_LIMIT=80;
export function designSearchQuery(value=''){
 if(typeof value!=='string'||value.length>DESIGN_SEARCH_LIMIT||/[\u0000-\u001f\u007f]/.test(value))throw Object.assign(Error('Bitte einen Suchbegriff mit höchstens 80 Zeichen eingeben.'),{status:422,code:'shop_gallery_query'});
 return value.trim().replace(/\s+/g,' ');
}
export const normaliseDesignSearch=value=>String(value??'').toLocaleLowerCase('de').replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const strings=value=>Array.isArray(value)?value.filter(v=>typeof v==='string'):typeof value==='string'?[value]:[];
const names=value=>[...strings(value?.name),...strings(value?.label),...strings(value?.keywords),...strings(value?.tags)];
export function designOriginRank(design){
 if([0,1,2].includes(design?.herkunftRang))return design.herkunftRang;
 if(design?.katalog?.prio===1)return 1;
 if(design?.katalog?.transferFrom||/^\S+ \(Bestand[,)]/.test(design?.katalog?.source||''))return 0;
 return 1;
}
export function designSearchMetadata(design,config={}){
 const id=design.katalog?.designId||design.id,number=design.designNo??design.katalog?.designNo??String(id).match(/(?:^|[-_])D(\d+)(?:$|[-_])/i)?.[1];
 const definitions=Array.isArray(config.themes)?config.themes:config.themes?.themes||[];
 const themes=(design.themes||[]).flatMap(t=>{const key=typeof t==='string'?t:t?.id;return [key,...names(t),...names(definitions.find(d=>d.id===key))];});
 const resources=new Map((config.localResources?.motifs||[]).map(m=>[m.key,m]));
 let unnamedMotifs=0;const motifNames=[];
 for(const object of design.objects||[])if(object.type==='motif'){
  const explicit=[...strings(object.motifName),...strings(object.keywords),...names(resources.get(object.motif))];
  if(explicit.length)motifNames.push(...explicit);else unnamedMotifs++;
 }
 motifNames.push(...strings(design.motifNames));
 const text=[design.name,id,design.id,...themes,...motifNames,...strings(design.keywords),...strings(design.tags)].filter(v=>typeof v==='string').map(normaliseDesignSearch).join(' ');
 return {text,number:number==null?null:String(Number(number)),rank:designOriginRank(design),unnamedMotifs};
}
export function matchesDesignSearch(metadata,query){
 const normal=normaliseDesignSearch(query);if(/^\d+$/.test(normal))return metadata.number===String(Number(normal));
 const parts=normal.split(' ').filter(Boolean);
 return parts.every(part=>/^d\d+$/.test(part)?metadata.number===String(Number(part.slice(1))):metadata.text.includes(part));
}
export function searchDesigns(designs,query,config={}){
 const q=designSearchQuery(query);
 return designs.filter(d=>d.hidden!==true&&d.released!==false&&d.katalog?.fit!=='passt nicht').map(d=>({design:d,metadata:designSearchMetadata(d,config)})).filter(row=>matchesDesignSearch(row.metadata,q)).sort((a,b)=>a.metadata.rank-b.metadata.rank).map(row=>row.design);
}
