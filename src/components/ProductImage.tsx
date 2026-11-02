export function imageData(value:any){return value&&typeof value==='object'&&value.approved&&value.url?value:null}
export default function ProductImage({value,hero=false,compact=false}:{value:any;hero?:boolean;compact?:boolean}){
 const m=imageData(value);if(!m)return null
 const card=m.sizes?.card,large=m.sizes?.hero
 const sizes=compact?'(max-width: 600px) 90vw, (max-width: 900px) 45vw, 400px':'(max-width: 800px) 90vw, 700px'
 const set=[card?.url&&`${card.url} ${card.width}w`,large?.url&&large.width!==m.width&&`${large.url} ${large.width}w`,`${m.url} ${m.width}w`].filter(Boolean)
 return <figure className={compact?'product-image compact-image':'product-image'}><img src={m.url} srcSet={set.join(', ')} sizes={sizes} alt={m.alt||''} width={m.width} height={m.height} loading={hero?'eager':'lazy'} fetchPriority={hero?'high':'auto'} decoding="async"/>{!compact&&<figcaption>{m.caption||'Produktbeispiel aus dem Gravuru-Sortiment.'}</figcaption>}</figure>
}

