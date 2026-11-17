// F02 (#239): Kassen-Nachweis für personalisierte Warenkorbpositionen.
// Der Server berechnet beim Erstellen der Warenkorbposition einen Nachweis über alle Angaben, nach denen die
// Preisfunktion den Aufpreis berechnet (Angebot, gesicherter Entwurf, Variante, Preisstand, Motiv-, Foto-
// und Logozähler). Die Kassen-Prüfung rechnet ihn mit demselben geheimen Schlüssel nach und sperrt die
// Kasse, wenn eine dieser Angaben im Browser verändert, entfernt oder von einer anderen Position kopiert
// wurde. Der Schlüssel liegt nur auf dem Server und im App-eigenen Metafeld der Prüfregel – nie im Browser,
// in Git oder in einem Issue.
//
// Gleicher Quelltext in Server und Shopify Function (Javy/QuickJS, Anweisungsbudget): nur 32-Bit-Arithmetik,
// kein BigInt, keine Node-Module. Nachweis = SipHash-2-4 (64 Bit) über sechs 32-Bit-Wörter.
export const PROOF_ATTRIBUTE='_gravuru_proof';
const OFFER=/^[a-f0-9]{64}$/,DESIGN=/^gravuru:proof_[a-zA-Z0-9_-]{1,100}:[a-f0-9]{64}$/,KEY=/^[a-f0-9]{32}$/,TAG=/^[a-f0-9]{16}$/;
const VARIANT=/^gid:\/\/shopify\/ProductVariant\/([1-9][0-9]{0,15})$/,REVISION=/^[1-9][0-9]{0,7}$/,COUNT=/^(0|[1-9][0-9]{0,2})$/;
const word=(hex,at)=>parseInt(hex.slice(at,at+8),16)|0;

export function proofKey(hex){
 if(typeof hex!=='string'||!KEY.test(hex))return null;
 return [word(hex,0),word(hex,8),word(hex,16),word(hex,24)];
}

// Die sechs Wörter entstehen ausschließlich aus den Werten, die auch die Kassen-Funktion liest.
// Ungültige oder fehlende Angaben ergeben null (= kein gültiger Nachweis möglich).
export function proofWords({offer,designFile,variantId,revision,motifs,uploads,logos}){
 if(typeof offer!=='string'||!OFFER.test(offer)||typeof designFile!=='string'||!DESIGN.test(designFile))return null;
 const v=VARIANT.exec(typeof variantId==='string'?variantId:'');
 if(!v||typeof revision!=='string'||!REVISION.test(revision))return null;
 const variant=Number(v[1]);if(!Number.isSafeInteger(variant))return null;
 const m=count(motifs,200),u=count(uploads,4),l=logos==null?0:count(logos,4);
 if(m<0||u<0||l<0||l+u>4)return null;
 const sha=designFile.slice(-64);
 return [word(offer,0),word(offer,8),word(sha,0)^word(sha,8),variant|0,
  (Math.floor(variant/4294967296)&0x1fffff)|m<<21|u<<29,(logos==null?0:1)|l<<1|Number(revision)<<4];
}
function count(value,max){return typeof value==='string'&&COUNT.test(value)&&Number(value)<=max?Number(value):-1;}

export function proofTag(key,words){
 let v0h=key[1]^0x736f6d65,v0l=key[0]^0x70736575,v1h=key[3]^0x646f7261,v1l=key[2]^0x6e646f6d,
     v2h=key[1]^0x6c796765,v2l=key[0]^0x6e657261,v3h=key[3]^0x74656462,v3l=key[2]^0x79746573,lo,a,b,t,ml,mh,i;
 const n=words.length;
 // SipRounds ausgeschrieben (QuickJS: jede Schleifenebene kostet Anweisungen). 2 Runden je Block, 4 am Ende.
 for(i=0;i<=n;i+=2){
  if(i<n){ml=words[i];mh=words[i+1];}else{ml=0;mh=((n*4)&0xff)<<24;}
  v3l^=ml;v3h^=mh;
  lo=(v0l>>>0)+(v1l>>>0);v0h=(v0h+v1h+(lo>4294967295?1:0))|0;v0l=lo|0;a=v1h;b=v1l;v1h=(a<<13|b>>>19)^v0h;v1l=(b<<13|a>>>19)^v0l;t=v0h;v0h=v0l;v0l=t;
  lo=(v2l>>>0)+(v3l>>>0);v2h=(v2h+v3h+(lo>4294967295?1:0))|0;v2l=lo|0;a=v3h;b=v3l;v3h=(a<<16|b>>>16)^v2h;v3l=(b<<16|a>>>16)^v2l;
  lo=(v0l>>>0)+(v3l>>>0);v0h=(v0h+v3h+(lo>4294967295?1:0))|0;v0l=lo|0;a=v3h;b=v3l;v3h=(a<<21|b>>>11)^v0h;v3l=(b<<21|a>>>11)^v0l;
  lo=(v2l>>>0)+(v1l>>>0);v2h=(v2h+v1h+(lo>4294967295?1:0))|0;v2l=lo|0;a=v1h;b=v1l;v1h=(a<<17|b>>>15)^v2h;v1l=(b<<17|a>>>15)^v2l;t=v2h;v2h=v2l;v2l=t;
  lo=(v0l>>>0)+(v1l>>>0);v0h=(v0h+v1h+(lo>4294967295?1:0))|0;v0l=lo|0;a=v1h;b=v1l;v1h=(a<<13|b>>>19)^v0h;v1l=(b<<13|a>>>19)^v0l;t=v0h;v0h=v0l;v0l=t;
  lo=(v2l>>>0)+(v3l>>>0);v2h=(v2h+v3h+(lo>4294967295?1:0))|0;v2l=lo|0;a=v3h;b=v3l;v3h=(a<<16|b>>>16)^v2h;v3l=(b<<16|a>>>16)^v2l;
  lo=(v0l>>>0)+(v3l>>>0);v0h=(v0h+v3h+(lo>4294967295?1:0))|0;v0l=lo|0;a=v3h;b=v3l;v3h=(a<<21|b>>>11)^v0h;v3l=(b<<21|a>>>11)^v0l;
  lo=(v2l>>>0)+(v1l>>>0);v2h=(v2h+v1h+(lo>4294967295?1:0))|0;v2l=lo|0;a=v1h;b=v1l;v1h=(a<<17|b>>>15)^v2h;v1l=(b<<17|a>>>15)^v2l;t=v2h;v2h=v2l;v2l=t;
  v0l^=ml;v0h^=mh;
 }
 v2l^=0xff;
 lo=(v0l>>>0)+(v1l>>>0);v0h=(v0h+v1h+(lo>4294967295?1:0))|0;v0l=lo|0;a=v1h;b=v1l;v1h=(a<<13|b>>>19)^v0h;v1l=(b<<13|a>>>19)^v0l;t=v0h;v0h=v0l;v0l=t;
  lo=(v2l>>>0)+(v3l>>>0);v2h=(v2h+v3h+(lo>4294967295?1:0))|0;v2l=lo|0;a=v3h;b=v3l;v3h=(a<<16|b>>>16)^v2h;v3l=(b<<16|a>>>16)^v2l;
  lo=(v0l>>>0)+(v3l>>>0);v0h=(v0h+v3h+(lo>4294967295?1:0))|0;v0l=lo|0;a=v3h;b=v3l;v3h=(a<<21|b>>>11)^v0h;v3l=(b<<21|a>>>11)^v0l;
  lo=(v2l>>>0)+(v1l>>>0);v2h=(v2h+v1h+(lo>4294967295?1:0))|0;v2l=lo|0;a=v1h;b=v1l;v1h=(a<<17|b>>>15)^v2h;v1l=(b<<17|a>>>15)^v2l;t=v2h;v2h=v2l;v2l=t;
 lo=(v0l>>>0)+(v1l>>>0);v0h=(v0h+v1h+(lo>4294967295?1:0))|0;v0l=lo|0;a=v1h;b=v1l;v1h=(a<<13|b>>>19)^v0h;v1l=(b<<13|a>>>19)^v0l;t=v0h;v0h=v0l;v0l=t;
  lo=(v2l>>>0)+(v3l>>>0);v2h=(v2h+v3h+(lo>4294967295?1:0))|0;v2l=lo|0;a=v3h;b=v3l;v3h=(a<<16|b>>>16)^v2h;v3l=(b<<16|a>>>16)^v2l;
  lo=(v0l>>>0)+(v3l>>>0);v0h=(v0h+v3h+(lo>4294967295?1:0))|0;v0l=lo|0;a=v3h;b=v3l;v3h=(a<<21|b>>>11)^v0h;v3l=(b<<21|a>>>11)^v0l;
  lo=(v2l>>>0)+(v1l>>>0);v2h=(v2h+v1h+(lo>4294967295?1:0))|0;v2l=lo|0;a=v1h;b=v1l;v1h=(a<<17|b>>>15)^v2h;v1l=(b<<17|a>>>15)^v2l;t=v2h;v2h=v2l;v2l=t;
 lo=(v0l>>>0)+(v1l>>>0);v0h=(v0h+v1h+(lo>4294967295?1:0))|0;v0l=lo|0;a=v1h;b=v1l;v1h=(a<<13|b>>>19)^v0h;v1l=(b<<13|a>>>19)^v0l;t=v0h;v0h=v0l;v0l=t;
  lo=(v2l>>>0)+(v3l>>>0);v2h=(v2h+v3h+(lo>4294967295?1:0))|0;v2l=lo|0;a=v3h;b=v3l;v3h=(a<<16|b>>>16)^v2h;v3l=(b<<16|a>>>16)^v2l;
  lo=(v0l>>>0)+(v3l>>>0);v0h=(v0h+v3h+(lo>4294967295?1:0))|0;v0l=lo|0;a=v3h;b=v3l;v3h=(a<<21|b>>>11)^v0h;v3l=(b<<21|a>>>11)^v0l;
  lo=(v2l>>>0)+(v1l>>>0);v2h=(v2h+v1h+(lo>4294967295?1:0))|0;v2l=lo|0;a=v1h;b=v1l;v1h=(a<<17|b>>>15)^v2h;v1l=(b<<17|a>>>15)^v2l;t=v2h;v2h=v2l;v2l=t;
 lo=(v0l>>>0)+(v1l>>>0);v0h=(v0h+v1h+(lo>4294967295?1:0))|0;v0l=lo|0;a=v1h;b=v1l;v1h=(a<<13|b>>>19)^v0h;v1l=(b<<13|a>>>19)^v0l;t=v0h;v0h=v0l;v0l=t;
  lo=(v2l>>>0)+(v3l>>>0);v2h=(v2h+v3h+(lo>4294967295?1:0))|0;v2l=lo|0;a=v3h;b=v3l;v3h=(a<<16|b>>>16)^v2h;v3l=(b<<16|a>>>16)^v2l;
  lo=(v0l>>>0)+(v3l>>>0);v0h=(v0h+v3h+(lo>4294967295?1:0))|0;v0l=lo|0;a=v3h;b=v3l;v3h=(a<<21|b>>>11)^v0h;v3l=(b<<21|a>>>11)^v0l;
  lo=(v2l>>>0)+(v1l>>>0);v2h=(v2h+v1h+(lo>4294967295?1:0))|0;v2l=lo|0;a=v1h;b=v1l;v1h=(a<<17|b>>>15)^v2h;v1l=(b<<17|a>>>15)^v2l;t=v2h;v2h=v2l;v2l=t;
 return hex32((v0l^v1l^v2l^v3l)>>>0)+hex32((v0h^v1h^v2h^v3h)>>>0);
}
const hex32=x=>(x+4294967296).toString(16).slice(1);

// Kassen-Seite: true nur, wenn der Nachweis exakt zu den aktuellen Positionsangaben passt.
export function lineProofValid(key,line){
 const tag=line.proof?.value;
 if(!key||typeof tag!=='string'||!TAG.test(tag))return false;
 const words=proofWords({offer:line.offer?.value,designFile:line.designFile?.value,variantId:line.merchandise?.id,revision:line.revision?.value,
  motifs:line.motifs?.value,uploads:line.uploads?.value,logos:line.logos?.value});
 return words!==null&&proofTag(key,words)===tag;
}
// Positionen mit Aufpreis-Angaben brauchen einen Nachweis. Positionen ohne jede dieser Angaben laufen wie
// bisher über die Preisfunktion (gewöhnliche Artikel; Altangebote mit festem Preis im App-Metafeld).
export const needsProof=line=>line.designFile?.value!=null||line.revision?.value!=null||line.motifs?.value!=null||line.uploads?.value!=null||line.logos?.value!=null;
