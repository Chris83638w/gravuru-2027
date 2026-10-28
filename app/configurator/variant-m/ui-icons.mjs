// Interface symbols only. Product artwork and mounting geometry stay in the model.
const paths=Object.freeze({
 back:'<path d="m12 5-7 7 7 7M5 12h15"/>',
 save:'<path d="M5 3h12l4 4v14H3V3h2ZM7 3v6h10V3M7 21v-8h10v8"/>',
 help:'<circle cx="12" cy="12" r="9"/><path d="M9 8a3 3 0 0 1 6 0c0 2-3 2-3 4M12 16h.01"/>',
 layers:'<path d="m12 3 10 5-10 5L2 8ZM2 12l10 5 10-5M2 16l10 5 10-5"/>',
 sliders:'<path d="M3 7h5m6 0h7M3 17h11m6 0h1"/><circle cx="11" cy="7" r="3"/><circle cx="17" cy="17" r="3"/>',
 chevron:'<path d="m6 9 6 6 6-6"/>',
 left:'<path d="M4 4v16M8 6h12M8 10h8M8 14h12M8 18h8"/>',
 center:'<path d="M12 3v18M4 6h16M7 10h10M4 14h16M7 18h10"/>',
 right:'<path d="M20 4v16M4 6h12M8 10h8M4 14h12M8 18h8"/>'
});
export function uiIcon(name){
 if(!Object.hasOwn(paths,name))throw Error('Unbekanntes Oberflächensymbol: '+name);
 return '<svg class="ux-ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+paths[name]+'</svg>';
}
export const alignmentLabel=mode=>({left:'Links',center:'Mitte',right:'Rechts'})[mode];
export const alignmentContent=mode=>uiIcon(mode)+'<span>'+alignmentLabel(mode)+'</span>';
