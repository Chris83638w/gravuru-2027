import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {withProxy,activeTag,ADDED,PROXY} from './stage-shop-entry.mjs';

test('App-Proxy wird genau einmal angehängt und passt zum Server-Einstieg',()=>{
 const text=withProxy('client_id = "x"\n[access.admin]\ndirect_api_mode = "online"\n');
 assert.match(text,/\n\[app_proxy\]\nurl = "https:\/\/app-2027\.gravuru-designwerkstatt\.de\/apps\/konfigurator"\nsubpath = "konfigurator"\nprefix = "apps"\n$/);
 assert.throws(()=>withProxy(text),/schon eingetragen/);
 assert.ok(PROXY.includes('/apps/konfigurator'));
});

test('Aktive Version wird aus der CLI-Liste gelesen',()=>{
 assert.equal(activeTag([{versionTag:'a',status:'inactive'},{versionTag:'b',status:'ACTIVE'}]),'b');
 assert.equal(activeTag({appVersions:[{versionTag:'c',status:'active'}]}),'c');
 assert.equal(activeTag([]),null);
});

test('Die zusätzlichen Theme-Dateien liegen im Repository',()=>{
 for(const rel of ADDED)assert.ok(fs.statSync(new URL('./theme-block/'+rel,import.meta.url)).size>0,rel);
});
