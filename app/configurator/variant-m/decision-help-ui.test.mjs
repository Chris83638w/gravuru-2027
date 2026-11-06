import test from 'node:test';
import assert from 'node:assert/strict';
import {installDecisionHelp} from './decision-help.mjs';

// Small DOM port for the real installer: headings/nav controls are existing
// objects so we can detect replacements or nested interactive controls.
class Node{
 constructor(tag){this.tagName=tag;this.children=[];this.dataset={};this.attrs={};this.events={};this.classList={add:()=>{}};}
 append(...nodes){for(const n of nodes){if(n.parent)n.parent.children.splice(n.parent.children.indexOf(n),1);n.parent=this;this.children.push(n);}}
 before(n){n.parent=this.parent;this.parent.children.splice(this.parent.children.indexOf(this),0,n);}
 after(n){this.afterNode=n;}
 setAttribute(k,v){this.attrs[k]=v;}
 addEventListener(k,fn){this.events[k]=fn;}
 querySelectorAll(selector){return this.children.filter(n=>selector==='button[data-ux]'&&n.tagName==='button'&&n.dataset.ux);}
 querySelector(selector){return this.children.find(n=>n.tagName===selector)||null;}
 set innerHTML(value){this.markup=value;for(const tag of ['h2','p','button'])this.append(new Node(tag));}
 showModal(){this.open=true;}
 close(){this.open=false;}
}

test('info controls sit beside headings and motif terms without replacing navigation or nesting buttons',t=>{
 const old=globalThis.document;t.after(()=>{globalThis.document=old;});
 globalThis.document={createElement:tag=>new Node(tag),createTextNode:text=>({textContent:text})};
 const text=new Node('h2'),photo=new Node('h2'),options=new Node('h2'),nav=new Node('div'),browser=new Node('h2');
 const best=new Node('button'),all=new Node('button');best.dataset.ux='bestsellers';all.dataset.ux='discover-motifs';let navigated=false;all.addEventListener('click',()=>{navigated=true;});nav.append(best,all);
 const targets=new Map([['#ux-panel-text h2',text],['#ux-panel-upload h2',photo],['#ux-panel-options h2',options],['.completion-motif-nav',nav],['.ux-motif-browser-dialog h2',browser]]),r={querySelector:s=>targets.get(s),append:n=>{r.dialog=n;}};
 const config={profile:{geometry:{width:120,height:80},material:{kind:'steel'}},extraMotifCents:169};
 installDecisionHelp({el:{uxProfileGeometry:()=>({width:150,height:100})},r,config});
 assert.equal(text.children.length,1);assert.match(text.children[0].markup,/<svg[^>]+aria-hidden="true">/);assert.match(text.children[0].markup,/<circle/);assert.equal(text.children[0].attrs['aria-label'],'Information zu Schrift');
 assert.equal(photo.children[0].dataset.uxInfo,'photo');assert.equal(browser.children[0].dataset.uxInfo,'motif');
 assert.equal(nav.children.length,2);assert.equal(nav.children[0].children[0],best);assert.equal(nav.children[1].children[0],all);
 assert.equal(all.children.length,0,'the existing button contains no help button');all.events.click();assert.equal(navigated,true);
 nav.children[1].children[1].events.click();assert.equal(r.dialog.open,true);assert.match(r.dialog.querySelector('p').textContent,/Vorlage ist im Preis enthalten/);
 options.afterNode.children[1].children[1].events.click();assert.match(r.dialog.querySelector('p').textContent,/150 × 100 mm/,'help uses the current selected size');
 r.dialog.querySelector('button').events.click();assert.equal(r.dialog.open,false);
});
