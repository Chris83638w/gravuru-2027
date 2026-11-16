// F05 (#239): Anweisungszähler der Preisfunktion (aktiv vorher / live B) und der Kassen-Prüfung.
// Aufruf: node anweisungen.mjs <shopify-cli run.js> <ext-dir aktiv-nachbau> <ext-dir preis B> <ext-dir guard> <ausgabe.json>
// Jede ext-dir ist ein gebautes Funktionsprojekt (dist/function.wasm). Eingaben aus der echten Protokoll-Eingabe 15.11.
import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';import {createHash} from 'node:crypto';
const [cli,aktivDir,preisDir,guardDir,ziel]=process.argv.slice(2);
const real=JSON.parse(fs.readFileSync(new URL('../../master-release/fixtures/shopify-log-20261115-0941.json',import.meta.url),'utf8'));
const fresh=real.cart.lines[0],stale=real.cart.lines[1];
const mk=lines=>({presentmentCurrencyRate:'1.0',cart:{lines}});
const many=(n,mixed)=>mk(Array.from({length:n},(_,i)=>mixed&&i%2?{...structuredClone(stale),id:'gid://shopify/CartLine/s'+i}:{...structuredClone(fresh),id:'gid://shopify/CartLine/f'+i}));
const faelle={echt_3:real,gueltig_1:mk([fresh]),gueltig_10:many(10,false),gemischt_10:many(10,true),gueltig_13:many(13,false),gueltig_14:many(14,false),gueltig_15:many(15,false),gueltig_16:many(16,false),gemischt_20:many(20,true)};
const tmp=path.join(fs.mkdtempSync('/tmp/anw-'),'in.json');
function lauf(dir,input,guard){
 const inp=guard?{buyerJourney:{step:'CHECKOUT_COMPLETION'},cart:{lines:input.cart.lines.map(l=>{const c=structuredClone(l);delete c.checkoutImage;c.merchandise.product.title='Türschild';return c;})}}:input;
 fs.writeFileSync(tmp,JSON.stringify(inp));
 const r=spawnSync(process.execPath,[cli,'app','function','run','--path',dir,'--input',tmp,'--json','--no-input'],{encoding:'utf8',timeout:180000,env:{...process.env,SHOPIFY_CLI_NO_ANALYTICS:'1'}});
 const s=r.stdout||'';try{const j=JSON.parse(s.slice(s.indexOf('{'),s.lastIndexOf('}')+1));return {ok:j.success!==false,anweisungen:j.instructions??j.instructionsConsumed??null,ausgabeSha:createHash('sha256').update(JSON.stringify(j.output??null)).digest('hex').slice(0,16)};}
 catch{return {ok:false,fehler:(r.stderr||s).slice(0,200)};}
}
const wasm=d=>{const b=fs.readFileSync(path.join(d,'dist/function.wasm'));return {bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')};};
const ergebnis={erstellt:new Date().toISOString(),grenze:11000000,wasm:{aktivNachbau:wasm(aktivDir),preisB:wasm(preisDir),guard:wasm(guardDir)},faelle:{}};
for(const [k,c] of Object.entries(faelle)){const a=lauf(aktivDir,c,false),n=lauf(preisDir,c,false),g=lauf(guardDir,c,true);ergebnis.faelle[k]={zeilen:c.cart.lines.length,aktivNachbau:a,preisB:n,guard:g,gleicheAusgabeAktivB:a.ok&&n.ok?a.ausgabeSha===n.ausgabeSha:null};console.error(k,a.anweisungen,n.anweisungen,g.anweisungen);}
fs.writeFileSync(ziel,JSON.stringify(ergebnis,null,1)+'\n');
