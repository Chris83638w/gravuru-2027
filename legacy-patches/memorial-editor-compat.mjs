import {completeFontGlyphs} from '../app/workshop/complete-font-glyphs.mjs';
function once(source, before, after) {
 if(source.split(before).length!==2)throw Error('Unbekannter Vorschau-Stand: '+before.slice(0,80));
 return source.replace(before,after);
}
export function patchMemorialUX(source) {
 source=once(source,'editorTextSize(value):textSizeMm(value)','editorTextSize(value):textSizeMm(Math.round(value))');
 source=once(source,'Math.round(o.size*10)/10','Math.round(o.size)');
 source=once(source,"e.target.value=selected().size;","e.target.value=config?.workbench?.embedded?roundEdit(selected().size):Math.round(selected().size);");
 source=once(source,"(selected()?.size||4)+(action==='bigger'?1:-1)","Math.round(selected()?.size||4)+(action==='bigger'?1:-1)");
 source=once(source,'Math.round((o[key]||0)*10)/10','key===\'size\'&&!config?.workbench?.embedded?Math.round(o.size):Math.round((o[key]||0)*10)/10');
 return source;
}
export function patchMemorialMeasurement(source) {
 source=once(source,'export function measureText',
  'function previewGlyph(f,c){return f.glyphs[c]||{a:f.units*.6,d:\'M\'+f.units*.05+\' 0V\'+f.units*.7+\'H\'+f.units*.55+\'V0Z M\'+f.units*.1+\' \'+f.units*.05+\'H\'+f.units*.5+\'V\'+f.units*.65+\'H\'+f.units*.1+\'Z\'};}\nexport function measureText');
 source=once(source,"for(const c of o.text.replace(/\\n/g,''))if(!f.glyphs[c])throw Error('Die gewählte Schrift enthält das Zeichen „'+c+'“ nicht.');","const missing=[...o.text.replace(/\\n/g,'')].find(c=>!Object.hasOwn(f.glyphs,c));");
 source=once(source,'s+f.glyphs[c].a','s+previewGlyph(f,c).a');
 source=once(source,'o.h=lines.length*o.size*1.2;return o;',"o.h=lines.length*o.size*1.2;if(missing!==undefined)throw Error('Die gewählte Schrift enthält das Zeichen „'+missing+'“ nicht.');return o;");
 source=once(source,'s+(f.glyphs[c]?.a||0)','s+previewGlyph(f,c).a');
 return once(source,"const g=f.glyphs[c];if(!g)return '';",'const g=previewGlyph(f,c);');
}
export function patchMemorialValidation(source) {
 return once(source,"if(!['x','y','w','h','rotation'].every(k=>Number.isFinite(o[k]))||o.w<=0||o.h<=0||Math.abs(o.rotation)>DESIGN_LIMITS.maxRotation)throw Error('Ungültige Elementmaße oder Drehung.');",
 "const label='Element '+(d.objects.indexOf(o)+1);if(!['x','y'].every(k=>Number.isFinite(o[k])))throw Error(label+': Position ist ungültig.');if(!Number.isFinite(o.w)||!Number.isFinite(o.h)||o.w<=0||o.h<=0)throw Error(label+': Breite und Höhe müssen größer als 0 mm sein.');if(!Number.isFinite(o.rotation)||Math.abs(o.rotation)>DESIGN_LIMITS.maxRotation)throw Error(label+': Drehung muss zwischen −360° und 360° liegen.');");
}
export function patchMemorialCommerce(source) {
 source="import {commerceStatus} from './commerce-status.mjs';\n"+source;
 source=once(source,"let busy=false,message='';","let busy=false,message='';const failure=commerceStatus();const designFingerprint=()=>JSON.stringify({design:designFromState(config,el.state),options:el.state.mOptions});");
 source=once(source,"status.textContent=message;","const text=busy?message:failure.message(designFingerprint());status.textContent=text;");
 source=once(source,"message?'block':'none'","text?'block':'none'");
 source=once(source,"const fail=error=>{busy=false;message=error.message||'Übertragung fehlgeschlagen. Deine Gestaltung bleibt geöffnet.';update();};","const fail=error=>{busy=false;failure.fail(error.message||'Übertragung fehlgeschlagen. Deine Gestaltung bleibt geöffnet.',designFingerprint());message='';update();};");
 return once(source,'event.preventDefault();event.stopImmediatePropagation();if(busy)return;',"event.preventDefault();event.stopImmediatePropagation();if(busy)return;failure.clear();message='';update();");
}
export function completeMemorialModels(models, imported) {
 if(imported.name!=='Poppins ExtraLight')throw Error('Die Originalschrift Poppins ExtraLight wird benötigt.');
 const result=structuredClone(models);let added=0,faces=0;
 for(const model of result){
  const fonts=model.universal?.localResources?.fonts||{};
  for(const id of Object.keys(fonts).filter(id=>/^PDF-Poppins-ExtraLight-[a-f0-9]+$/.test(id))){
   const completed=completeFontGlyphs(fonts[id],imported.font);fonts[id]=completed.font;added+=completed.added;faces++;
  }
 }
 if(!faces)throw Error('Keine passende Originalschrift im Vorschaupaket.');
 return {models:result,faces,added};
}
