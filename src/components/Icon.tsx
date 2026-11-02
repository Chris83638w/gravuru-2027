// Einheitlicher Linien-Icon-Satz (24 px Raster, 1,6 px Strich). Keine externen Bibliotheken.
const paths: Record<string, string> = {
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  'arrow-up-right': '<path d="M7 17 17 7M8 7h9v9"/>',
  gravur: '<path d="M4 20h7"/><path d="m14.5 4.5 5 5L10 19l-6 1 1-6Z"/><path d="m12.5 6.5 5 5"/>',
  druck: '<path d="M12 3.5c3.6 4.1 5.5 7.2 5.5 9.6a5.5 5.5 0 0 1-11 0c0-2.4 1.9-5.5 5.5-9.6Z"/><path d="M9.2 14a2.9 2.9 0 0 0 2.8 2.6"/>',
  zuschnitt: '<circle cx="6.5" cy="6.5" r="2.5"/><circle cx="6.5" cy="17.5" r="2.5"/><path d="M8.6 8 20 18M8.6 16 20 6"/>',
  sonder: '<path d="m12 3 1.8 4.6L18.5 9l-4.7 1.6L12 15.2l-1.8-4.6L5.5 9l4.7-1.4Z"/><path d="M18.5 15.5 19.3 18l2.2.8-2.2.8-.8 2.4-.8-2.4-2.2-.8 2.2-.8Z"/><path d="M5 16.5v4M3 18.5h4"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>',
  upload: '<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
  ruler: '<rect x="2.5" y="8" width="19" height="8" rx="1.5"/><path d="M6.5 8v3M10 8v4.5M13.5 8v3M17 8v4.5"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5Z"/><path d="m3 13 9 5 9-5"/>',
  chat: '<path d="M4 5h16v11H9l-5 4Z"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  shield: '<path d="M12 3 5 6v5c0 4.6 3 8.3 7 10 4-1.7 7-5.4 7-10V6Z"/><path d="m9 12 2 2 4-4"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
}
export default function Icon({name, size = 24, className}: {name: string; size?: number; className?: string}) {
  return <svg className={className ? 'icon ' + className : 'icon'} viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" dangerouslySetInnerHTML={{__html: paths[name] || paths.arrow}}/>
}
// Ordnet einen internen Link dem passenden Leistungs-Icon zu (für redaktionelle Einstiege).
export function iconForHref(href: string) {
  if (/bearbeitung=sonder/.test(href)) return 'sonder'
  if (/bearbeitung=druck/.test(href)) return 'druck'
  if (/bearbeitung=zuschnitt/.test(href)) return 'zuschnitt'
  if (/konfigurator/.test(href)) return 'gravur'
  if (/kontakt/.test(href)) return 'chat'
  return 'arrow'
}
