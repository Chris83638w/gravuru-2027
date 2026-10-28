// Interface symbols only. Product artwork and mounting geometry stay in the model.
const paths=Object.freeze({
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
