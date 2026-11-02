'use client'
import Link from 'next/link'
import {useEffect,useState} from 'react'
import {usePathname} from 'next/navigation'
import Icon from './Icon'
export default function Header({links,logo}:{links:{label:string;href:string}[];logo?:string}){
 const [open,setOpen]=useState(false);const pathname=usePathname()
 useEffect(()=>{setOpen(false)},[pathname])
 useEffect(()=>{if(!open)return;const key=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false)};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)},[open])
 return <header className={open?'header is-open':'header'}><div className="container header-row">
  <Link href="/" className="brand" aria-label="Gravuru Manufaktur – Startseite"><img src={logo||'/gravuru-logo.svg'} alt="Gravuru" width="137" height="40"/><span>Manufaktur · Bielefeld</span></Link>
  <button className="menu-toggle" aria-expanded={open} aria-controls="main-nav" onClick={()=>setOpen(!open)}><span>{open?'Schließen':'Menü'}</span><Icon name={open?'close':'menu'} size={22}/></button>
  <nav id="main-nav" className={open?'nav open':'nav'} aria-label="Hauptnavigation">
   {links.filter(l=>l.href!=='/konfigurator').map(l=><Link key={l.href} href={l.href} aria-current={pathname.startsWith(l.href)?'page':undefined}>{l.label}</Link>)}
   <Link href="/kontakt" className="nav-contact" aria-current={pathname.startsWith('/kontakt')?'page':undefined}>Kontakt</Link>
   <Link href="/konfigurator" className="button button-mint">Jetzt gestalten <Icon name="arrow" size={18}/></Link>
  </nav>
 </div></header>
}
