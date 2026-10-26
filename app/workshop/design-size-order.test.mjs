import test from 'node:test';
import assert from 'node:assert/strict';
import {orderedFamilySizes,formGroupLabel} from './design-size-order.mjs';
const size=(key,w,h,groupKey='RE')=>({key,widthMm:w,heightMm:h,groupKey});
const groups=[{key:'RE',name:'Rechteck',shape:'rect',cornerRadiusMm:0},{key:'OV',name:'Oval',shape:'ellipse',cornerRadiusMm:0}];
test('sizes stay in proportional rows, ascending within each row, with compatible sizes first',()=>{
 const family={groups,sizes:[size('a-large',300,200),size('b-small',80,40),size('a-small',90,60),size('b-large',240,120),size('square',60,60),size('oval',90,60,'OV'),size('a-decimal',13.5,9)]},before=structuredClone(family);
 const result=orderedFamilySizes(family,{compatible:new Set(['a-large','a-small','a-decimal','b-small','b-large'])});
 assert.deepEqual(result.map(s=>s.key),['a-decimal','a-small','a-large','b-small','b-large','square','oval']);
 assert.deepEqual(result.slice(0,5).map(s=>s.ratioLabel),['3:2','3:2','3:2','2:1','2:1']);
 assert.equal(result[5].groupName,'Quadrat');assert.equal(result[6].groupName,'Oval');assert.deepEqual(family,before);
});
test('square forms keep their catalog key; round and contour forms are never called square',()=>{
 const squareSize=size('Q',100,100);assert.equal(formGroupLabel(groups[0],[squareSize]),'Quadrat');
 const rounded={...groups[0],name:'Abgerundete Ecken R5',cornerRadiusMm:5};assert.equal(formGroupLabel(rounded,[squareSize]),'Quadrat · Abgerundete Ecken R5');
 assert.equal(formGroupLabel({...groups[1],name:'Rund'},[squareSize]),'Rund');
 assert.equal(formGroupLabel({name:'Herz',shape:'contour'},[squareSize]),'Herz');
 assert.equal(orderedFamilySizes({groups,sizes:[squareSize]})[0].groupKey,'RE');
});
