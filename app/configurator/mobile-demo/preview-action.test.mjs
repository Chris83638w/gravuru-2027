// Chris, 20.11.2026, 17:52 Uhr (Handy, Acrylglas-Schild 12 × 8 cm): Nach „Vergrößern“ verrutschte die Vorschau; das Schild
// war links abgeschnitten, „Gestaltung zurücksetzen“ stand rechts daneben. Ursache: Im Vollbild kommt der Knopf in die Bühne
// (design-reset.mjs, Handy-Layout) und stand dort ohne feste Lage als zweites Element in der Zeile des Schilds.
// Am echten Shop nachgestellt (393 px: Schild 32 px links außerhalb; 820 px: 59 px) und mit ersetztem Paket geprüft.
// Dieser Test hält die Regeln fest, die dem Knopf im Vollbild seine Lage geben.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('./preview-action.mjs',import.meta.url),'utf8');
const HOST=':host([data-mobile-demo][data-ux-layout][data-ux-neutral][data-ux-modern])';
// Inhalt eines @media-Blocks (bis zur schließenden Klammer auf gleicher Ebene).
function media(query){
 const start=source.indexOf('@media '+query);assert.notEqual(start,-1,'Block fehlt: '+query);
 let depth=0;for(let i=source.indexOf('{',start);i<source.length;i++){if(source[i]==='{')depth++;else if(source[i]==='}'&&--depth===0)return source.slice(source.indexOf('{',start)+1,i);}
 assert.fail('Block nicht geschlossen: '+query);
}
const rule=(block,selector)=>{const at=block.indexOf(selector+' {');assert.notEqual(at,-1,'Regel fehlt: '+selector);return block.slice(block.indexOf('{',at)+1,block.indexOf('}',at));};

test('Handy: „Gestaltung zurücksetzen“ liegt im Vollbild fest unten links und schiebt das Schild nicht zur Seite',()=>{
 const block=media('(max-width:767px)'),reset=rule(block,HOST+' .c-large-preview .stage .ux-design-reset');
 // Ohne feste Lage ist der Knopf ein zweites Element in der Zeile des Schilds (Bühne: display:flex, Richtung Zeile).
 assert.match(reset,/position:absolute!important/);
 assert.match(reset,/bottom:5px!important/);assert.match(reset,/top:auto!important/);
 assert.match(reset,/left:8px!important/);assert.match(reset,/width:124px!important/);
 assert.match(reset,/padding:0!important/);
 // Der Regler „Ansicht“ lässt genau diesen Platz frei: 8 + 124 + 8 px Abstand + 8 px rechter Rand = 148 px.
 assert.match(rule(block,HOST+' .c-large-preview .stage .ux-view-zoom'),/right:8px!important; width:calc\(100% - 148px\)!important/);
});

test('Tablet hochkant (768 bis 999 px): dieselbe feste Lage; mit Fotogrößen-Regler eine Zeile darüber',()=>{
 const block=media('(min-width:768px) and (max-width:999px)'),reset=rule(block,HOST+' .c-large-preview .stage .ux-design-reset');
 assert.match(reset,/position:absolute!important/);assert.match(reset,/bottom:5px!important/);assert.match(reset,/left:12px!important/);
 const withPhoto=rule(block,HOST.replace('])','][data-ux-photo-sizing="true"])')+' .c-large-preview .stage .ux-design-reset');
 assert.match(withPhoto,/bottom:54px!important/);
});

test('ab 1000 px bleibt der Knopf im Vollbild ausgeblendet (dort steht „Zurücksetzen“ in der Werkzeugleiste)',()=>{
 const compact=fs.readFileSync(new URL('./compact-controls.mjs',import.meta.url),'utf8');
 const at=compact.indexOf('@media(min-width:1000px)');assert.notEqual(at,-1);
 assert.match(compact.slice(at),/\.c-large-preview \.stage>\.ux-design-reset\{display:none!important\}/);
});
