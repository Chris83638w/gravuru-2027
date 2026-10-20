// B1: Klarnamen für Kategorie-Kennungen in der Werkstatt (nur Anzeige; gespeicherte Kennungen bleiben).
// Produktfamilien vergeben beim Erzeugen `familie-<familien-id>` und `form-<formgruppe>` (product-families.mjs).
// Quelle der Namen sind ausschließlich die Familien des Mandanten: Familienname und Name der Formgruppe.
// Ohne passende Familie bleibt das Kürzel sichtbar und wird als „ohne Klarnamen“ gekennzeichnet.

const plain=id=>id.replaceAll('-',' ');

/** families: [{id,name,groups:[{key,name}]}] → {[kategorie]: {label, kind, known, hint?}} */
export function categoryLabels(ids,families=[]){
  const byFamily=new Map(families.map(f=>['familie-'+f.id,f.name]));
  const forms=new Map();
  for(const f of families)for(const g of f.groups||[]){const key='form-'+String(g.key).toLowerCase();if(!forms.has(key))forms.set(key,new Set());forms.get(key).add(g.name);}
  const result={};
  for(const id of new Set(ids)){
    if(typeof id!=='string'||!id)continue;
    if(id.startsWith('familie-')){
      const name=byFamily.get(id);
      result[id]=name?{label:name,kind:'family',known:true}:{label:plain(id),kind:'family',known:false,hint:'Kürzel ohne Klarnamen: keine passende Produktfamilie gefunden.'};
    }else if(id.startsWith('form-')){
      const names=forms.get(id);
      result[id]=names?{label:[...names].join(' / '),kind:'form',known:true}:{label:plain(id),kind:'form',known:false,hint:'Kürzel ohne Klarnamen: keine Formgruppe mit diesem Kürzel in deinen Produktfamilien.'};
    }else result[id]={label:plain(id),kind:'category',known:true};
  }
  return result;
}
