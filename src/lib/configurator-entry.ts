// Only link to combinations supported by the plate configurator.
const entries:Record<string,{label:string;material:'edelstahl'|'acryl';method:'gravur'|'druck'|'zuschnitt'}>={
 'produkte/klingelplatten':{label:'Klingelplatte gestalten',material:'edelstahl',method:'gravur'},
 'produkte/hausnummern':{label:'Hausnummernschild gestalten',material:'edelstahl',method:'gravur'},
 'produkte/firmenschilder':{label:'Schild selbst gestalten',material:'edelstahl',method:'gravur'},
 'leistungen/acrylglas-schneiden':{label:'Acrylplatte nach Maß planen',material:'acryl',method:'zuschnitt'},
 'leistungen/edelstahl-stahl-laserschneiden':{label:'Edelstahlplatte nach Maß planen',material:'edelstahl',method:'zuschnitt'},
 'leistungen/uv-direktdruck':{label:'Acrylschild in Farbe gestalten',material:'acryl',method:'druck'},
 'leistungen/metallgravur':{label:'Edelstahlschild gestalten',material:'edelstahl',method:'gravur'},
 'fuer-wen/haus-garten':{label:'Mein Schild selbst gestalten',material:'edelstahl',method:'gravur'},
}
export function configuratorEntry(section:string,slug:string){
 const entry=entries[section+'/'+slug]
 return entry?{label:entry.label,href:`/konfigurator?material=${entry.material}&bearbeitung=${entry.method}`}:null
}
