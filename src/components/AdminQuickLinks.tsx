import Link from 'next/link'

export default function AdminQuickLinks(){
 return <section aria-labelledby="special-orders-title" style={{padding:'24px',marginBottom:'28px',border:'1px solid var(--theme-elevation-150)',borderRadius:'8px',background:'var(--theme-elevation-50)'}}>
  <h2 id="special-orders-title" style={{margin:'0 0 8px'}}>Sonderanfertigung für Kunden</h2>
  <p style={{margin:'0 0 20px',maxWidth:'70ch'}}>Produkt und Gestaltung vorbereiten, einen persönlichen Kundenlink erstellen und die Rückmeldung unter Projektanfragen weiterbearbeiten.</p>
  <div style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:'16px'}}>
   <Link href="/gestalten?vorbereiten=1" style={{display:'inline-flex',alignItems:'center',minHeight:'44px',padding:'10px 18px',background:'#245e4f',color:'#fff',borderRadius:'6px',fontWeight:600,textDecoration:'none'}}>Sonderanfertigung vorbereiten →</Link>
   <Link href="/materialverwaltung">Material &amp; Vorlagen</Link>
   <Link href="/admin/collections/enquiries">Projektanfragen öffnen</Link>
  </div>
 </section>
}
