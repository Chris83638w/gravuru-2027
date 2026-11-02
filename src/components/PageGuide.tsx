'use client'
import {useState} from 'react'
import Link from 'next/link'

export default function PageGuide({links,enquiryHref}:{links:{href:string;label:string}[];enquiryHref:string}){
 const [open,setOpen]=useState(false)
 return <aside className="page-guide">
  <p className="eyebrow page-guide-heading">Auf dieser Seite</p>
  <button type="button" className="page-guide-toggle" aria-expanded={open} aria-controls="page-guide-links" onClick={()=>setOpen(!open)}>Auf dieser Seite <span aria-hidden="true">{open?'−':'+'}</span></button>
  <nav id="page-guide-links" className={open?'is-open':''} aria-label="Inhaltsverzeichnis">{links.map(link=><a key={link.href} href={link.href} onClick={()=>setOpen(false)}>{link.label}</a>)}</nav>
  <Link className="text-link" href={enquiryHref}>Vorhaben besprechen <span aria-hidden="true">→</span></Link>
 </aside>
}
