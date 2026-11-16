// Interface symbols only. Product artwork and mounting geometry stay in the model.
const paths=Object.freeze({
 lighthouse:'<path d="M9 7h6l3 15H6ZM8 7V3h8v4M9 12h6M8 17h8M2 4h3M19 4h3"/>',
 infinity:'<path d="M12 12c-12-14-12 14 0 0s12 14 0 0Z"/>',
 music:'<path d="M10 18V5l11-2v12M10 8l11-2"/><ellipse cx="6" cy="18" rx="4" ry="3"/><ellipse cx="17" cy="15" rx="4" ry="3"/>',
 candle:'<path d="M8 11h8v11H8ZM12 2c-7 8 7 8 0 0Z"/>',
 arrow:'<path d="M3 12h18m-7-7 7 7-7 7"/>',
 rainbow:'<path d="M2 21v-7a10 10 0 0 1 20 0v7M6 21v-7a6 6 0 0 1 12 0v7M10 21v-7a2 2 0 0 1 4 0v7"/>',
 sun:'<circle cx="12" cy="12" r="5"/><path d="M12 1v3M12 20v3M1 12h3M20 12h3M4 4l2 2M18 18l2 2M4 20l2-2M18 6l2-2"/>',
 butterfly:'<path d="M12 7v14M12 10C1-7-4 21 12 17c-10 11-10-4 0-3 10-1 10 14 0 3 16 4 11-24 0-7ZM9 3l3 4 3-4"/>',
 bow:'<path d="M12 12C-3-6-3 27 12 12 27-6 27 27 12 12ZM10 14l-4 8M14 14l4 8"/>',
 egg:'<path d="M20 15a8 8 0 0 1-16 0C4 0 20-4 20 15ZM5 13l4-3 5 3 5-3"/>',
 ball:'<circle cx="12" cy="12" r="10"/><path d="m12 7 5 4-2 6H9l-2-6ZM12 7V2M17 11l4-2M15 17l3 3M9 17l-3 3M7 11 3 9"/>',
 person:'<circle cx="12" cy="5" r="3"/><path d="M6 22v-6H3l3-6h12l3 6h-3v6M12 16v6"/>',
 flame:'<path d="M12 2C14 9 2 7 5 17c3 9 18 3 13-5-2 4-3-5-6-10Z"/>',
 message:'<path d="M3 3h18v14H9l-6 5ZM7 7h10M7 12h6"/>',
 flourish:'<path d="M2 14c14 0 0-14 0-4 0 5 9 4 10 1 1 3 10 4 10-1 0-10-14 4 0 4M12 11V5"/>',
 sign:'<path d="M3 5h18v14H3ZM7 10h10M7 14h7"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><circle cx="12" cy="7.5" r="1.15" fill="currentColor" stroke="none"/>',
 warning:'<path d="M12 3 2 21h20ZM12 9v5"/><circle cx="12" cy="17.5" r="1.15" fill="currentColor" stroke="none"/>',
 zoom:'<circle cx="10" cy="10" r="6.5"/><path d="m15 15 6 6M7 10h6M10 7v6"/>',
 grid:'<path d="M3 3h7v7H3ZM14 3h7v7h-7ZM3 14h7v7H3ZM14 14h7v7h-7Z"/>',
 star:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z"/>',
 anchor:'<circle cx="12" cy="5" r="2"/><path d="M12 7v14M7 10h10M3 14c0 9 18 9 18 0M3 14v4M21 14v4"/>',
 heart:'<path d="M12 21 4 13C-2 7 6-1 12 6c6-7 14 1 8 7Z"/>',
 house:'<path d="m2 11 10-8 10 8M5 9v12h14V9M10 21v-7h4v7"/>',
 tree:'<path d="m12 2-7 9h4l-6 7h18l-6-7h4ZM12 18v4"/>',
 flower:'<circle cx="12" cy="10" r="2"/><path d="M10 8C3 0 21 0 14 8c10-3 7 10 0 4 4 10-8 10-4 0-7 6-10-7 0-4ZM12 16v6"/>',
 paw:'<ellipse cx="12" cy="17" rx="6" ry="4"/><ellipse cx="4.5" cy="10" rx="2" ry="3"/><ellipse cx="9.5" cy="5.5" rx="2" ry="3"/><ellipse cx="15" cy="5.5" rx="2" ry="3"/><ellipse cx="20" cy="10" rx="2" ry="3"/>',
 baby:'<circle cx="12" cy="13" r="8"/><path d="M12 5c-5-5 5-5 2 0M8 12h.1M16 12h.1M9 16q3 3 6 0"/>',
 cross:'<path d="M10 2h4v6h6v4h-6v10h-4V12H4V8h6Z"/>',
 gift:'<path d="M3 8h18v5H3ZM5 13v8h14v-8M12 8v13M12 8C2 8 5-3 12 8c7-11 10 0 0 0"/>',
 work:'<path d="M3 8h18v13H3ZM8 8V4h8v4M3 12l9 4 9-4"/>',
 feather:'<path d="M4 21 17 8M7 17C-3 8 19-4 21 4c2 9-7 14-14 13ZM10 14h5M13 11h6"/>',
 back:'<path d="m12 5-7 7 7 7M5 12h15"/>',
 save:'<path d="M5 3h12l4 4v14H3V3h2ZM7 3v6h10V3M7 21v-8h10v8"/>',
 help:'<circle cx="12" cy="12" r="9"/><path d="M9 8.5a3 3 0 0 1 6 0c0 2-3 2.5-3 4"/><circle cx="12" cy="16.5" r="1.15" fill="currentColor" stroke="none"/>',
 layers:'<path d="m12 3 10 5-10 5L2 8ZM2 12l10 5 10-5M2 16l10 5 10-5"/>',
 sliders:'<path d="M3 7h5m6 0h7M3 17h11m6 0h1"/><circle cx="11" cy="7" r="3"/><circle cx="17" cy="17" r="3"/>',
 chevron:'<path d="m6 9 6 6 6-6"/>',
 left:'<path d="M4 4v16M8 6h12M8 10h8M8 14h12M8 18h8"/>',
 center:'<path d="M12 3v18M4 6h16M7 10h10M4 14h16M7 18h10"/>',
 right:'<path d="M20 4v16M4 6h12M8 10h8M4 14h12M8 18h8"/>'
});
export function uiIcon(name){
 if(!Object.hasOwn(paths,name))throw Error('Unbekanntes Oberflächensymbol: '+name);
 return '<svg class="ux-ui-icon" data-ui-icon="'+name+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+paths[name]+'</svg>';
}
export const alignmentLabel=mode=>({left:'Links',center:'Mitte',right:'Rechts'})[mode];
export const alignmentContent=mode=>uiIcon(mode)+'<span>'+alignmentLabel(mode)+'</span>';
