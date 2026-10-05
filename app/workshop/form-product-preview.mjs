import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {materialPreview,STEEL_SURFACE,WOOD_LEATHER_ATLAS} from './material-preview.mjs';
import {formDesignOverlay} from './form-designs.mjs';
const materialImages=new Map();
function materialImage(surface){
 const file=surface.sha256===STEEL_SURFACE.sha256?'../designs/aosu-labrador/runtime/images/gravuru-edelstahl-feine-maserung-vorschau.png':surface.sha256===WOOD_LEATHER_ATLAS.sha256?WOOD_LEATHER_ATLAS.file:null;
 if(!file)throw Error('Nicht zugeordnete Materialvorschau.');
 if(!materialImages.has(surface.sha256)){
  const bytes=readFileSync(new URL(file,import.meta.url));
  if(createHash('sha256').update(bytes).digest('hex')!==surface.sha256)throw Error('Die zugeordnete Materialvorschau wurde verändert.');
  materialImages.set(surface.sha256,'data:image/png;base64,'+bytes.toString('base64'));
 }
 return materialImages.get(surface.sha256);
}
// Card images cannot load external SVG subresources. Embed only the known
// material and immutable, sanitized design preview. Never customer draft media.
export function formProductPreview(document,{assets,fonts,contours,photoMarkup}){
 const surface=materialPreview(document);
 const base=surface.svg?surface.svg.replace(surface.surface.url+'?v='+surface.surface.sha256.slice(0,12),materialImage(surface.surface)):contours.preview(document.form.contourId).toString();
 const overlay=formDesignOverlay(document,fonts,document.defaultDesignId,{photoMarkup,sourceHref:id=>'data:image/svg+xml;base64,'+assets.read(id).toString('base64')});
 return base.replace('</svg>',overlay+'</svg>');
}
