import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createReviewCart} from './review-cart.mjs';

test('a new worker reads only its cart and the exact image revision after a restart',t=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'beta-cart-persistence-'));
  let db;
  t.after(()=>{db?.close();fs.rmSync(directory,{recursive:true,force:true});});
  const file=path.join(directory,'scoped.sqlite');
  const open=()=>{
    const db=new DatabaseSync(file);
    return {db,cart:createReviewCart({customerDrafts:{}},new Map(),db)};
  };
  const {db:first}=open();
  const owner='a'.repeat(64),other='b'.repeat(64);
  const cartId=createHash('sha256').update(owner).digest('hex');
  const insert=first.prepare('INSERT INTO beta_cart_lines(cart,id,revision,snapshot,line,png) VALUES(?,?,?,?,?,?)');
  for(const id of ['nord','sued']){
    const line={id,rev:1,totalCents:4999,quantity:1,unitCents:4999};
    insert.run(cartId,id,1,'snapshot-'+id,JSON.stringify(line),Buffer.from(id));
  }
  first.close();
  const next=open();db=next.db;
  const cart=next.cart;
  assert.equal(cart.view(owner).totalCents,9998);
  assert.equal(cart.snapshot(owner,'nord',1),'snapshot-nord');
  assert.equal(cart.preview(owner,'sued',1).toString(),'sued');
  assert.throws(()=>cart.snapshot(other,'sued',1),{status:404});
  assert.throws(()=>cart.preview(owner,'sued',2),{status:404});
  assert.throws(()=>cart.view(''),{status:403});
  assert.equal(cart.view(other).totalCents,0);
  assert.equal(cart.remove(other,'sued',1).items.length,0);
  assert.equal(cart.remove(owner,'nord',1).totalCents,4999);
  assert.equal(cart.remove(owner,'nord',1).totalCents,4999);
  assert.equal(cart.preview(owner,'sued',1).toString(),'sued');
  assert.equal(cart.remove(owner,'sued',1).totalCents,0);
});
