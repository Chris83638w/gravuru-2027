// A filter/format change invalidates the old request, even while it is loading.
// Page advancement happens only after a successful response, so retry cannot skip designs.
export function createGalleryPager(fetchPage){
 let generation=0,next=0,loading=false;
 return {
  reset(){generation++;next=0;loading=false;},
  get next(){return next;},get loading(){return loading;},
  async load(...args){
   if(loading||next===null)return null;
   const run=generation,page=next;loading=true;
   try{
    const result=await fetchPage(page,...args);
    if(run!==generation)return null;
    if(result.status!=='preparing')next=result.nextPage;
    return result;
   }catch(error){if(run===generation)throw error;return null;}
   finally{if(run===generation)loading=false;}
  }
 };
}
