// Compatibility state for the shared editor component. Product geometry and
// commerce come from the validated native profile, never the reference doorbell.
export function prepareNativeShellState(el,profile){
  const {width,height}=profile.geometry;
  el.state={...el.state,width,height,holes:false,holeCount:0,mountingKey:'K00',objects:[],designId:null,removedFields:[],personalItems:[]};
  el.cfg.productId=profile.id;el.cfg.productHandle='';el.cfg.orderEnabled=false;el.cfg.variants=[];el.cfg.variant='';
  el.cfg.assignment={...el.cfg.assignment,productId:profile.id,productHandle:'',orderEnabled:false,productionConfirmed:false,variantMap:{}};
  el.catalog.product={...el.catalog.product,id:profile.id,width_mm:width,height_mm:height,variants:[]};
  el.catalog.revision=profile.revision||profile.id;
  // Native commerce installs its own bound submit path after the editor exists.
  el.designCanOrder=()=>false;el.order=async()=>{};
}
