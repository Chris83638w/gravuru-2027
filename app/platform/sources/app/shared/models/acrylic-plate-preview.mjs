// Presentation only. The laser output is built from saved objects, never these
// glass layers. Front-view coordinates stay unchanged, including free contours.
export function acrylicPlatePreview(profile,plate,id){
 const m=profile.material;
 if(m.kind!=='acrylic'||m.thicknessMm!==3||m.engravingSide!=='back'||!['schwarz','anthrazit'].includes(m.variant))return null;
 const black=m.variant==='schwarz',colors=black?['#24272a','#101214','#191c1f']:['#555a5f','#363b40','#454a4f'];
 const edge=black?'#090b0d':'#272c30',light=black?'#737b81':'#9da5ab';
 const shape=attrs=>plate+' '+attrs+'/>';
 const defs='<defs><linearGradient id="'+id+'-glass-face" x2=".7" y2="1">'+colors.map((c,i)=>'<stop offset="'+[0,.6,1][i]+'" stop-color="'+c+'"/>').join('')+'</linearGradient><linearGradient id="'+id+'-glass-light" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff" stop-opacity=".11"/><stop offset=".26" stop-color="#fff" stop-opacity=".015"/><stop offset=".275" stop-color="#fff" stop-opacity=".065"/><stop offset=".58" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".025"/></linearGradient><linearGradient id="'+id+'-glass-rim" x2=".6" y2="1"><stop stop-color="'+light+'"/><stop offset=".3" stop-color="'+edge+'"/><stop offset=".7" stop-color="'+light+'"/><stop offset="1" stop-color="'+edge+'"/></linearGradient><filter id="'+id+'-rear-frost" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation=".035"/><feComponentTransfer><feFuncR type="linear" slope=".94"/><feFuncG type="linear" slope=".94"/><feFuncB type="linear" slope=".94"/><feFuncA type="linear" slope=".96"/></feComponentTransfer></filter></defs>';
 // Front-on presentation: the original thin rim and a separate soft scene
 // shadow show one plate. A shifted opaque copy looked like a second sign.
 // This changes no material thickness, source geometry or production path.
 const back=defs+'<g data-role="guide" data-preview-acrylic-glass="'+m.variant+'" pointer-events="none">'+shape('fill="url(#'+id+'-glass-face)" stroke="'+edge+'" stroke-width=".12"')+'</g>';
 const front='<g data-role="guide" data-preview-glass-finish="front" pointer-events="none">'+shape('fill="url(#'+id+'-glass-light)"')+shape('fill="none" stroke="url(#'+id+'-glass-rim)" stroke-width=".22"')+'</g>';
 return {back,front,artwork:content=>'<g data-preview-rear-engraving="true" filter="url(#'+id+'-rear-frost)">'+content+'</g>'};
}
