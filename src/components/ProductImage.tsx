export function imageData(value:any){return value&&typeof value==='object'&&value.approved&&value.url?value:null}
// KI-Illustrationen bleiben auf jeder Bildgröße sichtbar gekennzeichnet (Vorgabe Issue 135).
export function isIllustration(m:any){return /\bKI\b|KI-/i.test([m?.alt,m?.caption,m?.credit].filter(Boolean).join(' '))}
export default function ProductImage({value,hero=false,compact=false}:{value:any;hero?:boolean;compact?:boolean}){
 const m=imageData(value);if(!m)return null
 const card=m.sizes?.card,large=m.sizes?.hero
 const sizes=compact?'(max-width: 600px) 92vw, (max-width: 1000px) 46vw, 400px':hero?'(max-width: 900px) 92vw, 640px':'(max-width: 800px) 92vw, 760px'
 const set=[card?.url&&`${card.url} ${card.width}w`,large?.url&&large.width!==m.width&&`${large.url} ${large.width}w`,`${m.url} ${m.width}w`].filter(Boolean)
 const ai=isIllustration(m)
 return <figure className={(compact?'product-image compact-image':'product-image')+(hero?' hero-image':'')}>
  <div className="image-frame"><img src={m.url} srcSet={set.join(', ')} sizes={sizes} alt={m.alt||''} width={m.width} height={m.height} loading={hero?'eager':'lazy'} fetchPriority={hero?'high':'auto'} decoding="async"/>{ai&&<span className="ai-badge">KI-Illustration</span>}</div>
  {!compact&&<figcaption>{m.caption||'Produktbeispiel aus dem Gravuru-Sortiment.'}</figcaption>}
 </figure>
}
