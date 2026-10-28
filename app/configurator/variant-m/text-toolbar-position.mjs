// Viewport pixels only: this never changes a design coordinate or a saved size.
export function textToolbarPosition({stage,plate,selection,width,height,placement='plate',zoomed=false}){
 const edge=8,center=selection?selection.left+selection.width/2:plate.left+plate.width/2;
 const left=Math.max(edge,Math.min(Math.max(edge,stage.width-width-edge),center-stage.left-width/2));
 const top=placement==='selection'&&selection
  ? selection.top-stage.top-19-6-height
  : zoomed?edge:plate.top-stage.top-height-8;
 return {left,top:Math.max(edge,Math.min(Math.max(edge,stage.height-height-edge),top))};
}
