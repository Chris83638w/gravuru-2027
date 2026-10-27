import {isLayeredDoorbell} from './doorbell-selection.mjs';
import {selectedProfile} from './contract.mjs';
import {acrylicSelection,acrylicOptions} from './acrylic-product.mjs';
import {steelPhysicalGeometry} from './steel-formats.mjs';
export function physicalGeometry(config,state){
 const g=structuredClone(selectedProfile(config,state.mOptions).geometry);
 if(config.steelFormats)return steelPhysicalGeometry({...config,profile:{...config.profile,geometry:g}},state.mOptions);
 if(config.acrylic){const size=acrylicSelection(acrylicOptions(state.mOptions),config.acrylic.pricing).size;g.width=size.width;g.height=size.height;}
 return g;
}
// SVG's default xMidYMid meet, shared with the editor's print viewBox.
export function artworkViewport(config,state){
 const g=physicalGeometry(config,state);
 if(isLayeredDoorbell(config))return {geometry:g,scale:1,x:0,y:0}; // Saved elements already use the selected format's millimetres.
 const b=config.profile.geometry,scale=Math.min(g.width/b.width,g.height/b.height);
 return {geometry:g,scale,x:(g.width-b.width*scale)/2,y:(g.height-b.height*scale)/2};
}
