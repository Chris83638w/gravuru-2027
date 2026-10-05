import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {materialPreview,STEEL_SURFACE} from './material-preview.mjs';
import {formDesignOverlay} from './form-designs.mjs';
let steelData;
function steelImage(){
 if(!steelData){
  const bytes=readFileSync(new URL('../designs/aosu-labrador/runtime/images/gravuru-edelstahl-feine-maserung-vorschau.png',import.meta.url));
  if(createHash('sha256').update(bytes).digest('hex')!==STEEL_SURFACE.sha256)throw Error('Die zugeordnete Materialvorschau wurde verändert.');
  steelData='data:image/png;base64,'+bytes.toString('base64');
 }
 return steelData;
}
// Card images cannot load external SVG subresources. Embed only the known
// material and immutable, sanitized design preview. Never customer draft media.
export function formProductPreview(document,{assets,fonts,contours}){
 const surface=materialPreview(document);
 const base=surface.svg?surface.svg.replace(STEEL_SURFACE.url+'?v='+STEEL_SURFACE.sha256.slice(0,12),steelImage()):contours.preview(document.form.contourId).toString();
 const overlay=formDesignOverlay(document,fonts,document.defaultDesignId,{sourceHref:id=>'data:image/svg+xml;base64,'+assets.read(id).toString('base64')});
 return base.replace('</svg>',overlay+'</svg>');
}
