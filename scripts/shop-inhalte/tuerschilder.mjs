// Catalogue-derived drafts for the SAME shop-schnitt-plan pipeline. Publication
// still requires the content/image review; no promises about delivery or lifetime.
const slug=s=>String(s).toLowerCase().replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function texts({line,sub,family,size,design}){
 const material=family.material.kind==='steel'?'Edelstahl':'Acrylglas',form=family.groups.find(g=>g.key===size.groupKey).name;
 const dimensions=(size.widthMm/10).toLocaleString('de-DE')+' × '+(size.heightMm/10).toLocaleString('de-DE')+' cm';
 const title=[sub.name,material,form,dimensions,design.name].join(' · ');
 const handle=slug([line.id,size.groupKey,size.widthMm+'x'+size.heightMm,sub.id,design.id].join('-'));
 const descriptionHtml='<p>'+esc(design.name)+' ist die Startgestaltung für dieses '+esc(form)+' aus '+esc(material)+' im Format '+esc(dimensions)+'.</p>\n<p>Personalisiere die Texte für dein '+esc(sub.name)+'. Im Konfigurator siehst du die Gestaltung auf der gewählten Platte und kannst weitere freigegebene Designs auswählen.</p>\n<p>Materialstärke: '+esc(family.material.thicknessMm)+' mm. Befestigungen und deren Aufpreise werden bei der Gestaltung angezeigt.</p>';
 return {handle,productType:'Türschilder',title,descriptionHtml,seoTitle:title.slice(0,70),seoDescription:[design.name,sub.name,material,form,dimensions,'mit eigenen Texten gestalten.'].join(' · ').slice(0,160),tags:['Türschild',material,form,sub.name,dimensions],imageFile:handle+'.webp',imageAlt:title,collections:[line.id,sub.collectionHandle].filter(Boolean)};
}
