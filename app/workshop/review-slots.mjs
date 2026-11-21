// #265 (ENTSCHEIDUNGEN 3.56): Seit die Gestaltung schon beim Öffnen der Übersicht gesichert wird, gibt es mehr Sicherungen.
// Der Server lässt weiter nur `max` davon gleichzeitig zu (so viele Plätze hat auch die Bildprüfung, photo-import.py). Sind alle
// belegt, wartet eine weitere Sicherung kurz in der Reihe auf den nächsten frei werdenden Platz, statt sofort abgelehnt zu
// werden; ihr Anfragekörper bleibt solange ungelesen. Nach `waitMs` oder bei voller Reihe gilt der bisherige Fehler.
// Ein frei werdender Platz geht direkt an die älteste wartende Sicherung, nie an eine später gekommene.
export function createReviewSlots({max,waitMs=0,queue=0,busy}){
 if(!Number.isSafeInteger(max)||max<1||!Number.isFinite(waitMs)||waitMs<0||!Number.isSafeInteger(queue)||queue<0||typeof busy!=='function')throw new RangeError('Sicherungsplätze: ungültige Grenzen.');
 const active=new Set(),waiting=[];
 const take=()=>{const job=Symbol('review');active.add(job);return job;};
 return Object.freeze({
  // Liefert den Platz sofort oder ein Versprechen darauf; wirft bzw. lehnt mit `busy()` ab.
  acquire(){
   if(active.size<max&&!waiting.length)return take();
   if(waitMs<=0||waiting.length>=queue)throw busy();
   return new Promise((resolve,reject)=>{
    const waiter={resolve,timer:setTimeout(()=>{const at=waiting.indexOf(waiter);if(at>=0)waiting.splice(at,1);reject(busy());},waitMs)};
    waiter.timer.unref?.();waiting.push(waiter);
   });
  },
  release(job){
   if(!active.delete(job))return;
   const next=waiting.shift();if(next){clearTimeout(next.timer);next.resolve(take());}
  },
  get active(){return active.size;},get waiting(){return waiting.length;},
 });
}
