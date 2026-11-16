// Demo-only translation planning. The caller supplies masks from the existing
// native SVG/ink renderer and the native permissions/boundary validator.
// No font metrics, photo treatment, scale or product geometry is recreated here.

class SearchLimit extends Error {
  constructor(reason) { super(reason); this.reason=reason; }
}
const side = object => object.surfaceId || 'front';
const pairKey = (a,b) => a < b ? a+':'+b : b+':'+a;
const popcount = value => {
  value-=value>>>1&0x55555555;
  value=(value&0x33333333)+(value>>>2&0x33333333);
  return (((value+(value>>>4))&0x0f0f0f0f)*0x01010101)>>>24;
};
const pause = () => new Promise(resolve=>setTimeout(resolve,0));

// Distance-ordered grid traversal. The coarse grid is deterministic, bounded,
// then refined at single-pixel resolution around its first free location.
// This is a nearby translation, not a global continuous packing optimum.
class MinHeap {
  values=[];
  static before(a,b) { return a.distance < b.distance || a.distance === b.distance && (a.y < b.y || a.y === b.y && a.x < b.x); }
  push(value) {
    const values=this.values;let i=values.length;values.push(value);
    while(i){const parent=(i-1)>>1;if(!MinHeap.before(value,values[parent]))break;values[i]=values[parent];i=parent;}values[i]=value;
  }
  pop() {
    const values=this.values,result=values[0],last=values.pop();if(!values.length)return result;
    let i=0;
    while(i*2+1<values.length){let child=i*2+1;if(child+1<values.length&&MinHeap.before(values[child+1],values[child]))child++;
      if(!MinHeap.before(values[child],last))break;values[i]=values[child];i=child;
    }values[i]=last;return result;
  }
}

/**
 * masks: [{id,data:Uint8Array,width?,height?,originX?,originY?}]. Missing local
 * dimensions use the common width/height. Origins are integer raster pixels;
 * the original artwork must not have been clipped before supplying its mask.
 * scaleX/scaleY: raster pixels per native model unit.
 * accepts(candidate): synchronous boolean from the native boundary check.
 * ignorePair(a,b): an already permitted overlap. Both its objects stay fixed.
 * clearancePixels: optional integer gap between contours. A square dilation
 * of one contour gives a conservative raster gap, without adding an outer
 * plate margin. The original undilated ink defines all search bounds.
 * The result contains only absolute x/y moves. Failure never returns a partial
 * plan, and all source objects/masks remain untouched, including after a yield.
 */
export async function planContourPlacement({
  objects, masks, width, height, scaleX, scaleY=scaleX, movableIds,
  canMove, accepts, ignorePair=()=>false,
  clearancePixels=0, minimumOverlapPixels=1, maxCandidates=10000, maxWordChecks=2000000,
  maxMaskPixels=64000000, maxObjects=128, gridStepPixels=Math.max(1,Math.ceil(Math.max(width,height)/160)),
  yieldEvery=128, yieldControl=pause, signal
}={}) {
  const whole=value=>Number.isSafeInteger(value)&&value>0;
  if(!Array.isArray(objects)||!Array.isArray(masks)||!Array.isArray(movableIds)||
      !whole(width)||!whole(height)||!(scaleX>0)||!(scaleY>0)||!Number.isFinite(scaleX)||!Number.isFinite(scaleY)||
      !Number.isSafeInteger(clearancePixels)||clearancePixels<0||
      ![minimumOverlapPixels,maxCandidates,maxWordChecks,maxMaskPixels,maxObjects,gridStepPixels,yieldEvery].every(whole)||
      typeof canMove!=='function'||typeof accepts!=='function'||typeof ignorePair!=='function'||typeof yieldControl!=='function') {
    throw new TypeError('Kontursuche benötigt Masken, Maßstab sowie native Rechte- und Randprüfung.');
  }
  const snapshot=structuredClone(objects),ids=new Set();
  for(const object of snapshot){
    if(!object||typeof object.id!=='string'||!object.id||ids.has(object.id)||!Number.isFinite(object.x)||!Number.isFinite(object.y))throw new TypeError('Ungültige Elementkennung oder Position.');
    ids.add(object.id);
  }
  const requested=[...new Set(movableIds)];
  if(requested.some(id=>!ids.has(id)))throw new TypeError('Zu verschiebendes Element fehlt.');
  const visible=snapshot.filter(object=>!object.uxHidden&&object.role!=='guide');
  const sourceMasks=new Map();
  for(const mask of masks){if(!mask||sourceMasks.has(mask.id))throw new TypeError('Doppelte oder fehlende Maske.');sourceMasks.set(mask.id,mask);}
  const requestedSet=new Set(requested),records=[],byId=new Map(),fixed=new Set(),ignored=new Set();
  let examined=0,wordChecks=0,sourcePixels=0,preparationWork=0;
  const stopped=()=>{if(signal?.aborted)throw new SearchLimit('cancelled');};
  const yieldNow=async()=>{stopped();await yieldControl();stopped();};
  const preparationYield=async amount=>{preparationWork+=amount;if(preparationWork>=65536){preparationWork=0;await yieldNow();}else stopped();};
  const result=(ok,moves=[],unresolvedIds=[],reason=null)=>({ok,moves,unresolvedIds,reason,examined,wordChecks,gridStepPixels});
  try {
    stopped();
    if(visible.length>maxObjects)throw new SearchLimit('object-budget');
    for(const object of visible){
      const source=sourceMasks.get(object.id);
      if(!source)return result(false,[],[object.id],'missing-mask');
      const mw=source.width??width,mh=source.height??height,ox=source.originX??0,oy=source.originY??0;
      if(!whole(mw)||!whole(mh)||!Number.isSafeInteger(ox)||!Number.isSafeInteger(oy)||
          !(source.data instanceof Uint8Array)||source.data.length!==mw*mh)throw new TypeError('Ungültiges Maskenraster.');
      sourcePixels+=source.data.length;
      if(sourcePixels>maxMaskPixels||width>8192||height>8192)throw new SearchLimit('mask-budget');
      let left=mw,right=-1,top=mh,bottom=-1;
      for(let y=0;y<mh;y++){
        for(let x=0;x<mw;x++)if(source.data[y*mw+x]){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=y;}
        await preparationYield(mw);
      }
      if(right<left)return result(false,[],[object.id],'empty-mask');
      const w=right-left+1,h=bottom-top+1,stride=Math.ceil(w/32),bits=new Uint32Array(stride*h);
      for(let y=0;y<h;y++){
        for(let x=0;x<w;x++)if(source.data[(y+top)*mw+x+left])bits[y*stride+(x>>>5)]|=1<<(x&31);
        await preparationYield(w);
      }
      const record={object,index:records.length,bits,stride,w,h,x:ox+left,y:oy+top,dx:0,dy:0};
      if(clearancePixels){
        const radius=clearancePixels,cw=w+2*radius,ch=h+2*radius,cstride=Math.ceil(cw/32);
        // Sliding windows keep dilation linear in mask area, even when the
        // requested gap spans several pixels. No converted image is stored.
        const pixels=cw*ch;
        if(!Number.isSafeInteger(pixels)||pixels>maxMaskPixels-sourcePixels)throw new SearchLimit('mask-budget');
        sourcePixels+=pixels;
        const horizontal=new Uint8Array(cw*h),expanded=new Uint32Array(cstride*ch);
        const ink=(x,y)=>x>=0&&x<w&&(bits[y*stride+(x>>>5)]>>>(x&31)&1);
        for(let y=0;y<h;y++){
          let count=0;
          for(let x=0;x<cw;x++){
            if(ink(x,y))count++;
            if(ink(x-2*radius-1,y))count--;
            horizontal[y*cw+x]=count>0?1:0;
          }
          await preparationYield(cw);
        }
        const counts=new Uint32Array(cw);
        for(let y=0;y<ch;y++){
          const remove=y-2*radius-1;
          for(let x=0;x<cw;x++){
            if(y<h)counts[x]+=horizontal[y*cw+x];
            if(remove>=0&&remove<h)counts[x]-=horizontal[remove*cw+x];
            if(counts[x])expanded[y*cstride+(x>>>5)]|=1<<(x&31);
          }
          await preparationYield(cw);
        }
        record.padded={...record,bits:expanded,stride:cstride,w:cw,h:ch,x:record.x-radius,y:record.y-radius};
      }
      records.push(record);byId.set(object.id,record);
    }
    const wordAt=(record,row,start)=>{
      const index=Math.floor(start/32),shift=start-index*32,base=row*record.stride;
      const low=index>=0&&index<record.stride?record.bits[base+index]:0;
      if(!shift)return low;
      const high=index+1>=0&&index+1<record.stride?record.bits[base+index+1]:0;
      return (low>>>shift)|(high<<(32-shift));
    };
    const intersects=(a,b,dx=a.dx,dy=a.dy,withClearance=true)=>{
      if(side(a.object)!==side(b.object))return false;
      // Expanding only one side uses exactly one gap radius. Original
      // intentional overlaps are detected with withClearance=false below.
      if(withClearance&&a.padded)a=a.padded;
      const ax=a.x+dx,ay=a.y+dy,bx=b.x+b.dx,by=b.y+b.dy;
      const left=Math.max(ax,bx),right=Math.min(ax+a.w,bx+b.w),top=Math.max(ay,by),bottom=Math.min(ay+a.h,by+b.h);
      if(left>=right||top>=bottom)return false;
      let count=0;
      const first=Math.floor((left-ax)/32),last=Math.floor((right-1-ax)/32);
      for(let y=top;y<bottom;y++)for(let word=first;word<=last;word++){
        if(wordChecks>=maxWordChecks)throw new SearchLimit('work-budget');wordChecks++;
        const common=a.bits[(y-ay)*a.stride+word]&wordAt(b,y-by,ax+word*32-bx);
        if(common&&(count+=minimumOverlapPixels===1?1:popcount(common))>=minimumOverlapPixels)return true;
      }
      return false;
    };
    // Keep intentional template compositions intact. They remain blockers for
    // other objects, but are never broken apart to resolve a different overlap.
    for(let a=0;a<records.length;a++)for(let b=a+1;b<records.length;b++){
      const one=records[a],two=records[b];
      if(side(one.object)!==side(two.object)||!ignorePair(one.object,two.object))continue;
      if(intersects(one,two,one.dx,one.dy,false)){ignored.add(pairKey(a,b));fixed.add(one.object.id);fixed.add(two.object.id);}
    }
    const candidate=(record,dx=record.dx,dy=record.dy)=>({...record.object,x:record.object.x+dx/scaleX,y:record.object.y+dy/scaleY});
    const blocked=(record,dx=record.dx,dy=record.dy)=>records.some(other=>other!==record&&
      !ignored.has(pairKey(record.index,other.index))&&intersects(record,other,dx,dy));
    const valid=(record,dx,dy)=>accepts(candidate(record,dx,dy))===true&&!blocked(record,dx,dy);
    const coordinate=(x,y)=>({x,y,distance:(x/scaleX)**2+(y/scaleY)**2});
    const axis=(min,max,step)=>{
      if(max<min)return [];
      const values=[min,max];
      for(let value=Math.ceil(min/step)*step;value<=max;value+=step)values.push(value);
      return [...new Set(values)].sort((a,b)=>a-b);
    };
    async function nearest(record) {
      const minX=-record.x,maxX=width-record.x-record.w,minY=-record.y,maxY=height-record.y-record.h;
      if(maxX<minX||maxY<minY)return null;
      const tested=new Set();
      const probe=async point=>{
        const key=point.x+','+point.y;if(tested.has(key))return false;tested.add(key);
        if(examined>=maxCandidates)throw new SearchLimit('candidate-budget');examined++;
        stopped();if(examined%yieldEvery===0)await yieldNow();
        return valid(record,point.x,point.y);
      };
      // A small exact neighborhood avoids coarse-grid hops for an almost-free
      // outline, while the larger search remains affordable on a phone.
      const local=[];
      for(let y=Math.max(minY,-4);y<=Math.min(maxY,4);y++)for(let x=Math.max(minX,-4);x<=Math.min(maxX,4);x++)local.push(coordinate(x,y));
      local.sort((a,b)=>a.distance-b.distance||a.y-b.y||a.x-b.x);
      for(const point of local)if(await probe(point))return point;
      const xs=axis(minX,maxX,gridStepPixels),ys=axis(minY,maxY,gridStepPixels);
      if(!xs.length||!ys.length)return null;
      const nearestIndex=values=>values.reduce((best,value,i)=>Math.abs(value)<Math.abs(values[best])?i:best,0);
      const queue=new MinHeap(),queued=new Set();
      const enqueue=(i,j)=>{
        if(i<0||j<0||i>=xs.length||j>=ys.length)return;
        const key=i+','+j;if(queued.has(key))return;queued.add(key);queue.push({...coordinate(xs[i],ys[j]),i,j});
      };
      enqueue(nearestIndex(xs),nearestIndex(ys));
      let best=null;
      while(queue.values.length){
        const point=queue.pop();
        if(await probe(point)){best=point;break;}
        enqueue(point.i-1,point.j);enqueue(point.i+1,point.j);enqueue(point.i,point.j-1);enqueue(point.i,point.j+1);
      }
      if(!best)return null;
      const fineMinX=Math.max(minX,best.x-gridStepPixels),fineMaxX=Math.min(maxX,best.x+gridStepPixels);
      const fineMinY=Math.max(minY,best.y-gridStepPixels),fineMaxY=Math.min(maxY,best.y+gridStepPixels);
      const fine=new MinHeap(),fineQueued=new Set();
      const enqueueFine=(x,y)=>{
        if(x<fineMinX||x>fineMaxX||y<fineMinY||y>fineMaxY)return;
        const key=x+','+y;if(fineQueued.has(key))return;fineQueued.add(key);
        const point=coordinate(x,y);if(MinHeap.before(point,best))fine.push(point);
      };
      enqueueFine(Math.max(fineMinX,Math.min(fineMaxX,0)),Math.max(fineMinY,Math.min(fineMaxY,0)));
      while(fine.values.length){
        const point=fine.pop();if(await probe(point))return point;
        enqueueFine(point.x-1,point.y);enqueueFine(point.x+1,point.y);enqueueFine(point.x,point.y-1);enqueueFine(point.x,point.y+1);
      }
      return best;
    }
    for(const id of requested){
      const record=byId.get(id);if(!record||valid(record,record.dx,record.dy))continue;
      if(fixed.has(id)||canMove(record.object)!==true)continue;
      const point=await nearest(record);if(point){record.dx=point.x;record.dy=point.y;}
    }
    const unresolved=new Set();
    for(const record of records)if(requestedSet.has(record.object.id)&&accepts(candidate(record))!==true)unresolved.add(record.object.id);
    for(let a=0;a<records.length;a++)for(let b=a+1;b<records.length;b++){
      const one=records[a],two=records[b];
      if((requestedSet.has(one.object.id)||requestedSet.has(two.object.id))&&!ignored.has(pairKey(a,b))&&intersects(one,two)){
        unresolved.add(one.object.id);unresolved.add(two.object.id);
      }
    }
    stopped();
    if(unresolved.size)return result(false,[],[...unresolved],'no-placement');
    const moves=requested.flatMap(id=>{const record=byId.get(id);if(!record||!record.dx&&!record.dy)return [];const point=candidate(record);return [{id,x:point.x,y:point.y}];});
    return result(true,moves);
  } catch(error) {
    if(error instanceof SearchLimit)return result(false,[],requested,error.reason);
    throw error;
  }
}
